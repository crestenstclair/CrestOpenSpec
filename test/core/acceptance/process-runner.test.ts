import { mkdtemp, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { NodeCommandRunner } from '../../../src/core/acceptance/process-runner.js';

describe('NodeCommandRunner', () => {
  let cwd: string;
  const runner = new NodeCommandRunner();

  beforeEach(async () => {
    cwd = await realpath(await mkdtemp(path.join(os.tmpdir(), 'openspec acceptance runner-')));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  function request(argv: string[], overrides: Partial<{ timeoutMs: number; stdoutBytes: number; stderrBytes: number }> = {}) {
    return {
      argv,
      cwd,
      limits: {
        timeoutMs: overrides.timeoutMs ?? 2_000,
        stdoutBytes: overrides.stdoutBytes ?? 4_096,
        stderrBytes: overrides.stderrBytes ?? 4_096,
      },
    };
  }

  it('records a successful direct argument-vector execution in a path containing spaces', async () => {
    const result = await runner.run(
      request([process.execPath, '-e', "process.stdout.write('ready'); process.stderr.write('note')"])
    );

    expect(result).toMatchObject({
      termination: 'exited',
      exitCode: 0,
      signal: null,
      timedOut: false,
      outputLimitExceeded: [],
      stdout: 'ready',
      stderr: 'note',
    });
    expect(result.cwd).toBe(cwd);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('does not interpret shell metacharacters in literal arguments', async () => {
    const literal = '$(should-not-run); `also-not-run` && | > value with spaces';
    const result = await runner.run(
      request([
        process.execPath,
        '-e',
        'process.stdout.write(JSON.stringify(process.argv.slice(1)))',
        literal,
      ])
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([literal]);
  });

  it('records nonzero exit without treating output as success', async () => {
    const result = await runner.run(
      request([process.execPath, '-e', "process.stdout.write('success text'); process.exit(7)"])
    );

    expect(result.termination).toBe('exited');
    expect(result.exitCode).toBe(7);
    expect(result.stdout).toBe('success text');
  });

  it.skipIf(process.platform === 'win32')('records signal termination', async () => {
    const result = await runner.run(
      request([process.execPath, '-e', "process.kill(process.pid, 'SIGTERM')"])
    );

    expect(result.termination).toBe('signaled');
    expect(result.signal).toBe('SIGTERM');
    expect(result.exitCode).toBeNull();
  });

  it('terminates and records a timeout', async () => {
    const result = await runner.run(
      request([process.execPath, '-e', 'setInterval(() => {}, 1000)'], { timeoutMs: 40 })
    );

    expect(result.termination).toBe('timed_out');
    expect(result.timedOut).toBe(true);
  });

  it('enforces stdout and stderr limits independently and retains bounded output', async () => {
    const result = await runner.run(
      request(
        [
          process.execPath,
          '-e',
          "process.stdout.write('x'.repeat(1024)); process.stderr.write('y'.repeat(1024)); setInterval(() => {}, 1000)",
        ],
        { stdoutBytes: 32, stderrBytes: 48 }
      )
    );

    expect(result.termination).toBe('output_limit');
    expect(result.outputLimitExceeded).toContain('stdout');
    expect(result.stdout.length).toBeLessThanOrEqual(32);
    expect(result.stderr.length).toBeLessThanOrEqual(48);
    expect(result.stdoutTruncated).toBe(true);
  });

  it('enforces the stderr limit when stdout remains within its independent bound', async () => {
    const result = await runner.run(
      request(
        [
          process.execPath,
          '-e',
          "process.stdout.write('ok'); process.stderr.write('y'.repeat(1024)); setInterval(() => {}, 1000)",
        ],
        { stdoutBytes: 4_096, stderrBytes: 48 }
      )
    );

    expect(result.termination).toBe('output_limit');
    expect(result.outputLimitExceeded).toEqual(['stderr']);
    expect(result.stdout).toBe('ok');
    expect(result.stdoutTruncated).toBe(false);
    expect(Buffer.byteLength(result.stderr)).toBeLessThanOrEqual(48);
    expect(result.stderrTruncated).toBe(true);
  });

  it('returns a structured spawn error for an unavailable executable', async () => {
    const result = await runner.run(
      request([`openspec-command-that-does-not-exist-${process.pid}`])
    );

    expect(result.termination).toBe('spawn_error');
    expect(result.exitCode).toBeNull();
    expect(result.spawnError?.message).toBeTruthy();
  });
});
