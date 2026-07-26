#!/usr/bin/env node

import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const checkerPath = path.join(fixtureDir, 'neutral-check.mjs');
const runtimeFixturePath = path.join(fixtureDir, 'runtime-session-fixture.mjs');
const interactionDriverPath = path.join(fixtureDir, 'runtime-interaction-driver.mjs');

const limits = {
  timeoutMs: 5000,
  stdoutBytes: 262144,
  stderrBytes: 262144,
};

function executable(id, tag, extra = {}) {
  return {
    id,
    scope: 'project',
    command: [process.execPath, checkerPath, tag.mode, tag.selector, String(tag.executed ?? 1)],
    workingDirectory: '.',
    limits,
    assertions: [{ type: 'exit-code', equals: 0 }],
    ...extra,
  };
}

function testProof(selector, provider = 'structured-json-v1') {
  return {
    type: 'test-suite',
    provider,
    minimumExecuted: 1,
    selector: { kind: 'fixture', value: selector },
    options: { stream: 'stdout' },
  };
}

function runtimeProof(overrides = {}) {
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
      progressSilenceMs: 300,
      completionTimeoutMs: 1200,
      completionToExitGraceMs: 100,
      teardownGraceMs: 400,
      hardTimeoutMs: 1600,
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

function runtimeValidation(mode, proofOverrides = {}, extraArguments = []) {
  return {
    id: `fixture.runtime-${mode}`,
    scope: 'attached',
    command: [process.execPath, runtimeFixturePath, mode, ...extraArguments],
    workingDirectory: '.',
    limits,
    assertions: [{ type: 'exit-code', equals: 0 }],
    applicability: { mode: 'always' },
    proof: runtimeProof(proofOverrides),
  };
}

function projectFor(kind, root) {
  if (kind === 'passing') {
    return {
      name: 'acceptance-fixture',
      completion: { projectChecks: ['fixture.broad'] },
      validations: {
        broad: executable(
          'fixture.broad',
          { mode: 'evidence', selector: 'suite:all', executed: 2 },
          { proof: testProof('suite:all') }
        ),
      },
      resources: {
        storage: {
          validations: {
            targeted: {
              ...executable(
                'fixture.storage',
                { mode: 'evidence', selector: 'resource:storage', executed: 1 },
                { proof: testProof('resource:storage') }
              ),
              scope: 'attached',
              applicability: { mode: 'always' },
            },
          },
        },
      },
    };
  }

  if (kind === 'failing') {
    return {
      name: 'acceptance-fixture',
      completion: { projectChecks: ['fixture.failure'] },
      validations: {
        failure: executable('fixture.failure', {
          mode: 'nonzero',
          selector: 'unused',
        }),
      },
    };
  }

  if (kind === 'unsupported-provider') {
    return {
      name: 'acceptance-fixture',
      completion: { projectChecks: ['fixture.unsupported'] },
      validations: {
        unsupported: executable(
          'fixture.unsupported',
          { mode: 'evidence', selector: 'suite:all', executed: 1 },
          { proof: testProof('suite:all', 'fixture-provider-not-installed') }
        ),
      },
    };
  }

  if (kind === 'zero-test') {
    return {
      name: 'acceptance-fixture',
      completion: { projectChecks: ['fixture.broad'] },
      validations: {
        broad: executable(
          'fixture.broad',
          { mode: 'evidence', selector: 'suite:all', executed: 3 },
          { proof: testProof('suite:all') }
        ),
      },
      resources: {
        storage: {
          validations: {
            targeted: {
              ...executable(
                'fixture.storage-zero',
                { mode: 'evidence', selector: 'resource:storage', executed: 0 },
                { proof: testProof('resource:storage') }
              ),
              scope: 'attached',
              applicability: { mode: 'changes', changes: ['demo'] },
            },
          },
        },
      },
    };
  }

  if (kind === 'selector-mismatch') {
    return {
      name: 'acceptance-fixture',
      completion: { projectChecks: ['fixture.broad'] },
      validations: {
        broad: executable(
          'fixture.broad',
          { mode: 'evidence', selector: 'suite:all', executed: 4 },
          { proof: testProof('suite:all') }
        ),
      },
      resources: {
        storage: {
          validations: {
            targeted: {
              ...executable(
                'fixture.storage-mismatch',
                { mode: 'mismatch', selector: 'resource:storage', executed: 4 },
                { proof: testProof('resource:storage') }
              ),
              scope: 'attached',
              applicability: { mode: 'always' },
            },
          },
        },
      },
    };
  }

  if (kind === 'runtime-passing' || kind === 'runtime-resident') {
    const mode = kind === 'runtime-passing' ? 'clean' : 'success-hang';
    return {
      name: 'acceptance-runtime-fixture',
      resources: {
        runtime: {
          validations: { lifecycle: runtimeValidation(mode) },
        },
      },
    };
  }

  if (kind === 'runtime-capability-unavailable') {
    return {
      name: 'acceptance-runtime-fixture',
      resources: {
        runtime: {
          validations: {
            lifecycle: runtimeValidation('clean', {
              environment: 'physical',
              requiredCapabilities: ['fixture-physical-device'],
            }),
          },
        },
      },
    };
  }

  if (kind === 'runtime-nonexecution') {
    return {
      name: 'acceptance-runtime-fixture',
      resources: {
        runtime: {
          validations: {
            lifecycle: runtimeValidation(
              'success-hang',
              {},
              ['--started', path.join(root, 'runtime-started')]
            ),
          },
        },
      },
    };
  }

  if (kind === 'runtime-interaction-passing' || kind === 'runtime-interaction-mismatch') {
    const seamPath = path.join(root, 'interaction-seam.json');
    const mode = kind === 'runtime-interaction-passing' ? 'pass' : 'before-window';
    return {
      name: 'acceptance-runtime-fixture',
      resources: {
        runtime: {
          validations: {
            interaction: runtimeValidation(
              'interaction',
              {
                role: 'production-composition-runtime',
                boundary: 'production-composition',
                progress: [
                  {
                    id: 'window-open',
                    stream: 'stdout',
                    contains: 'WINDOW_OPEN',
                    minimumCount: 1,
                  },
                ],
                completion: [
                  {
                    id: 'window-close',
                    stream: 'stdout',
                    contains: 'WINDOW_CLOSE',
                    exactCount: 1,
                  },
                  {
                    id: 'summary',
                    stream: 'stdout',
                    contains: 'FINAL_SUMMARY',
                    exactCount: 1,
                  },
                ],
                interactions: [
                  {
                    id: 'mapped-input',
                    provider: 'process-json-v1',
                    opensAfter: 'window-open',
                    closesBefore: 'window-close',
                    request: {
                      command: [process.execPath, interactionDriverPath],
                      timeoutMs: 800,
                      payload: { seamPath, action: 'mapped-input', mode },
                    },
                    requiredAssertions: ['isolation-preserved'],
                  },
                ],
              },
              ['--seam', seamPath]
            ),
          },
        },
      },
    };
  }

  throw new Error(`Unknown acceptance fixture kind '${kind}'.`);
}

export async function createAcceptanceFixtureProject(target, kind) {
  const root = path.resolve(target);
  const changeDir = path.join(root, 'openspec', 'changes', 'demo');
  await rm(root, { recursive: true, force: true });
  await mkdir(path.join(changeDir, 'specs', 'fixture-capability'), { recursive: true });
  await mkdir(path.join(root, 'openspec', 'specs'), { recursive: true });
  await mkdir(path.join(root, 'spec'), { recursive: true });

  await writeFile(path.join(root, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
  await writeFile(
    path.join(changeDir, 'proposal.md'),
    '# Change: Acceptance fixture\n\n## Why\n\nThis self-contained fixture exercises deterministic acceptance.\n\n## What Changes\n\n- Add a neutral acceptance fixture.\n\n## Impact\n\n- Affected specs: fixture-capability\n'
  );
  await writeFile(
    path.join(changeDir, 'specs', 'fixture-capability', 'spec.md'),
    '## ADDED Requirements\n\n### Requirement: Fixture SHALL produce neutral evidence\nThe fixture SHALL produce deterministic neutral evidence.\n\n#### Scenario: Produce evidence\n- **GIVEN** a configured fixture\n- **WHEN** acceptance executes it\n- **THEN** structured evidence is returned\n'
  );
  await writeFile(path.join(changeDir, 'tasks.md'), '- [x] Exercise deterministic acceptance\n');
  await writeFile(
    path.join(root, 'spec', 'project.cue'),
    `package acceptance\n\nproject: ${JSON.stringify(projectFor(kind, root), null, 2)}\n`
  );
  return root;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [target, kind] = process.argv.slice(2);
  if (!target || !kind) {
    process.stderr.write('usage: node create-project.mjs <target> <passing|failing|unsupported-provider|zero-test|selector-mismatch|runtime-passing|runtime-resident|runtime-capability-unavailable|runtime-nonexecution|runtime-interaction-passing|runtime-interaction-mismatch>\n');
    process.exitCode = 2;
  } else {
    await createAcceptanceFixtureProject(target, kind);
    process.stdout.write(`${path.resolve(target)}\n`);
  }
}
