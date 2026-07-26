import { access, mkdtemp, readdir, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runCLI } from '../helpers/run-cli.js';
// @ts-expect-error - executable ESM fixture helper intentionally has no declaration file
import { createAcceptanceFixtureProject } from '../fixtures/acceptance/create-project.mjs';

describe('archive approval boundary', () => {
  let tempDir: string;
  let fixtureRoot: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    tempDir = await realpath(await mkdtemp(path.join(os.tmpdir(), 'openspec archive approval-')));
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

  it('archives without rerunning a declared acceptance check that would fail', async () => {
    await createAcceptanceFixtureProject(fixtureRoot, 'runtime-nonexecution');

    const result = await runCLI(
      ['archive', 'demo', '--yes', '--skip-specs', '--no-validate', '--json'],
      { cwd: fixtureRoot, env }
    );
    const payload = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(payload.archive).toMatchObject({
      change: 'demo',
      specsUpdated: false,
    });
    expect(payload.archive).not.toHaveProperty('acceptance');
    expect(payload).not.toHaveProperty('acceptance');
    await expect(access(path.join(fixtureRoot, 'runtime-started'))).rejects.toThrow();
    await expect(
      access(path.join(fixtureRoot, 'openspec', 'changes', 'demo'))
    ).rejects.toThrow();
    const archives = await readdir(path.join(fixtureRoot, 'openspec', 'changes', 'archive'));
    expect(archives).toHaveLength(1);
    expect(archives[0]).toMatch(/^\d{4}-\d{2}-\d{2}-demo$/);
  });
});
