import { access, mkdtemp, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runCLI } from '../helpers/run-cli.js';
// @ts-expect-error - executable ESM fixture helper intentionally has no declaration file
import { createAcceptanceFixtureProject } from '../fixtures/acceptance/create-project.mjs';

describe('runtime-session explicit execution boundary', () => {
  let tempDir: string;
  let fixtureRoot: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    tempDir = await realpath(await mkdtemp(path.join(os.tmpdir(), 'openspec runtime reads-')));
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
    ['list', '--json'],
    ['status', '--change', 'demo', '--json'],
    ['instructions', 'apply', '--change', 'demo', '--json'],
    ['validate', 'demo', '--strict', '--json'],
    ['context', '--json'],
  ])('does not start a declared runtime during %s', async (...args) => {
    await createAcceptanceFixtureProject(fixtureRoot, 'runtime-nonexecution');
    const result = await runCLI(args, { cwd: fixtureRoot, env });

    expect(result.exitCode).toBe(0);
    await expect(access(path.join(fixtureRoot, 'runtime-started'))).rejects.toThrow();
  });
});
