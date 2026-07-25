import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
// @ts-expect-error - executable ESM fixture helper intentionally has no declaration file
import { createAcceptanceFixtureProject } from '../fixtures/acceptance/create-project.mjs';

function parseOneJsonDocument(result: RunCLIResult): any {
  const trimmed = result.stdout.trim();
  expect(trimmed).not.toBe('');
  const parsed = JSON.parse(trimmed);
  expect(`${JSON.stringify(parsed, null, 2)}\n`).toBe(result.stdout);
  return parsed;
}

describe('acceptance command', () => {
  let tempDir: string;
  let fixtureRoot: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    tempDir = await realpath(await mkdtemp(path.join(os.tmpdir(), 'openspec acceptance cli-')));
    fixtureRoot = path.join(tempDir, 'fixture project');
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'xdg-data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'xdg-config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  async function runFixture(kind: string, args = ['acceptance', 'demo', '--json']) {
    await createAcceptanceFixtureProject(fixtureRoot, kind);
    return runCLI(args, { cwd: fixtureRoot, env });
  }

  it('returns one successful versioned JSON report with project and attached execution provenance', async () => {
    const result = await runFixture('passing');
    const report = parseOneJsonDocument(result);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(report).toMatchObject({
      version: '1.0',
      applicable: true,
      passed: true,
      scope: { mode: 'change', change: 'demo' },
      root: { path: await realpath(fixtureRoot), source: 'nearest' },
      semanticReview: { status: 'not_evaluated' },
    });
    expect(report.gates.architecture.status).toBe('passed');
    expect(report.gates.openspec.status).toBe('passed');
    expect(report.gates.validations).toMatchObject({
      status: 'passed',
      declaredProjectChecks: 1,
      applicableAttachedTests: 1,
      resolved: 2,
      executed: 2,
    });
    expect(report.checks.map((check: any) => check.declaration.kind)).toEqual([
      'project_check',
      'attached_test',
    ]);
    expect(report.checks[1].declaration).toMatchObject({
      owner: 'project.resources.storage',
      location: 'project.resources.storage.validations.targeted',
    });
    expect(report.checks[1].process).not.toHaveProperty('env');
  });

  it('fails a targeted zero-selection validation even while the broad project suite passes', async () => {
    const result = await runFixture('zero-test');
    const report = parseOneJsonDocument(result);

    expect(result.exitCode).toBe(1);
    expect(report.passed).toBe(false);
    expect(report.checks).toHaveLength(2);
    expect(report.checks[0]).toMatchObject({ id: 'fixture.broad', passed: true });
    expect(report.checks[1]).toMatchObject({
      id: 'fixture.storage-zero',
      processPassed: true,
      passed: false,
      testEvidence: {
        status: 'failed',
        selector: { kind: 'fixture', value: 'resource:storage' },
        evidence: { executed: 0, selector: { kind: 'fixture', value: 'resource:storage' } },
      },
    });
    expect(report.checks[1].testEvidence.diagnostics.map((entry: any) => entry.code)).toContain(
      'test_evidence_minimum_not_met'
    );
  });

  it('rejects evidence produced for a broad selector instead of the targeted declaration', async () => {
    const result = await runFixture('selector-mismatch');
    const report = parseOneJsonDocument(result);
    expect(result.exitCode).toBe(1);
    expect(report.checks[0]).toMatchObject({
      id: 'fixture.broad',
      passed: true,
      testEvidence: {
        selector: { kind: 'fixture', value: 'suite:all' },
        evidence: { selector: { kind: 'fixture', value: 'suite:all' }, executed: 4 },
      },
    });
    expect(report.checks[1]).toMatchObject({
      id: 'fixture.storage-mismatch',
      processPassed: true,
      passed: false,
      testEvidence: {
        selector: { kind: 'fixture', value: 'resource:storage' },
        evidence: { selector: { kind: 'fixture', value: 'suite:all' } },
      },
    });
    expect(report.checks[1].testEvidence.diagnostics.map((entry: any) => entry.code)).toContain(
      'test_evidence_selector_mismatch'
    );
  });

  it('fails unsupported providers without inferring a runner or default parser', async () => {
    const result = await runFixture('unsupported-provider');
    const report = parseOneJsonDocument(result);
    expect(result.exitCode).toBe(1);
    expect(report.checks[0].testEvidence.diagnostics[0].code).toBe(
      'test_evidence_provider_unsupported'
    );
    expect(report.checks[0].testEvidence.selector).toEqual({
      kind: 'fixture',
      value: 'suite:all',
    });
    expect(report.checks[0].testEvidence.evidence).toBeUndefined();
  });

  it('fails a nonzero command even if it writes a controlled diagnostic', async () => {
    const result = await runFixture('failing');
    const report = parseOneJsonDocument(result);
    expect(result.exitCode).toBe(1);
    expect(report.checks[0]).toMatchObject({
      id: 'fixture.failure',
      processPassed: false,
      process: { termination: 'exited', exitCode: 7, stderr: 'controlled fixture failure' },
    });
    expect(report.checks[0].diagnostics.map((entry: any) => entry.code)).toContain(
      'validation_nonzero_exit'
    );
  });

  it('renders deterministic human gates and the semantic-review boundary', async () => {
    const result = await runFixture('passing', ['acceptance', 'demo']);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Acceptance PASS');
    expect(result.stdout).toContain('PASS executable validations (2/2 executed');
    expect(result.stdout).toContain('declaration: attached_test');
    expect(result.stdout).toContain('PASS assertion 1 (exit-code): expected=0, observed=0');
    expect(result.stdout).toContain(
      'declared selector: {"kind":"fixture","value":"resource:storage"}'
    );
    expect(result.stdout).toContain('Semantic review: not_evaluated');
  });

  it.each([
    [['acceptance', '--json'], 'acceptance_scope_required'],
    [['acceptance', 'demo', '--project', '--json'], 'acceptance_scope_conflict'],
  ])('returns one JSON report for explicit scope error %#', async (args, code) => {
    await createAcceptanceFixtureProject(fixtureRoot, 'passing');
    const result = await runCLI(args, { cwd: fixtureRoot, env });
    const report = parseOneJsonDocument(result);
    expect(result.exitCode).toBe(1);
    expect(report.root).toBeNull();
    expect(report.diagnostics[0].code).toBe(code);
  });

  it('treats --release as project scope and validates the complete fixture', async () => {
    const result = await runFixture('passing', ['acceptance', '--release', '--json']);
    const report = parseOneJsonDocument(result);
    expect(result.exitCode).toBe(0);
    expect(report.scope).toEqual({ mode: 'project' });
    expect(report.gates.validations.executed).toBe(2);
  });

  it('reports invalid CUE as a blocking architecture gate in one JSON document', async () => {
    await createAcceptanceFixtureProject(fixtureRoot, 'passing');
    await writeFile(
      path.join(fixtureRoot, 'spec', 'incomplete.cue'),
      'package acceptance\nproject: releaseName: string\n'
    );
    const result = await runCLI(['acceptance', 'demo', '--json'], {
      cwd: fixtureRoot,
      env,
    });
    const report = parseOneJsonDocument(result);
    expect(result.exitCode).toBe(1);
    expect(report.gates.architecture.status).toBe('failed');
    expect(report.diagnostics[0].code).toBe('cue_architecture_evaluation_failed');
  });

  it('selects and reports the canonical registered store root', async () => {
    await createAcceptanceFixtureProject(fixtureRoot, 'passing');
    const appRepo = path.join(tempDir, 'application without openspec');
    await mkdir(appRepo, { recursive: true });
    const globalDataDir = getGlobalDataDir({ env });
    await registerStore({ id: 'acceptance-fixture', localPath: fixtureRoot, globalDataDir });

    const result = await runCLI(
      ['acceptance', 'demo', '--store', 'acceptance-fixture', '--json'],
      { cwd: appRepo, env }
    );
    const report = parseOneJsonDocument(result);
    expect(result.exitCode).toBe(0);
    expect(report.root).toEqual({
      path: await realpath(fixtureRoot),
      source: 'store',
      store_id: 'acceptance-fixture',
    });
    expect(await readFile(path.join(fixtureRoot, 'openspec', 'changes', 'demo', 'tasks.md'), 'utf8')).toContain('[x]');
  });
});
