import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runStrictOpenSpecValidation } from '../../../src/core/acceptance/openspec-validation.js';
import type { ResolvedOpenSpecRoot } from '../../../src/core/root-selection.js';

const PROPOSAL = `# Change: Add beta behavior

## Why

The beta behavior is required to exercise strict acceptance validation.

## What Changes

- Add a beta requirement and deterministic scenario.

## Impact

- Affected specs: alpha
`;

const CANONICAL_SPEC = `## Purpose
This capability provides stable alpha behavior for acceptance validation.

## Requirements

### Requirement: Alpha SHALL remain stable
The alpha capability SHALL remain stable during beta changes.

#### Scenario: Stable alpha
- **GIVEN** an initialized alpha capability
- **WHEN** alpha behavior is requested
- **THEN** the stable alpha result is returned
`;

const DELTA_SPEC = `## ADDED Requirements

### Requirement: Beta SHALL produce deterministic output
The beta capability SHALL produce deterministic output.

#### Scenario: Deterministic beta
- **GIVEN** a supported beta request
- **WHEN** beta behavior runs
- **THEN** the deterministic beta result is returned
`;

describe('runStrictOpenSpecValidation', () => {
  let rootPath: string;
  let root: ResolvedOpenSpecRoot;

  beforeEach(async () => {
    rootPath = await realpath(await mkdtemp(path.join(os.tmpdir(), 'openspec strict acceptance-')));
    await mkdir(path.join(rootPath, 'openspec', 'changes', 'archive'), { recursive: true });
    await mkdir(path.join(rootPath, 'openspec', 'specs', 'alpha'), { recursive: true });
    await writeFile(path.join(rootPath, 'openspec', 'specs', 'alpha', 'spec.md'), CANONICAL_SPEC);
    root = {
      path: rootPath,
      changesDir: path.join(rootPath, 'openspec', 'changes'),
      specsDir: path.join(rootPath, 'openspec', 'specs'),
      archiveDir: path.join(rootPath, 'openspec', 'changes', 'archive'),
      defaultSchema: 'spec-driven',
      source: 'nearest',
    };
  });

  afterEach(async () => {
    await rm(rootPath, { recursive: true, force: true });
  });

  async function writeChange(name: string, delta = DELTA_SPEC): Promise<void> {
    const changeDir = path.join(root.changesDir, name);
    await mkdir(path.join(changeDir, 'specs', 'alpha'), { recursive: true });
    await writeFile(path.join(changeDir, 'proposal.md'), PROPOSAL);
    await writeFile(path.join(changeDir, 'specs', 'alpha', 'spec.md'), delta);
  }

  it('strictly validates a selected change, affected canonical spec, and in-memory future spec', async () => {
    await writeChange('add-beta');
    const result = await runStrictOpenSpecValidation(root, {
      mode: 'change',
      change: 'add-beta',
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.items.map((entry) => entry.type)).toEqual([
      'change',
      'proposal',
      'spec',
      'future_spec',
    ]);
    expect(result.items.every((entry) => entry.valid)).toBe(true);
    expect(result.items.find((entry) => entry.type === 'future_spec')?.path).toBe(
      path.join(root.specsDir, 'alpha', 'spec.md')
    );
  });

  it('returns a structured missing-change diagnostic', async () => {
    const result = await runStrictOpenSpecValidation(root, {
      mode: 'change',
      change: 'missing-change',
    });
    expect(result.items).toEqual([]);
    expect(result.diagnostics[0]?.code).toBe('acceptance_change_not_found');
  });

  it('project scope validates every active change and every canonical specification', async () => {
    await writeChange('change-a');
    await writeChange('change-b');
    await mkdir(path.join(root.specsDir, 'invalid'), { recursive: true });
    await writeFile(
      path.join(root.specsDir, 'invalid', 'spec.md'),
      '## Requirements\n\n### Requirement: Invalid without scenario\nThe system SHALL fail strict validation.\n'
    );
    await mkdir(path.join(root.specsDir, 'warning'), { recursive: true });
    await writeFile(
      path.join(root.specsDir, 'warning', 'spec.md'),
      '# Warning Spec\n\n## Purpose\nBrief overview\n\n## Requirements\n\n### The system SHALL warn\n\n#### Scenario: Warning only\nGiven a warning\nWhen validation runs\nThen strict mode fails\n'
    );

    const result = await runStrictOpenSpecValidation(root, { mode: 'project' });
    expect(result.items.filter((entry) => entry.type === 'change').map((entry) => entry.id)).toEqual([
      'change-a',
      'change-b',
    ]);
    expect(result.items.filter((entry) => entry.type === 'proposal').map((entry) => entry.id)).toEqual([
      'change-a',
      'change-b',
    ]);
    expect(result.items.filter((entry) => entry.type === 'spec').map((entry) => entry.id)).toEqual([
      'alpha',
      'invalid',
      'warning',
    ]);
    expect(result.items.find((entry) => entry.id === 'invalid')?.valid).toBe(false);
    expect(result.items.find((entry) => entry.id === 'warning')).toMatchObject({
      valid: false,
    });
    expect(
      result.items
        .find((entry) => entry.id === 'warning')
        ?.issues.some((issue) => issue.level === 'WARNING')
    ).toBe(true);
  });
});
