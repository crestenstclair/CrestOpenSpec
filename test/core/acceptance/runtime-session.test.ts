import { spawn } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OWNED_PROCESS_SIGNAL_TEARDOWN_PROVIDER,
  ProcessLifecycleRuntimeProvider,
} from '../../../src/core/acceptance/runtime-session.js';
import {
  RuntimeHostCapabilityRegistry,
  RuntimeInteractionProviderRegistry,
} from '../../../src/core/acceptance/runtime-providers.js';
import {
  NodeRuntimeProcessLauncher,
  type RuntimeProcessLauncher,
} from '../../../src/core/acceptance/runtime-process-launcher.js';
import type {
  RuntimeSessionProof,
  RuntimeSessionProviderRequest,
} from '../../../src/core/acceptance/types.js';

const fixture = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'fixtures',
  'acceptance',
  'runtime-session-fixture.mjs'
);
const interactionDriver = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'fixtures',
  'acceptance',
  'runtime-interaction-driver.mjs'
);
const PTY_AVAILABLE = new NodeRuntimeProcessLauncher().ptyAvailable;

function proof(overrides: Partial<RuntimeSessionProof> = {}): RuntimeSessionProof {
  return {
    type: 'runtime-session',
    provider: 'process-lifecycle-v1',
    role: 'external-process-lifecycle',
    entryPoint: 'fixture production command',
    boundary: 'external-process',
    environment: 'synthetic',
    lifecycle: 'bounded',
    successCondition: 'FINAL_STATE then FINAL_SUMMARY exactly once',
    terminationOwner: 'process',
    resources: [
      { id: 'fixture-process', type: 'process', disposition: 'release', owner: 'fixture' },
    ],
    stdioMode: 'pipe',
    timeouts: {
      startupTimeoutMs: 400,
      progressSilenceMs: 220,
      completionTimeoutMs: 1_200,
      completionToExitGraceMs: 120,
      teardownGraceMs: 400,
      hardTimeoutMs: 1_600,
    },
    progress: [
      { id: 'checkpoint', stream: 'stdout', contains: 'CHECKPOINT', minimumCount: 1 },
    ],
    completion: [
      { id: 'state', stream: 'stdout', contains: 'FINAL_STATE', exactCount: 1 },
      { id: 'summary', stream: 'stdout', contains: 'FINAL_SUMMARY', exactCount: 1 },
    ],
    requireExitCode: 0,
    requireNoDescendants: true,
    requiredCapabilities: [],
    interactions: [],
    ...overrides,
  };
}

describe('process-lifecycle-v1 runtime sessions', () => {
  let cwd: string;
  const provider = new ProcessLifecycleRuntimeProvider();

  beforeEach(async () => {
    cwd = await realpath(await mkdtemp(path.join(os.tmpdir(), 'openspec runtime session-')));
  });

  afterEach(async () => {
    await rm(cwd, { recursive: true, force: true });
  });

  function request(
    mode: string,
    runtimeProof = proof(),
    extraArguments: string[] = []
  ): RuntimeSessionProviderRequest {
    return {
      proof: runtimeProof,
      argv: [process.execPath, fixture, mode, ...extraArguments],
      cwd,
      limits: { timeoutMs: 2_000, stdoutBytes: 64 * 1024, stderrBytes: 64 * 1024 },
      declaration: {
        kind: 'attached_runtime',
        owner: 'project.runtime',
        location: 'project.runtime.validations.session',
      },
    };
  }

  it('passes a fully bounded command with exact markers and no descendants', async () => {
    const result = await provider.run(request('clean'));

    expect(result.runtimeSession.diagnostics).toEqual([]);
    expect(result.runtimeSession.status).toBe('passed');
    expect(result.process).toMatchObject({ termination: 'exited', exitCode: 0 });
    expect(result.runtimeSession.evidence?.processTree).toMatchObject({
      noOwnedProcessesRemain: true,
      remainingPids: [],
    });
    expect(result.runtimeSession.evidence?.milestones.every((marker) => marker.passed)).toBe(
      true
    );
  });

  it('fails promptly when success is reported but the process remains resident and cleans its tree', async () => {
    const result = await provider.run(request('success-hang'));

    expect(result.runtimeSession.status).toBe('failed');
    expect(result.runtimeSession.diagnostics.map((entry) => entry.code)).toContain(
      'success_reported_but_process_resident'
    );
    expect(result.runtimeSession.evidence?.timeoutStage).toBe('completion_to_exit');
    expect(result.runtimeSession.evidence?.processTree.noOwnedProcessesRemain).toBe(true);
    expect(result.runtimeSession.evidence?.terminationActions.length).toBeGreaterThan(0);
  });

  it('accepts slow progress inside declared silence and total budgets', async () => {
    const result = await provider.run(
      request(
        'slow-progress',
        proof({
          progress: [
            { id: 'checkpoint', stream: 'stdout', contains: 'CHECKPOINT', minimumCount: 2 },
          ],
          timeouts: {
            ...proof().timeouts,
            progressSilenceMs: 180,
          },
        }),
        ['--delay', '90']
      )
    );

    expect(result.runtimeSession.status).toBe('passed');
    expect(result.runtimeSession.evidence?.milestones[0].observedCount).toBe(2);
  });

  it('fails at the progress-silence stage before completion', async () => {
    const result = await provider.run(
      request(
        'silent',
        proof({ timeouts: { ...proof().timeouts, progressSilenceMs: 100 } })
      )
    );

    expect(result.runtimeSession.evidence?.timeoutStage).toBe('progress_silence');
    expect(result.runtimeSession.diagnostics.map((entry) => entry.code)).toContain(
      'runtime_progress_silence_timeout'
    );
  });

  it('reports unavailable applicable host capability as a blocking proof gap without spawning', async () => {
    const restrictedProvider = new ProcessLifecycleRuntimeProvider({
      capabilities: new RuntimeHostCapabilityRegistry(['process', 'stdio:pipe']),
    });
    const result = await restrictedProvider.run(
      request(
        'clean',
        proof({
          environment: 'physical',
          requiredCapabilities: ['desktop-session'],
        })
      )
    );

    expect(result.runtimeSession.status).toBe('failed');
    expect(result.runtimeSession.diagnostics.map((entry) => entry.code)).toEqual([
      'BLOCKING_REQUIRED_PROOF_GAP',
    ]);
    expect(result.runtimeSession.evidence).toBeUndefined();
    expect(result.process.spawnError?.code).toBe('RUNTIME_CAPABILITY_UNAVAILABLE');
  });

  it('fails closed instead of downgrading an unavailable PTY transport to pipes', async () => {
    const launch = vi.fn();
    const unavailablePty: RuntimeProcessLauncher = {
      ptyAvailable: false,
      launch,
    };
    const restrictedProvider = new ProcessLifecycleRuntimeProvider({
      launcher: unavailablePty,
      capabilities: new RuntimeHostCapabilityRegistry(['process', 'stdio:pipe']),
    });
    const result = await restrictedProvider.run(
      request('buffered', proof({ stdioMode: 'pty' }))
    );

    expect(launch).not.toHaveBeenCalled();
    expect(result.runtimeSession.diagnostics.map((entry) => entry.code)).toEqual([
      'BLOCKING_REQUIRED_PROOF_GAP',
    ]);
    expect(result.runtimeSession.diagnostics[0]?.message).toContain('stdio:pty');
  });

  it.each([
    ['early-exit', 'exit_before_required_completion'],
    ['missing', 'required_marker_missing'],
    ['duplicate', 'required_marker_count_mismatch'],
    ['out-of-order', 'required_marker_out_of_order'],
  ])('rejects %s marker behavior with %s', async (mode, expectedCode) => {
    const result = await provider.run(request(mode));

    expect(result.runtimeSession.status).toBe('failed');
    expect(result.runtimeSession.diagnostics.map((entry) => entry.code)).toContain(
      expectedCode
    );
  });

  it('detects and cleans a child that remains after its parent exits', async () => {
    const result = await provider.run(request('child-resident'));
    const childPid = Number(result.process.stdout.match(/CHILD_PID:(\d+)/)?.[1]);

    expect(result.runtimeSession.diagnostics.map((entry) => entry.code)).toContain(
      'owned_descendant_resident'
    );
    expect(result.runtimeSession.evidence?.processTree.observedDescendantPids).toContain(
      childPid
    );
    expect(result.runtimeSession.evidence?.processTree.noOwnedProcessesRemain).toBe(true);
    expect(() => process.kill(childPid, 0)).toThrow();
  });

  it('stops a persistent service through its declared bounded controller', async () => {
    const persistent = proof({
      lifecycle: 'service-persistent',
      successCondition: 'READY exactly once',
      terminationOwner: 'acceptance-controller',
      resources: [
        {
          id: 'fixture-service',
          type: 'service',
          disposition: 'retain-during-readiness',
          owner: 'fixture',
        },
      ],
      completion: [
        { id: 'ready', stream: 'stdout', contains: 'READY', exactCount: 1 },
      ],
      teardown: {
        provider: OWNED_PROCESS_SIGNAL_TEARDOWN_PROVIDER,
        request: { signal: 'SIGTERM' },
      },
    });
    const result = await provider.run(request('persistent', persistent));

    expect(result.runtimeSession.status).toBe('passed');
    expect(result.runtimeSession.evidence?.teardown).toMatchObject({
      required: true,
      passed: true,
      provider: OWNED_PROCESS_SIGNAL_TEARDOWN_PROVIDER,
    });
    expect(result.process.exitCode).toBe(0);
  });

  it('does not terminate an unrelated process with the same executable name', async () => {
    const unrelated = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    try {
      const result = await provider.run(request('success-hang'));

      expect(result.runtimeSession.status).toBe('failed');
      expect(() => process.kill(unrelated.pid as number, 0)).not.toThrow();
      expect(result.runtimeSession.evidence?.processTree.observedPids).not.toContain(
        unrelated.pid
      );
    } finally {
      unrelated.kill('SIGKILL');
    }
  });

  it.skipIf(!PTY_AVAILABLE)('observes progress through PTY that the same buffered fixture hides from a pipe', async () => {
    const pipe = await provider.run(
      request(
        'buffered',
        proof({ timeouts: { ...proof().timeouts, progressSilenceMs: 110 } }),
        ['--pipe-delay', '240']
      )
    );
    expect(pipe.runtimeSession.evidence?.timeoutStage).toBe('progress_silence');

    const pty = await provider.run(
      request(
        'buffered',
        proof({
          stdioMode: 'pty',
          timeouts: { ...proof().timeouts, progressSilenceMs: 110 },
        }),
        ['--pipe-delay', '240']
      )
    );
    expect(pty.runtimeSession.status).toBe('passed');
    expect(pty.runtimeSession.evidence?.proof.stdioMode).toBe('pty');
  });

  it('runs an interaction inside two observed milestones with session-bound evidence', async () => {
    const seamPath = path.join(cwd, 'interaction-seam.json');
    const interactionProof = proof({
      role: 'production-composition-runtime',
      boundary: 'production-composition',
      progress: [
        { id: 'window-open', stream: 'stdout', contains: 'WINDOW_OPEN', minimumCount: 1 },
      ],
      completion: [
        { id: 'window-close', stream: 'stdout', contains: 'WINDOW_CLOSE', exactCount: 1 },
        { id: 'summary', stream: 'stdout', contains: 'FINAL_SUMMARY', exactCount: 1 },
      ],
      interactions: [
        {
          id: 'mapped-input',
          provider: 'process-json-v1',
          opensAfter: 'window-open',
          closesBefore: 'window-close',
          request: {
            command: [process.execPath, interactionDriver],
            timeoutMs: 800,
            payload: { seamPath, action: 'mapped-input', mode: 'pass' },
          },
          requiredAssertions: ['isolation-preserved'],
        },
      ],
    });
    const result = await provider.run(
      request('interaction', interactionProof, ['--seam', seamPath])
    );

    expect(result.runtimeSession.diagnostics).toEqual([]);
    expect(result.runtimeSession.status).toBe('passed');
    expect(result.runtimeSession.evidence?.interactions[0]).toMatchObject({
      id: 'mapped-input',
      status: 'passed',
      evidence: { attempted: true, reachedSeam: true },
    });
    expect(result.process.stdout).toContain('ACTION:mapped-input');
  });

  it('does not invoke an interaction after its observed milestone window has closed', async () => {
    const invoke = vi.fn(async () => ({
      sessionId: 'should-not-run',
      actionId: 'mapped-input',
      attempted: true,
      reachedSeam: true,
      deliveredAtMs: 0,
      assertions: [{ id: 'isolation-preserved', passed: true }],
      details: {},
    }));
    const interactions = new RuntimeInteractionProviderRegistry().register({
      id: 'recording-interaction',
      invoke,
    });
    const providerWithRecordingInteraction = new ProcessLifecycleRuntimeProvider({
      interactions,
    });
    const interactionProof = proof({
      role: 'production-composition-runtime',
      boundary: 'production-composition',
      progress: [
        { id: 'window-open', stream: 'stdout', contains: 'WINDOW_OPEN', minimumCount: 1 },
      ],
      completion: [
        { id: 'window-close', stream: 'stdout', contains: 'WINDOW_CLOSE', exactCount: 1 },
        { id: 'summary', stream: 'stdout', contains: 'FINAL_SUMMARY', exactCount: 1 },
      ],
      interactions: [
        {
          id: 'mapped-input',
          provider: 'recording-interaction',
          opensAfter: 'window-open',
          closesBefore: 'window-close',
          request: {},
          requiredAssertions: ['isolation-preserved'],
        },
      ],
    });

    const result = await providerWithRecordingInteraction.run(
      request('closed-interaction-window', interactionProof)
    );

    expect(invoke).not.toHaveBeenCalled();
    expect(result.runtimeSession.status).toBe('failed');
    expect(result.runtimeSession.diagnostics.map((entry) => entry.code)).toContain(
      'runtime_interaction_timing_mismatch'
    );
  });

  it('fails closed when the declared interaction provider is missing', async () => {
    const seamPath = path.join(cwd, 'missing-provider-seam.json');
    const providerWithoutInteractions = new ProcessLifecycleRuntimeProvider({
      interactions: new RuntimeInteractionProviderRegistry(),
    });
    const interactionProof = proof({
      role: 'production-composition-runtime',
      boundary: 'production-composition',
      progress: [
        { id: 'window-open', stream: 'stdout', contains: 'WINDOW_OPEN', minimumCount: 1 },
      ],
      completion: [
        { id: 'window-close', stream: 'stdout', contains: 'WINDOW_CLOSE', exactCount: 1 },
        { id: 'summary', stream: 'stdout', contains: 'FINAL_SUMMARY', exactCount: 1 },
      ],
      interactions: [
        {
          id: 'mapped-input',
          provider: 'missing-interaction-provider',
          opensAfter: 'window-open',
          closesBefore: 'window-close',
          request: { payload: { seamPath } },
          requiredAssertions: ['isolation-preserved'],
        },
      ],
    });
    const result = await providerWithoutInteractions.run(
      request(
        'interaction',
        interactionProof,
        ['--seam', seamPath, '--seam-timeout', '250']
      )
    );

    expect(result.runtimeSession.status).toBe('failed');
    expect(result.runtimeSession.diagnostics.map((entry) => entry.code)).toContain(
      'runtime_interaction_provider_unsupported'
    );
    expect(result.runtimeSession.evidence?.processTree.noOwnedProcessesRemain).toBe(true);
  });

  it('cleans the exact interaction-driver tree when a project-owned driver times out', async () => {
    const seamPath = path.join(cwd, 'timed-out-driver-seam.json');
    const pidPath = path.join(cwd, 'timed-out-driver-child.pid');
    const interactionProof = proof({
      role: 'production-composition-runtime',
      boundary: 'production-composition',
      progress: [
        { id: 'window-open', stream: 'stdout', contains: 'WINDOW_OPEN', minimumCount: 1 },
      ],
      completion: [
        { id: 'window-close', stream: 'stdout', contains: 'WINDOW_CLOSE', exactCount: 1 },
        { id: 'summary', stream: 'stdout', contains: 'FINAL_SUMMARY', exactCount: 1 },
      ],
      interactions: [
        {
          id: 'mapped-input',
          provider: 'process-json-v1',
          opensAfter: 'window-open',
          closesBefore: 'window-close',
          request: {
            command: [process.execPath, interactionDriver],
            timeoutMs: 180,
            payload: { seamPath, pidPath, mode: 'hang-child' },
          },
          requiredAssertions: ['isolation-preserved'],
        },
      ],
    });
    const result = await provider.run(
      request(
        'interaction',
        interactionProof,
        ['--seam', seamPath, '--seam-timeout', '350']
      )
    );
    const childPid = Number(await readFile(pidPath, 'utf8'));

    expect(result.runtimeSession.diagnostics.map((entry) => entry.code)).toContain(
      'runtime_interaction_provider_failed'
    );
    expect(() => process.kill(childPid, 0)).toThrow();
    expect(result.runtimeSession.evidence?.processTree.noOwnedProcessesRemain).toBe(true);
  });

  it.each([
    ['before-window', 'runtime_interaction_timing_mismatch'],
    ['after-window', 'runtime_interaction_timing_mismatch'],
    ['wrong-session', 'runtime_interaction_session_mismatch'],
    ['miss-seam', 'runtime_interaction_seam_not_reached'],
    ['assertion-failed', 'runtime_interaction_assertion_failed'],
  ])('fails controlled interaction evidence in %s mode', async (mode, expectedCode) => {
    const seamPath = path.join(cwd, `interaction-${mode}.json`);
    const interactionProof = proof({
      role: 'production-composition-runtime',
      boundary: 'production-composition',
      progress: [
        { id: 'window-open', stream: 'stdout', contains: 'WINDOW_OPEN', minimumCount: 1 },
      ],
      completion: [
        { id: 'window-close', stream: 'stdout', contains: 'WINDOW_CLOSE', exactCount: 1 },
        { id: 'summary', stream: 'stdout', contains: 'FINAL_SUMMARY', exactCount: 1 },
      ],
      interactions: [
        {
          id: 'mapped-input',
          provider: 'process-json-v1',
          opensAfter: 'window-open',
          closesBefore: 'window-close',
          request: {
            command: [process.execPath, interactionDriver],
            timeoutMs: 800,
            payload: { seamPath, action: 'mapped-input', mode },
          },
          requiredAssertions: ['isolation-preserved'],
        },
      ],
    });
    const result = await provider.run(
      request(
        'interaction',
        interactionProof,
        ['--seam', seamPath, '--seam-timeout', mode === 'miss-seam' ? '250' : '2000']
      )
    );

    expect(result.runtimeSession.status).toBe('failed');
    expect(result.runtimeSession.diagnostics.map((entry) => entry.code)).toContain(
      expectedCode
    );
  });
});
