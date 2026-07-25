import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  type SkillTemplate,
  getApplyChangeSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getExploreSkillTemplate,
  getFeedbackSkillTemplate,
  getFfChangeSkillTemplate,
  getNewChangeSkillTemplate,
  getOnboardSkillTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getOpsxContinueCommandTemplate,
  getOpsxExploreCommandTemplate,
  getOpsxFfCommandTemplate,
  getOpsxNewCommandTemplate,
  getOpsxOnboardCommandTemplate,
  getOpsxSyncCommandTemplate,
  getOpsxProposeCommandTemplate,
  getOpsxProposeSkillTemplate,
  getOpsxUpdateCommandTemplate,
  getOpsxVerifyCommandTemplate,
  getSyncSpecsSkillTemplate,
  getUpdateChangeSkillTemplate,
  getVerifyChangeSkillTemplate,
} from '../../../src/core/templates/skill-templates.js';
import {
  generateSkillContent,
  getCommandContents,
  getSkillTemplates,
} from '../../../src/core/shared/skill-generation.js';
import { STORE_SELECTION_GUIDANCE } from '../../../src/core/templates/workflows/store-selection.js';

const EXPECTED_FUNCTION_HASHES: Record<string, string> = {
  getExploreSkillTemplate: '911e666f763a2056d9e93e046b82423cf3503b4e5bf4a0090e201ec142a26c84',
  getNewChangeSkillTemplate: '3fc357ec605f6f87bdbfa85bb8fff995ccc0c4879e0f110d086792a0d39034e1',
  getContinueChangeSkillTemplate: 'e55b74732635553979ba60f7c2a1fb1f29077171333051fe1279aae9034455a3',
  getApplyChangeSkillTemplate: '2636486434e2a8cda33c9cbf8cbf857701b8213548d05106a02d587987f435b9',
  getFfChangeSkillTemplate: 'b4bfcb05c0e44afae5d10a63f0aa273c3ba96bfa923d2d811664bf75cb5894c4',
  getSyncSpecsSkillTemplate: '4217d8a9886fccc382f66683abf9754ad0d381914390a940fb7d9951981497d8',
  getOnboardSkillTemplate: '47e29bf0112e7854516ced05e335ce0e59c3747a4fece59d41b8dfc52e221d6e',
  getOpsxExploreCommandTemplate: '7c23f048799bacc83a35a5cc127e26f01e1b15721c5ba5d4f02c9aad2ec229e8',
  getOpsxNewCommandTemplate: 'f88f178126b8add9c75201715e41bcae53d08c0c7c8cd11c2f33d83d75c30465',
  getOpsxContinueCommandTemplate: '1e878b77c3349813172e780d220ffa0ca93f468185186a9dca0a4c82ca608f15',
  getOpsxApplyCommandTemplate: 'f741a06825e6284b2abca583b1782d65fa8bfc1eaf4d56e851ba7b6dd52831c4',
  getOpsxFfCommandTemplate: 'ba5323ef9d28499ccea1b37cad52a748ecd30c237b34b11fceaee95072ef5372',
  getArchiveChangeSkillTemplate: '3d3b87a7da96ffbc9808bb41ceff75e39e4bd5067f81a7df2754cf82b0bc40ac',
  getBulkArchiveChangeSkillTemplate: '87d9b6fe0ba9fdd4fadbc3e0945adb5f00b373ff613ca5604a2a31f3b4ef7527',
  getOpsxSyncCommandTemplate: '6d93eea4ab0048e8b139fee7f96c2c0ac759574d03ba6bbe1cdb387e1bc1ff92',
  getVerifyChangeSkillTemplate: '713cf4d365d97375b972072eccef19e3e2d5857f049b1dc9c2a475706e66224f',
  getOpsxArchiveCommandTemplate: 'b67eaf8fafe5607dc42f1bea370248abe95a2fb63b3d6e32a59f82f29b7b5dae',
  getOpsxOnboardCommandTemplate: '9137f74e07b27e70bc5dc60f3659c8dfaa9667b4d8157d9e02f5423447a1418d',
  getOpsxBulkArchiveCommandTemplate: '095fe76233f9e0dd924068163814cbb371c1f820e1103628eced6fed6fa0f5fc',
  getOpsxVerifyCommandTemplate: '21872c5025f9448a0529d51f0697211980c9fa188fc2dd568712ef6cd2de7f7a',
  getOpsxProposeSkillTemplate: '4a053db3e11691101bc1c4c3130b32114be3b8d9986e39a3f26f6970134c1280',
  getOpsxProposeCommandTemplate: '074a0ab07d347e486433157203525c006fb077da1097da56dedb8dfc228e0d9b',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getUpdateChangeSkillTemplate: '6c3e0d9ab44d9fa3c89eefec46e78d76f45dd11c581cab07fed7c66b51dde547',
  getOpsxUpdateCommandTemplate: '73d78b6067c4dfa76a78a48020d6b6ad438a2adce084934abb258f566d93ca59',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '5559df4703a1d7510b38e7d34b11028c2c974e20e5db11b0797eb73a0dc90614',
  'openspec-new-change': '4d0ef4b0705e171b5c29b9817c2e8927f49ce9987c717b2c7c537ab52fc47a59',
  'openspec-continue-change': '8622f9032ee08507b0271efb014b2e4388cf418f8d384063b74a7201ed590934',
  'openspec-apply-change': 'b5002b1006495b2bfcef76a0a4fbccc48d5313ef4660f790db0b465e8a243b83',
  'openspec-ff-change': '8e57dd19ff4786ce6a097dd524d4a097042e0498af449d6c045698b2b20ee3ec',
  'openspec-sync-specs': '8b647824989f93e8f528fc2ad4a45ec501cb83df4a71b1b6f52b4e75cf227d8c',
  'openspec-archive-change': '803e332dc6d3fe7213c388514e4232a79d4306534546cd3fd7bc8e178ef3a06e',
  'openspec-bulk-archive-change': '58b3b422a222e1e8fedbdd411f2c6b8492774210f337d762879615b1fa9da292',
  'openspec-verify-change': 'e0c551d740474c1a45cab3c4f99bfcf75dee6edb72bbf7ba6f5eb8f71583c070',
  'openspec-onboard': 'c47f7b83ac0b3c7659bda62f98c3bfc9ff47c616a24e79df686c2017d9d38751',
  'openspec-propose': 'e949e1857e6ff8bb4fe28d4f78ea004a0fe4336f556119ef12acb6923c133f4f',
  'openspec-update-change': 'ef92684dd6481a0ba60f26cf814cea02d335fb90973a663e07cedc6290f90cba',
};

// Intentionally excludes getFeedbackSkillTemplate: this list only models templates
// deployed via generateSkillContent, while feedback is covered in function payload parity.
const GENERATED_SKILL_FACTORIES: Array<[string, () => SkillTemplate]> = [
  ['openspec-explore', getExploreSkillTemplate],
  ['openspec-new-change', getNewChangeSkillTemplate],
  ['openspec-continue-change', getContinueChangeSkillTemplate],
  ['openspec-apply-change', getApplyChangeSkillTemplate],
  ['openspec-ff-change', getFfChangeSkillTemplate],
  ['openspec-sync-specs', getSyncSpecsSkillTemplate],
  ['openspec-archive-change', getArchiveChangeSkillTemplate],
  ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
  ['openspec-verify-change', getVerifyChangeSkillTemplate],
  ['openspec-onboard', getOnboardSkillTemplate],
  ['openspec-propose', getOpsxProposeSkillTemplate],
  ['openspec-update-change', getUpdateChangeSkillTemplate],
];

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);

    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe('skill templates split parity', () => {
  it('preserves all template function payloads exactly', () => {
    const functionFactories: Record<string, () => unknown> = {
      getExploreSkillTemplate,
      getNewChangeSkillTemplate,
      getContinueChangeSkillTemplate,
      getApplyChangeSkillTemplate,
      getFfChangeSkillTemplate,
      getSyncSpecsSkillTemplate,
      getOnboardSkillTemplate,
      getOpsxExploreCommandTemplate,
      getOpsxNewCommandTemplate,
      getOpsxContinueCommandTemplate,
      getOpsxApplyCommandTemplate,
      getOpsxFfCommandTemplate,
      getArchiveChangeSkillTemplate,
      getBulkArchiveChangeSkillTemplate,
      getOpsxSyncCommandTemplate,
      getVerifyChangeSkillTemplate,
      getOpsxArchiveCommandTemplate,
      getOpsxOnboardCommandTemplate,
      getOpsxBulkArchiveCommandTemplate,
      getOpsxVerifyCommandTemplate,
      getOpsxProposeSkillTemplate,
      getOpsxProposeCommandTemplate,
      getFeedbackSkillTemplate,
      getUpdateChangeSkillTemplate,
      getOpsxUpdateCommandTemplate,
    };

    const actualHashes = Object.fromEntries(
      Object.entries(functionFactories).map(([name, fn]) => [name, hash(stableStringify(fn()))])
    );

    expect(actualHashes).toEqual(EXPECTED_FUNCTION_HASHES);
  });

  it('preserves generated skill file content exactly', () => {
    const actualHashes = Object.fromEntries(
      GENERATED_SKILL_FACTORIES.map(([dirName, createTemplate]) => [
        dirName,
        hash(generateSkillContent(createTemplate(), 'PARITY-BASELINE')),
      ])
    );

    expect(actualHashes).toEqual(EXPECTED_GENERATED_SKILL_CONTENT_HASHES);
  });

  // Iterating the production registries (not a local list) means a newly
  // added workflow is covered automatically; the full-constant containment
  // check fails if any template's interpolation drifts.
  it('teaches store selection in every deployed skill template', () => {
    for (const { template, dirName } of getSkillTemplates()) {
      const content = generateSkillContent(template, 'PARITY-BASELINE');
      expect(content, dirName).toContain(STORE_SELECTION_GUIDANCE);
    }
  });

  // Auto-approve the OpenSpec CLI: every generated skill carries
  // `allowed-tools: Bash(openspec:*)` so agents that honor it stop prompting
  // on each `openspec` call. Iterating the registry covers new skills too.
  it('pre-approves the openspec CLI via allowed-tools in every deployed skill', () => {
    for (const { template, dirName } of getSkillTemplates()) {
      const content = generateSkillContent(template, 'PARITY-BASELINE');
      expect(content, dirName).toContain('allowed-tools: Bash(openspec:*)');
    }
  });

  it('teaches store selection in every deployed opsx command template', () => {
    for (const entry of getCommandContents()) {
      expect(entry.body, entry.id).toContain(STORE_SELECTION_GUIDANCE);
    }

    // Feedback has no store-capable command and intentionally carries no
    // store teaching; it ships outside both registries.
    expect(getFeedbackSkillTemplate().instructions).not.toContain('**Store selection:**');
  });

  it('generates no workspace-planning residue in any workflow template (4.1)', () => {
    const allSkills: Array<[string, () => SkillTemplate]> = [
      ['openspec-apply-change', getApplyChangeSkillTemplate],
      ['openspec-sync-specs', getSyncSpecsSkillTemplate],
      ['openspec-archive-change', getArchiveChangeSkillTemplate],
      ['openspec-bulk-archive-change', getBulkArchiveChangeSkillTemplate],
      ['openspec-verify-change', getVerifyChangeSkillTemplate],
    ];

    for (const [dirName, createTemplate] of allSkills) {
      const content = generateSkillContent(createTemplate(), 'PARITY-BASELINE');
      expect(content, dirName).not.toContain('workspace-planning');
      expect(content, dirName).not.toContain('Workspace guard');
    }
  });
});
