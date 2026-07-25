import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  EXECUTION_ACCEPTANCE_CONTRACT,
  ARCHITECTURE_DRIFT_GUARD_IDS,
  getApplyChangeSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getOpsxVerifyCommandTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';

interface ReviewFixture {
  id: string;
  pair: string;
  guard: string;
  dialect: string;
  outcome: 'blocking' | 'conforming';
  expectedFinding?: string;
  authority: { cuePath: string; classification: string; premise: string };
  productionTrace: string[];
  contradiction?: string;
  witness: { kind: string; injection: string; assertions: string[]; observed: string };
  repairDirection?: string;
}

const fixturePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'fixtures',
  'adversarial-review',
  'architecture-drift-cases.json'
);
const fixtureDocument = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
  version: string;
  languageNeutral: boolean;
  cases: ReviewFixture[];
};

describe('end-of-execute adversarial acceptance contract', () => {
  it('is embedded verbatim in execute/apply and explicit verify skill and command templates', () => {
    const outputs = [
      getApplyChangeSkillTemplate().instructions,
      getVerifyChangeSkillTemplate().instructions,
      getOpsxApplyCommandTemplate().content,
      getOpsxVerifyCommandTemplate().content,
    ];

    for (const output of outputs) {
      expect(output).toContain(EXECUTION_ACCEPTANCE_CONTRACT);
      expect(output).toContain('Read the evaluated CUE context before');
      expect(output).toContain('DEFERRED_SCOPE');
      expect(output).toContain('Missing deferred functionality is never a blocker');
      expect(output).toContain('openspec acceptance "<name>" --json');
      expect(output).toContain('architecture-conformance matrix');
      expect(output).toContain('exact controlled proof command');
    }
  });

  it('keeps archive and bulk archive approval-focused without rerunning acceptance', () => {
    const outputs = [
      getArchiveChangeSkillTemplate().instructions,
      getBulkArchiveChangeSkillTemplate().instructions,
      getOpsxArchiveCommandTemplate().content,
      getOpsxBulkArchiveCommandTemplate().content,
    ];

    for (const output of outputs) {
      expect(output).not.toContain(EXECUTION_ACCEPTANCE_CONTRACT);
      expect(output).toContain('Acceptance belongs at the end');
      expect(output).toContain('Do not run the shared adversarial review');
    }
  });

  it('contains every guard and keeps deterministic acceptance free of source-language inference', () => {
    for (const guard of ARCHITECTURE_DRIFT_GUARD_IDS) {
      expect(EXECUTION_ACCEPTANCE_CONTRACT).toContain(`#### ${guard}`);
    }
    expect(EXECUTION_ACCEPTANCE_CONTRACT).toContain('A broad suite cannot rehabilitate a targeted validation that selects zero tests');
    expect(EXECUTION_ACCEPTANCE_CONTRACT).toContain('evidence for a broad or different selector cannot satisfy the targeted declaration');
    expect(EXECUTION_ACCEPTANCE_CONTRACT).toContain('Do not add AST assumptions');
    expect(EXECUTION_ACCEPTANCE_CONTRACT).toContain('must declare an executable validation or explicit provider');
  });

  it('exercises every requested violation with an evidence-complete conforming counterpart', () => {
    expect(fixtureDocument.version).toBe('1.0');
    expect(fixtureDocument.languageNeutral).toBe(true);
    expect(new Set(fixtureDocument.cases.map((fixture) => fixture.dialect))).toEqual(
      new Set(['neutral-trace-v1', 'neutral-sequence-v1'])
    );

    const requiredPairs = [
      'composition-internal-selection',
      'composition-test-only-port',
      'negotiation-default-first',
      'negotiation-capacity-loss',
      'async-post-start-ignored',
      'observability-caller-discards',
      'observability-nonmutation-only',
    ];

    for (const pair of requiredPairs) {
      const fixtures = fixtureDocument.cases.filter((fixture) => fixture.pair === pair);
      expect(fixtures.map((fixture) => fixture.outcome).sort(), pair).toEqual([
        'blocking',
        'conforming',
      ]);
    }

    for (const fixture of fixtureDocument.cases) {
      expect(ARCHITECTURE_DRIFT_GUARD_IDS, fixture.id).toContain(fixture.guard);
      expect(fixture.authority.cuePath, fixture.id).toMatch(/^project\./);
      expect(['CURRENT_SLICE', 'EVERGREEN_INVARIANT'], fixture.id).toContain(
        fixture.authority.classification
      );
      expect(fixture.authority.premise.length, fixture.id).toBeGreaterThan(0);
      expect(fixture.productionTrace.length, fixture.id).toBeGreaterThan(1);
      expect(fixture.witness.injection.length, fixture.id).toBeGreaterThan(0);
      expect(fixture.witness.assertions.length, fixture.id).toBeGreaterThan(0);
      expect(fixture.witness.observed.length, fixture.id).toBeGreaterThan(0);

      if (fixture.outcome === 'blocking') {
        expect([
          'BLOCKING_CURRENT_VIOLATION',
          'BLOCKING_EVERGREEN_VIOLATION',
          'BLOCKING_REQUIRED_PROOF_GAP',
        ], fixture.id).toContain(fixture.expectedFinding);
        expect(fixture.contradiction?.length, fixture.id).toBeGreaterThan(0);
        expect(fixture.repairDirection?.length, fixture.id).toBeGreaterThan(0);
      } else {
        expect(fixture.expectedFinding, fixture.id).toBeUndefined();
        expect(fixture.contradiction, fixture.id).toBeUndefined();
      }
    }
  });
});
