import { mkdtemp, realpath, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveValidationInventory } from '../../../src/core/acceptance/validation-inventory.js';
import type { JsonObject } from '../../../src/core/cue-architecture.js';

const LIMITS = { timeoutMs: 1_000, stdoutBytes: 4_096, stderrBytes: 4_096 };

function executable(id: string, scope: 'project' | 'attached', extra: JsonObject = {}): JsonObject {
  return {
    id,
    scope,
    command: [process.execPath, '-e', 'process.exit(0)'],
    workingDirectory: '.',
    limits: LIMITS,
    assertions: [{ type: 'exit-code', equals: 0 }],
    ...extra,
  };
}

function attached(id: string, applicability: JsonObject = { mode: 'always' }): JsonObject {
  return executable(id, 'attached', {
    applicability,
    proof: {
      type: 'test-suite',
      provider: 'structured-json-v1',
      minimumExecuted: 1,
      selector: { kind: 'resource', value: id },
      options: { stream: 'stdout' },
    },
  });
}

function attachedRuntime(
  id: string,
  proofOverrides: JsonObject = {},
  applicability: JsonObject = { mode: 'always' }
): JsonObject {
  return executable(id, 'attached', {
    applicability,
    proof: {
      type: 'runtime-session',
      provider: 'process-lifecycle-v1',
      role: 'external-process-lifecycle',
      entryPoint: 'fixture production command',
      boundary: 'external-process',
      environment: 'synthetic',
      lifecycle: 'bounded',
      successCondition: 'done exactly once then exit',
      terminationOwner: 'process',
      resources: [
        { id: 'process', type: 'process', disposition: 'release', owner: 'fixture' },
      ],
      stdioMode: 'pipe',
      timeouts: {
        startupTimeoutMs: 100,
        progressSilenceMs: 100,
        completionTimeoutMs: 500,
        completionToExitGraceMs: 100,
        teardownGraceMs: 200,
        hardTimeoutMs: 800,
      },
      progress: [
        { id: 'progress', stream: 'stdout', contains: 'PROGRESS', minimumCount: 1 },
      ],
      completion: [
        { id: 'done', stream: 'stdout', contains: 'DONE', exactCount: 1 },
      ],
      requireExitCode: 0,
      requireNoDescendants: true,
      requiredCapabilities: [],
      interactions: [],
      ...proofOverrides,
    },
  });
}

describe('resolveValidationInventory', () => {
  let root: string;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'openspec-validation-inventory-')));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('combines project checks with every applicable nested test declaration and records exact provenance', () => {
    const project: JsonObject = {
      name: 'example',
      completion: { projectChecks: ['validation.project'] },
      validations: { project: executable('validation.project', 'project') },
      resources: {
        storage: { validations: { test: attached('validation.storage') } },
      },
      relationships: [
        {
          from: 'service.example',
          to: 'port.storage',
          validations: [attached('validation.relationship')],
        },
      ],
      capabilities: {
        synchronize: { validations: { test: attached('validation.capability') } },
      },
      invariants: [
        { name: 'bounded-capacity', validations: [attached('validation.invariant')] },
      ],
      witnesses: {
        behavior: { validations: { test: attached('validation.witness') } },
      },
      acceptance: {
        assets: {
          release: { validations: { test: attached('validation.acceptance-asset') } },
        },
      },
    };

    const result = resolveValidationInventory(project, root, {
      mode: 'change',
      change: 'add-example',
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.projectCheckReferenceCount).toBe(1);
    expect(result.applicableAttachedTestCount).toBe(6);
    expect(result.checks.map((check) => check.id)).toEqual([
      'validation.project',
      'validation.acceptance-asset',
      'validation.capability',
      'validation.invariant',
      'validation.relationship',
      'validation.storage',
      'validation.witness',
    ]);
    expect(result.checks[0]?.declaration).toEqual({
      kind: 'project_check',
      location: 'project.validations.project',
      owner: 'project.example',
    });
    expect(
      Object.fromEntries(
        result.checks.slice(1).map((check) => [check.id, check.declaration])
      )
    ).toEqual({
      'validation.acceptance-asset': {
        kind: 'attached_test',
        location: 'project.acceptance.assets.release.validations.test',
        owner: 'project.acceptance.assets.release',
      },
      'validation.capability': {
        kind: 'attached_test',
        location: 'project.capabilities.synchronize.validations.test',
        owner: 'project.capabilities.synchronize',
      },
      'validation.invariant': {
        kind: 'attached_test',
        location: 'project.invariants[0].validations[0]',
        owner: 'project.invariants[0]',
      },
      'validation.relationship': {
        kind: 'attached_test',
        location: 'project.relationships[0].validations[0]',
        owner: 'project.relationships[0]',
      },
      'validation.storage': {
        kind: 'attached_test',
        location: 'project.resources.storage.validations.test',
        owner: 'project.resources.storage',
      },
      'validation.witness': {
        kind: 'attached_test',
        location: 'project.witnesses.behavior.validations.test',
        owner: 'project.witnesses.behavior',
      },
    });
    expect(result.checks.every((check) => check.cwd === root)).toBe(true);
  });

  it('uses explicit change applicability and conservatively includes every declared change in project scope', () => {
    const project: JsonObject = {
      resources: {
        selected: {
          validations: {
            test: attached('validation.selected', {
              mode: 'changes',
              changes: ['other-change'],
            }),
          },
        },
      },
    };

    const change = resolveValidationInventory(project, root, {
      mode: 'change',
      change: 'selected-change',
    });
    const release = resolveValidationInventory(project, root, { mode: 'project' });

    expect(change.declared).toBe(true);
    expect(change.applicableAttachedTestCount).toBe(0);
    expect(change.checks).toEqual([]);
    expect(change.diagnostics).toEqual([]);
    expect(release.applicableAttachedTestCount).toBe(1);
    expect(release.checks.map((check) => check.id)).toEqual(['validation.selected']);
  });

  it('inventories each applicable attached runtime session independently with exact provenance', () => {
    const project: JsonObject = {
      resources: {
        runtime: {
          validations: {
            lifecycle: attachedRuntime('validation.runtime', {}, {
              mode: 'changes',
              changes: ['runtime-change'],
            }),
          },
        },
      },
    };

    const selected = resolveValidationInventory(project, root, {
      mode: 'change',
      change: 'runtime-change',
    });
    const unrelated = resolveValidationInventory(project, root, {
      mode: 'change',
      change: 'other-change',
    });

    expect(selected.diagnostics).toEqual([]);
    expect(selected.applicableAttachedTestCount).toBe(0);
    expect(selected.applicableAttachedRuntimeSessionCount).toBe(1);
    expect(selected.checks[0]).toMatchObject({
      id: 'validation.runtime',
      declaration: {
        kind: 'attached_runtime',
        owner: 'project.resources.runtime',
        location: 'project.resources.runtime.validations.lifecycle',
      },
      proof: {
        type: 'runtime-session',
        provider: 'process-lifecycle-v1',
        boundary: 'external-process',
        lifecycle: 'bounded',
      },
    });
    expect(unrelated.applicableAttachedRuntimeSessionCount).toBe(0);
    expect(unrelated.checks).toEqual([]);
  });

  it('rejects dishonest runtime and test-suite proof roles before execution', () => {
    const dryRun = attachedRuntime('validation.dry-run', {
      role: 'target-reachability',
    });
    const externalTest = attached('validation.fake-window');
    (externalTest.proof as JsonObject).role = 'external-process-lifecycle';
    const result = resolveValidationInventory(
      {
        resources: {
          runtime: { validations: { dryRun, externalTest } },
        },
      },
      root,
      { mode: 'project' }
    );

    expect(result.checks).toEqual([]);
    expect(
      result.diagnostics.filter(
        (entry) => entry.code === 'validation_proof_role_mismatch'
      )
    ).toHaveLength(2);
  });

  it('records reachability/static roles while requiring runtime proof for external roles', () => {
    const project: JsonObject = {
      completion: { projectChecks: ['reachability', 'external'] },
      validations: {
        reachability: {
          ...executable('reachability', 'project'),
          proofRole: 'target-reachability',
        },
        external: {
          ...executable('external', 'project'),
          proofRole: 'external-process-lifecycle',
        },
      },
    };
    const result = resolveValidationInventory(project, root, { mode: 'project' });

    expect(result.checks).toHaveLength(1);
    expect(result.checks[0]).toMatchObject({
      id: 'reachability',
      proofRole: 'target-reachability',
    });
    expect(result.diagnostics.map((entry) => entry.code)).toContain(
      'validation_proof_role_mismatch'
    );
  });

  it('rejects persistent lifecycle without controller teardown and PTY stderr markers', () => {
    const persistent = attachedRuntime('validation.persistent', {
      lifecycle: 'service-persistent',
      resources: [
        {
          id: 'service',
          type: 'service',
          disposition: 'retain-during-readiness',
          owner: 'fixture',
        },
      ],
    });
    const ptyStderr = attachedRuntime('validation.pty-stderr', {
      stdioMode: 'pty',
      completion: [
        { id: 'done', stream: 'stderr', contains: 'DONE', exactCount: 1 },
      ],
    });
    const result = resolveValidationInventory(
      { resources: { runtime: { validations: { persistent, ptyStderr } } } },
      root,
      { mode: 'project' }
    );
    const codes = result.diagnostics.map((entry) => entry.code);

    expect(codes).toContain('runtime_teardown_missing');
    expect(codes).toContain('runtime_pty_stream_mismatch');
    expect(result.checks).toEqual([]);
  });

  it('fails closed for missing applicability, orphaned references, duplicate identities, and ambiguous owners', () => {
    const missingApplicability = attached('validation.duplicate');
    delete missingApplicability.applicability;
    const project: JsonObject = {
      completion: { projectChecks: ['validation.project'] },
      validations: {
        project: executable('validation.project', 'project'),
        duplicate: executable('validation.duplicate', 'project'),
      },
      resources: {
        first: {
          validations: [missingApplicability, 'validation.orphan'],
        },
        second: {
          validations: { test: attached('validation.duplicate') },
        },
      },
    };

    const result = resolveValidationInventory(project, root, {
      mode: 'change',
      change: 'add-example',
    });
    const codes = result.diagnostics.map((diagnostic) => diagnostic.code);

    expect(codes).toContain('validation_applicability_missing');
    expect(codes).toContain('validation_evidence_reference_orphaned');
    expect(codes).toContain('validation_identity_ambiguous_owner');
    expect(result.checks.filter((check) => check.id === 'validation.duplicate')).toHaveLength(1);
  });

  it.each([
    [{ completion: { projectChecks: ['missing'] }, validations: {} }, 'project_check_reference_missing'],
    [{ completion: { projectChecks: ['x', 'x'] }, validations: { x: executable('x', 'project') } }, 'project_check_reference_duplicate'],
    [{ completion: { projectChecks: ['x'] }, validations: { x: executable('x', 'attached') } }, 'validation_scope_invalid'],
    [{ completion: { projectChecks: [42] }, validations: {} }, 'project_check_reference_malformed'],
    [
      {
        resources: {
          item: {
            validations: {
              test: { ...attached('x'), applicability: { mode: 'sometimes' } },
            },
          },
        },
      },
      'validation_applicability_malformed',
    ],
  ] as Array<[JsonObject, string]>)('rejects malformed declaration case %#', (project, code) => {
    const result = resolveValidationInventory(project, root, {
      mode: 'change',
      change: 'change-a',
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(code);
  });

  it('rejects a project-check identity that resolves to multiple project declarations', () => {
    const project: JsonObject = {
      completion: { projectChecks: ['ambiguous'] },
      validations: [
        executable('ambiguous', 'project'),
        executable('ambiguous', 'project'),
      ],
    };

    const result = resolveValidationInventory(project, root, { mode: 'project' });
    const codes = result.diagnostics.map((diagnostic) => diagnostic.code);

    expect(codes).toContain('validation_identity_ambiguous_owner');
    expect(codes).toContain('project_check_reference_ambiguous');
    expect(result.checks).toEqual([]);
  });

  it('defaults test proof to one executed test and rejects a lower declared minimum', () => {
    const defaultProof = attached('default-minimum');
    delete (defaultProof.proof as JsonObject).minimumExecuted;
    const defaulted = resolveValidationInventory(
      { resources: { item: { validations: { test: defaultProof } } } },
      root,
      { mode: 'project' }
    );

    expect(defaulted.diagnostics).toEqual([]);
    expect(defaulted.checks[0]?.proof?.minimumExecuted).toBe(1);

    const invalidProof = attached('invalid-minimum');
    (invalidProof.proof as JsonObject).minimumExecuted = 0;
    const invalid = resolveValidationInventory(
      { resources: { item: { validations: { test: invalidProof } } } },
      root,
      { mode: 'project' }
    );

    expect(invalid.checks).toEqual([]);
    expect(invalid.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'validation_proof_malformed'
    );
  });

  it('rejects working directories that resolve outside the canonical root', () => {
    const project: JsonObject = {
      completion: { projectChecks: ['x'] },
      validations: {
        x: { ...executable('x', 'project'), workingDirectory: '..' },
      },
    };

    const result = resolveValidationInventory(project, root, { mode: 'project' });
    expect(result.checks).toEqual([]);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'validation_working_directory_outside_root'
    );
  });

  it('canonicalizes an alias root and preserves one filesystem identity', async () => {
    const alias = path.join(path.dirname(root), `${path.basename(root)} alias`);
    await symlink(root, alias, process.platform === 'win32' ? 'junction' : 'dir');
    try {
      const project: JsonObject = {
        completion: { projectChecks: ['x'] },
        validations: { x: executable('x', 'project') },
      };
      const result = resolveValidationInventory(project, alias, { mode: 'project' });
      expect(result.diagnostics).toEqual([]);
      expect(result.checks[0]?.cwd).toBe(await realpath(root));
    } finally {
      await rm(alias, { force: true });
    }
  });

  it('keeps legacy evaluated CUE without project checks or attached test proof not applicable', () => {
    const result = resolveValidationInventory(
      { resources: { example: { validations: { note: { id: 'non-executable' } } } } },
      root,
      { mode: 'project' }
    );
    expect(result).toEqual({
      declared: false,
      projectCheckReferenceCount: 0,
      applicableAttachedTestCount: 0,
      applicableAttachedRuntimeSessionCount: 0,
      checks: [],
      diagnostics: [],
    });
  });
});
