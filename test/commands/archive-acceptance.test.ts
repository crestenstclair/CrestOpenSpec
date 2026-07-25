import { access, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runCLI } from '../helpers/run-cli.js';
// @ts-expect-error - executable ESM fixture helper intentionally has no declaration file
import { createAcceptanceFixtureProject } from '../fixtures/acceptance/create-project.mjs';

describe('archive acceptance enforcement', () => {
  let tempDir: string;
  let fixtureRoot: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    tempDir = await realpath(await mkdtemp(path.join(os.tmpdir(), 'openspec archive acceptance-')));
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

  it.each([
    ['--yes', ['--yes']],
    ['--yes --skip-specs', ['--yes', '--skip-specs']],
    ['--yes --no-validate', ['--yes', '--no-validate']],
    ['all legacy bypass flags', ['--yes', '--no-validate', '--skip-specs']],
  ])('blocks mutation before archive with %s', async (_label, flags) => {
    await createAcceptanceFixtureProject(fixtureRoot, 'zero-test');
    const activeChange = path.join(fixtureRoot, 'openspec', 'changes', 'demo');
    const deltaPath = path.join(activeChange, 'specs', 'fixture-capability', 'spec.md');
    const deltaBefore = await readFile(deltaPath, 'utf8');

    const result = await runCLI(['archive', 'demo', ...flags, '--json'], {
      cwd: fixtureRoot,
      env,
    });
    const payload = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(1);
    expect(payload.archive).toBeNull();
    expect(payload.status[0].code).toBe('archive_acceptance_failed');
    expect(payload.acceptance).toMatchObject({ applicable: true, passed: false });
    expect(payload.acceptance.checks[0]).toMatchObject({
      id: 'fixture.broad',
      passed: true,
    });
    expect(payload.acceptance.checks[1]).toMatchObject({
      id: 'fixture.storage-zero',
      processPassed: true,
      passed: false,
      testEvidence: { evidence: { executed: 0 } },
    });
    await expect(access(activeChange)).resolves.toBeUndefined();
    await expect(readFile(deltaPath, 'utf8')).resolves.toBe(deltaBefore);
    await expect(access(path.join(fixtureRoot, 'openspec', 'changes', 'archive'))).rejects.toThrow();
    await expect(readdir(path.join(fixtureRoot, 'openspec', 'specs'))).resolves.toEqual([]);
  });

  it('does not let incomplete-task warning acceptance override a failed gate', async () => {
    await createAcceptanceFixtureProject(fixtureRoot, 'zero-test');
    const tasksPath = path.join(fixtureRoot, 'openspec', 'changes', 'demo', 'tasks.md');
    await writeFile(tasksPath, '- [ ] Incomplete work that --yes would otherwise accept\n');

    const result = await runCLI(
      ['archive', 'demo', '--yes', '--skip-specs', '--no-validate', '--json'],
      { cwd: fixtureRoot, env }
    );
    const payload = JSON.parse(result.stdout);
    expect(result.exitCode).toBe(1);
    expect(payload.status[0].code).toBe('archive_acceptance_failed');
    expect(await readFile(tasksPath, 'utf8')).toContain('[ ]');
  });

  it('archives a governed passing project and preserves the complete report in JSON success', async () => {
    await createAcceptanceFixtureProject(fixtureRoot, 'passing');
    const result = await runCLI(
      ['archive', 'demo', '--yes', '--skip-specs', '--no-validate', '--json'],
      { cwd: fixtureRoot, env }
    );
    const payload = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(payload.archive.acceptance).toMatchObject({
      applicable: true,
      passed: true,
      gates: {
        validations: { declaredProjectChecks: 1, applicableAttachedTests: 1, executed: 2 },
      },
    });
    await expect(
      access(path.join(fixtureRoot, 'openspec', 'changes', 'demo'))
    ).rejects.toThrow();
    const archives = await readdir(path.join(fixtureRoot, 'openspec', 'changes', 'archive'));
    expect(archives).toHaveLength(1);
    expect(archives[0]).toMatch(/^\d{4}-\d{2}-\d{2}-demo$/);
  });

  it('retains documented legacy archive behavior when no CUE package exists', async () => {
    await createAcceptanceFixtureProject(fixtureRoot, 'passing');
    await rm(path.join(fixtureRoot, 'spec'), { recursive: true, force: true });
    const result = await runCLI(
      ['archive', 'demo', '--yes', '--skip-specs', '--no-validate', '--json'],
      { cwd: fixtureRoot, env }
    );
    const payload = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(payload.archive.acceptance).toMatchObject({ applicable: false, passed: true });
    expect(payload.archive.acceptance.gates.architecture.status).toBe('not_applicable');
    const archives = await readdir(path.join(fixtureRoot, 'openspec', 'changes', 'archive'));
    expect(archives).toHaveLength(1);
  });

  it('retains legacy archive behavior for valid CUE without an executable gate declaration', async () => {
    await createAcceptanceFixtureProject(fixtureRoot, 'passing');
    await writeFile(
      path.join(fixtureRoot, 'spec', 'project.cue'),
      'package acceptance\n\nproject: {name: "legacy-cue", resources: {}}\n'
    );
    const result = await runCLI(
      ['archive', 'demo', '--yes', '--skip-specs', '--no-validate', '--json'],
      { cwd: fixtureRoot, env }
    );
    const payload = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(payload.archive.acceptance).toMatchObject({ applicable: false, passed: true });
    expect(payload.archive.acceptance.gates.architecture.status).toBe('passed');
    expect(payload.archive.acceptance.gates.validations.status).toBe('not_applicable');
  });
});
