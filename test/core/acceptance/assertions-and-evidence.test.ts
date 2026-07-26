import { describe, expect, it } from 'vitest';

import {
  AssertionEvaluatorRegistry,
  createDefaultAssertionRegistry,
  evaluateAssertions,
} from '../../../src/core/acceptance/assertions.js';
import {
  TestEvidenceProviderRegistry,
  createDefaultTestEvidenceRegistry,
  extractTestEvidence,
} from '../../../src/core/acceptance/test-evidence.js';
import type {
  ProcessResult,
  TestEvidence,
  TestSuiteProof,
} from '../../../src/core/acceptance/types.js';

function processResult(stdout = '', stderr = '', exitCode: number | null = 0): ProcessResult {
  return {
    argv: ['neutral-check'],
    cwd: '/canonical/project',
    limits: { timeoutMs: 1000, stdoutBytes: 4096, stderrBytes: 4096 },
    durationMs: 3,
    termination: exitCode === null ? 'signaled' : 'exited',
    exitCode,
    signal: exitCode === null ? 'SIGTERM' : null,
    timedOut: false,
    outputLimitExceeded: [],
    stdout,
    stderr,
    stdoutTruncated: false,
    stderrTruncated: false,
  };
}

function proof(selector: unknown = { kind: 'target', value: 'resource-a' }): TestSuiteProof {
  return {
    type: 'test-suite',
    provider: 'structured-json-v1',
    minimumExecuted: 1,
    selector: selector as TestSuiteProof['selector'],
    options: { stream: 'stdout' },
  };
}

describe('assertion evaluators', () => {
  it('evaluates every declared generic process assertion in order', async () => {
    const results = await evaluateAssertions(
      [
        { type: 'exit-code', equals: 0 },
        { type: 'stdout-contains', value: 'ready' },
        { type: 'stdout-not-contains', value: 'panic' },
        { type: 'stderr-contains', value: 'notice' },
        { type: 'stderr-not-contains', value: 'fatal' },
      ],
      processResult('ready', 'notice'),
      createDefaultAssertionRegistry()
    );

    expect(results).toHaveLength(5);
    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.map((result) => result.index)).toEqual([1, 2, 3, 4, 5]);
  });

  it('fails unsupported, malformed, false, and throwing assertions without skipping later entries', async () => {
    const registry = createDefaultAssertionRegistry().register({
      type: 'throws',
      evaluate() {
        throw new Error('provider exploded');
      },
    });
    const results = await evaluateAssertions(
      [
        { type: 'unknown' },
        { type: 'exit-code', equals: 'zero' },
        { type: 'stdout-contains', value: 'missing' },
        { type: 'throws' },
        { type: 'exit-code', equals: 0 },
      ],
      processResult('present'),
      registry
    );

    expect(results.map((result) => result.passed)).toEqual([false, false, false, false, true]);
    expect(results.map((result) => result.diagnostic?.code)).toEqual([
      'assertion_unsupported',
      'assertion_malformed',
      'assertion_failed',
      'assertion_evaluator_error',
      undefined,
    ]);
  });

  it('rejects duplicate and empty evaluator registrations deterministically', () => {
    const registry = new AssertionEvaluatorRegistry();
    registry.register({ type: 'custom', evaluate: (_declaration, _process, index) => ({ index, type: 'custom', passed: true }) });
    expect(() => registry.register({ type: 'custom', evaluate: (_declaration, _process, index) => ({ index, type: 'custom', passed: true }) })).toThrow('already registered');
    expect(() => registry.register({ type: ' ', evaluate: (_declaration, _process, index) => ({ index, type: ' ', passed: true }) })).toThrow('must not be empty');
  });
});

describe('test evidence providers', () => {
  it('accepts a positive runner-neutral JSON document bound to the exact selector', async () => {
    const declared = proof({ value: 'resource-a', kind: 'target' });
    const result = await extractTestEvidence(
      declared,
      processResult(
        JSON.stringify({
          selector: { kind: 'target', value: 'resource-a' },
          discovered: 3,
          executed: 2,
          passed: 2,
          failed: 0,
          skipped: 1,
          source: { report: 'neutral-fixture' },
        })
      ),
      createDefaultTestEvidenceRegistry()
    );

    expect(result.status).toBe('passed');
    expect(result.selector).toEqual(declared.selector);
    expect(result.evidence?.executed).toBe(2);
    expect(result.evidence?.selector).toEqual(declared.selector);
  });

  it('fails a zero-execution report even when the process succeeded', async () => {
    const result = await extractTestEvidence(
      proof(),
      processResult(JSON.stringify({ selector: { kind: 'target', value: 'resource-a' }, executed: 0, passed: 0, failed: 0, source: {} })),
      createDefaultTestEvidenceRegistry()
    );

    expect(result.status).toBe('failed');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'test_evidence_minimum_not_met'
    );
  });

  it('rejects broad-run evidence for a different targeted selector', async () => {
    const result = await extractTestEvidence(
      proof({ kind: 'target', value: 'resource-a' }),
      processResult(JSON.stringify({ selector: { kind: 'suite', value: 'all' }, executed: 50, passed: 50, failed: 0, source: {} })),
      createDefaultTestEvidenceRegistry()
    );

    expect(result.status).toBe('failed');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'test_evidence_selector_mismatch'
    );
  });

  it.each([
    [{ source: {}, selector: { kind: 'target', value: 'resource-a' } }, 'test_evidence_malformed'],
    [{ executed: -1, source: {}, selector: { kind: 'target', value: 'resource-a' } }, 'test_evidence_malformed'],
    [{ executed: 2, passed: 2, failed: 1, source: {}, selector: { kind: 'target', value: 'resource-a' } }, 'test_evidence_inconsistent'],
    [{ discovered: 1, executed: 2, source: {}, selector: { kind: 'target', value: 'resource-a' } }, 'test_evidence_inconsistent'],
    [{ executed: 1, passed: 0, failed: 1, source: {}, selector: { kind: 'target', value: 'resource-a' } }, 'test_evidence_failed_tests'],
  ])('fails malformed or inconsistent counts %#', async (document, expectedCode) => {
    const result = await extractTestEvidence(
      proof(),
      processResult(JSON.stringify(document)),
      createDefaultTestEvidenceRegistry()
    );
    expect(result.status).toBe('failed');
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(expectedCode);
  });

  it('reads one complete evidence document from the explicitly selected stderr stream', async () => {
    const declared = { ...proof(), options: { stream: 'stderr' } };
    const result = await extractTestEvidence(
      declared,
      processResult(
        'unselected stdout',
        JSON.stringify({
          selector: declared.selector,
          executed: 1,
          passed: 1,
          failed: 0,
          source: { channel: 'stderr' },
        })
      ),
      createDefaultTestEvidenceRegistry()
    );

    expect(result.status).toBe('passed');
    expect(result.evidence?.source).toMatchObject({ stream: 'stderr' });
  });

  it('fails unsupported and provider-error paths explicitly', async () => {
    const unsupported = await extractTestEvidence(
      { ...proof(), provider: 'missing-provider' },
      processResult('{}'),
      createDefaultTestEvidenceRegistry()
    );
    const malformed = await extractTestEvidence(
      proof(),
      processResult('not one JSON document'),
      createDefaultTestEvidenceRegistry()
    );

    expect(unsupported.diagnostics[0]?.code).toBe('test_evidence_provider_unsupported');
    expect(unsupported.selector).toEqual(proof().selector);
    expect(malformed.diagnostics[0]?.code).toBe('test_evidence_provider_error');
    expect(malformed.selector).toEqual(proof().selector);
  });

  it('fails non-JSON provider evidence without making the result unserializable', async () => {
    const cyclicSource: Record<string, unknown> = {};
    cyclicSource.self = cyclicSource;
    const registry = new TestEvidenceProviderRegistry().register({
      id: 'non-json-provider',
      extract({ proof: selectedProof }) {
        return {
          provider: 'non-json-provider',
          selector: selectedProof.selector,
          executed: 1,
          source: cyclicSource,
        } as unknown as TestEvidence;
      },
    });

    const result = await extractTestEvidence(
      { ...proof(), provider: 'non-json-provider' },
      processResult('ignored'),
      registry
    );

    expect(result.status).toBe('failed');
    expect(result.evidence).toBeUndefined();
    expect(result.diagnostics[0]?.code).toBe('test_evidence_malformed');
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it('supports a custom provider without changing orchestration types', async () => {
    const registry = new TestEvidenceProviderRegistry().register({
      id: 'custom-neutral',
      extract({ proof: selectedProof }): TestEvidence {
        return {
          provider: 'custom-neutral',
          selector: selectedProof.selector,
          executed: 1,
          passed: 1,
          failed: 0,
          source: { adapter: 'test-only' },
        };
      },
    });
    const result = await extractTestEvidence(
      { ...proof(), provider: 'custom-neutral' },
      processResult('ignored'),
      registry
    );

    expect(result.status).toBe('passed');
    expect(registry.list()).toEqual(['custom-neutral']);
    expect(() => registry.register({ id: 'custom-neutral', extract: () => { throw new Error('unused'); } })).toThrow('already registered');
  });
});
