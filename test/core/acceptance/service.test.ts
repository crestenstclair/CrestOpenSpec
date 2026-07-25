import { mkdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AcceptanceService } from '../../../src/core/acceptance/service.js';
import { TestEvidenceProviderRegistry } from '../../../src/core/acceptance/test-evidence.js';
import type {
  CommandRunner,
  ProcessExecutionRequest,
  ProcessResult,
} from '../../../src/core/acceptance/types.js';
import type { CueArchitecture, JsonObject } from '../../../src/core/cue-architecture.js';
import type { ResolvedOpenSpecRoot } from '../../../src/core/root-selection.js';

const LIMITS = { timeoutMs: 1_000, stdoutBytes: 4_096, stderrBytes: 4_096 };

function validation(
  id: string,
  scope: 'project' | 'attached',
  commandTag: string,
  extra: JsonObject = {}
): JsonObject {
  return {
    id,
    scope,
    command: [process.execPath, commandTag],
    workingDirectory: '.',
    limits: LIMITS,
    assertions: [{ type: 'exit-code', equals: 0 }],
    ...extra,
  };
}

function proof(selector: JsonObject, provider = 'structured-json-v1'): JsonObject {
  return {
    type: 'test-suite',
    provider,
    minimumExecuted: 1,
    selector,
    options: { stream: 'stdout' },
  };
}

function result(
  request: ProcessExecutionRequest,
  options: { exitCode?: number; stdout?: string; stderr?: string } = {}
): ProcessResult {
  const exitCode = options.exitCode ?? 0;
  return {
    argv: [...request.argv],
    cwd: request.cwd,
    limits: { ...request.limits },
    durationMs: 2,
    termination: 'exited',
    exitCode,
    signal: null,
    timedOut: false,
    outputLimitExceeded: [],
    stdout: options.stdout ?? '',
    stderr: options.stderr ?? '',
    stdoutTruncated: false,
    stderrTruncated: false,
  };
}

describe('AcceptanceService', () => {
  let projectRoot: string;
  let root: ResolvedOpenSpecRoot;

  beforeEach(async () => {
    projectRoot = await realpath(await mkdtemp(path.join(os.tmpdir(), 'openspec acceptance service-')));
    await mkdir(path.join(projectRoot, 'openspec', 'changes'), { recursive: true });
    await mkdir(path.join(projectRoot, 'openspec', 'specs'), { recursive: true });
    root = {
      path: projectRoot,
      changesDir: path.join(projectRoot, 'openspec', 'changes'),
      specsDir: path.join(projectRoot, 'openspec', 'specs'),
      archiveDir: path.join(projectRoot, 'openspec', 'changes', 'archive'),
      defaultSchema: 'spec-driven',
      source: 'nearest',
    };
  });

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true });
  });

  function architecture(project: JsonObject): CueArchitecture {
    return {
      root: path.join(projectRoot, 'spec'),
      files: [path.join(projectRoot, 'spec', 'project.cue')],
      project,
      relationships: [],
    };
  }

  function passedStrictValidation() {
    return Promise.resolve({ items: [], diagnostics: [] });
  }

  it('reports no CUE package as not applicable without validating or executing', async () => {
    const run = vi.fn();
    const strictValidation = vi.fn();
    const service = new AcceptanceService({
      cueLoader: () => undefined,
      commandRunner: { run } as CommandRunner,
      strictValidation,
    });

    const report = await service.run(root, {
      scope: { mode: 'change', change: 'example' },
    });

    expect(report).toMatchObject({ applicable: false, passed: true });
    expect(report.gates.architecture.status).toBe('not_applicable');
    expect(strictValidation).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('keeps valid legacy CUE without executable declarations not applicable', async () => {
    const run = vi.fn();
    const strictValidation = vi.fn();
    const service = new AcceptanceService({
      cueLoader: () => architecture({ name: 'legacy', resources: {} }),
      commandRunner: { run } as CommandRunner,
      strictValidation,
    });

    const report = await service.run(root, { scope: { mode: 'project' } });
    expect(report.applicable).toBe(false);
    expect(report.gates.validations.status).toBe('not_applicable');
    expect(run).not.toHaveBeenCalled();
    expect(strictValidation).not.toHaveBeenCalled();
  });

  it('prevents strict validation and every command when inventory integrity fails', async () => {
    const run = vi.fn();
    const strictValidation = vi.fn();
    const service = new AcceptanceService({
      cueLoader: () =>
        architecture({
          completion: { projectChecks: ['missing'] },
          validations: {},
        }),
      commandRunner: { run } as CommandRunner,
      strictValidation,
    });

    const report = await service.run(root, { scope: { mode: 'project' } });
    expect(report.applicable).toBe(true);
    expect(report.passed).toBe(false);
    expect(report.gates.validations.executed).toBe(0);
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'project_check_reference_missing'
    );
    expect(strictValidation).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it('prevents every executable validation when strict OpenSpec validation fails', async () => {
    const run = vi.fn();
    const service = new AcceptanceService({
      cueLoader: () =>
        architecture({
          completion: { projectChecks: ['one'] },
          validations: { one: validation('one', 'project', 'one') },
        }),
      commandRunner: { run } as CommandRunner,
      strictValidation: async () => ({
        items: [
          {
            id: 'change-a',
            type: 'change',
            path: '/change-a',
            valid: false,
            issues: [
              {
                level: 'ERROR',
                path: 'specs/example/spec.md',
                message: 'invalid delta',
              },
            ],
          },
        ],
        diagnostics: [],
      }),
    });

    const report = await service.run(root, {
      scope: { mode: 'change', change: 'change-a' },
    });
    expect(report.gates.openspec.status).toBe('failed');
    expect(report.gates.validations.executed).toBe(0);
    expect(run).not.toHaveBeenCalled();
  });

  it('turns an unexpected strict-validator error into one structured failure report', async () => {
    const run = vi.fn();
    const service = new AcceptanceService({
      cueLoader: () =>
        architecture({
          completion: { projectChecks: ['one'] },
          validations: { one: validation('one', 'project', 'one') },
        }),
      commandRunner: { run } as CommandRunner,
      strictValidation: async () => {
        throw new Error('validator unavailable');
      },
    });

    const report = await service.run(root, { scope: { mode: 'project' } });
    expect(report.passed).toBe(false);
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'openspec_validation_internal_error',
      'validations_not_executed_openspec_error',
    ]);
    expect(run).not.toHaveBeenCalled();
  });

  it('executes every resolved declaration even after another validation fails', async () => {
    const run = vi.fn(async (request: ProcessExecutionRequest) =>
      result(request, { exitCode: request.argv[1] === 'first' ? 9 : 0 })
    );
    const project: JsonObject = {
      completion: { projectChecks: ['first', 'second'] },
      validations: {
        first: validation('first', 'project', 'first'),
        second: validation('second', 'project', 'second'),
      },
      resources: {
        item: {
          validations: {
            test: validation('resource-test', 'attached', 'resource', {
              applicability: { mode: 'always' },
              proof: proof({ kind: 'target', value: 'resource' }),
            }),
          },
        },
      },
    };
    run.mockImplementation(async (request) =>
      result(request, {
        exitCode: request.argv[1] === 'first' ? 9 : 0,
        stdout:
          request.argv[1] === 'resource'
            ? JSON.stringify({ selector: { kind: 'target', value: 'resource' }, executed: 1, passed: 1, failed: 0, source: {} })
            : '',
      })
    );
    const service = new AcceptanceService({
      cueLoader: () => architecture(project),
      commandRunner: { run },
      strictValidation: passedStrictValidation,
    });

    const report = await service.run(root, { scope: { mode: 'project' } });
    expect(run).toHaveBeenCalledTimes(3);
    expect(report.checks.map((check) => [check.id, check.passed])).toEqual([
      ['first', false],
      ['second', true],
      ['resource-test', true],
    ]);
    expect(report.gates.validations).toMatchObject({
      declaredProjectChecks: 2,
      applicableAttachedTests: 1,
      resolved: 3,
      executed: 3,
      status: 'failed',
    });
  });

  it('does not let a passing broad suite hide a targeted resource validation that executes zero tests', async () => {
    const run = vi.fn(async (request: ProcessExecutionRequest) => {
      const broad = request.argv[1] === 'broad';
      return result(request, {
        stdout: JSON.stringify(
          broad
            ? { selector: { kind: 'suite', value: 'all' }, discovered: 20, executed: 20, passed: 20, failed: 0, source: {} }
            : { selector: { kind: 'resource', value: 'storage' }, discovered: 1, executed: 0, passed: 0, failed: 0, skipped: 1, source: {} }
        ),
      });
    });
    const service = new AcceptanceService({
      cueLoader: () =>
        architecture({
          completion: { projectChecks: ['broad'] },
          validations: {
            broad: validation('broad', 'project', 'broad', {
              proof: proof({ kind: 'suite', value: 'all' }),
            }),
          },
          resources: {
            storage: {
              validations: {
                targeted: validation('targeted', 'attached', 'targeted', {
                  applicability: { mode: 'always' },
                  proof: proof({ kind: 'resource', value: 'storage' }),
                }),
              },
            },
          },
        }),
      commandRunner: { run },
      strictValidation: passedStrictValidation,
    });

    const report = await service.run(root, {
      scope: { mode: 'change', change: 'change-a' },
    });
    expect(run).toHaveBeenCalledTimes(2);
    expect(report.passed).toBe(false);
    expect(report.checks[0]).toMatchObject({ id: 'broad', passed: true });
    expect(report.checks[1]).toMatchObject({
      id: 'targeted',
      declaration: {
        kind: 'attached_test',
        owner: 'project.resources.storage',
        location: 'project.resources.storage.validations.targeted',
      },
      processPassed: true,
      passed: false,
    });
    expect(report.checks[1]?.testEvidence?.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'test_evidence_minimum_not_met'
    );
  });

  it('accepts an injected provider while leaving non-test executable checks free of test counts', async () => {
    const registry = new TestEvidenceProviderRegistry().register({
      id: 'custom-provider',
      extract({ proof: declaredProof }) {
        return {
          provider: 'custom-provider',
          selector: declaredProof.selector,
          executed: 1,
          passed: 1,
          failed: 0,
          source: { adapter: 'custom' },
        };
      },
    });
    const run = vi.fn(async (request: ProcessExecutionRequest) => result(request, { stdout: 'not test evidence' }));
    const service = new AcceptanceService({
      cueLoader: () =>
        architecture({
          completion: { projectChecks: ['compile'] },
          validations: { compile: validation('compile', 'project', 'compile') },
          witnesses: {
            custom: {
              validations: {
                test: validation('custom-test', 'attached', 'custom-test', {
                  applicability: { mode: 'always' },
                  proof: proof({ kind: 'witness', value: 'custom' }, 'custom-provider'),
                }),
              },
            },
          },
        }),
      commandRunner: { run },
      testEvidenceRegistry: registry,
      strictValidation: passedStrictValidation,
    });

    const report = await service.run(root, { scope: { mode: 'project' } });
    expect(report.passed).toBe(true);
    expect(report.checks.find((check) => check.id === 'compile')?.testEvidence).toBeUndefined();
    expect(report.checks.find((check) => check.id === 'custom-test')?.testEvidence?.provider).toBe(
      'custom-provider'
    );
  });
});
