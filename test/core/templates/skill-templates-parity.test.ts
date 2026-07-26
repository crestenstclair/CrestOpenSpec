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
  getContinueChangeSkillTemplate: '27cb8fe05f351ed8d9cfeef6eb56b9e6a71c25d3685bb6b02e67dbe9513f6e5b',
  getApplyChangeSkillTemplate: 'ff0052c8050fd5eb454dd52749797ad2a54f7b25fdd0b1ea5f12b4aacecd8826',
  getFfChangeSkillTemplate: '8bbea27073d31f446168bf7ec62d29342ce99c050edf695722aeefcc7c7b59fd',
  getSyncSpecsSkillTemplate: '4217d8a9886fccc382f66683abf9754ad0d381914390a940fb7d9951981497d8',
  getOnboardSkillTemplate: '2f34179ed14aa7d253cd23bd06dd6c254c01502f5b71219882e2db0c34583412',
  getOpsxExploreCommandTemplate: '7c23f048799bacc83a35a5cc127e26f01e1b15721c5ba5d4f02c9aad2ec229e8',
  getOpsxNewCommandTemplate: 'f88f178126b8add9c75201715e41bcae53d08c0c7c8cd11c2f33d83d75c30465',
  getOpsxContinueCommandTemplate: '1f7890551ee685b6cf2dcaf1049d0f916b5cd8fc1a6b57f8794f8fd263aa716b',
  getOpsxApplyCommandTemplate: '641e73163afadcafc023cb0a9c236722f7763966d6a236fb5fdd3b0db99ec39e',
  getOpsxFfCommandTemplate: '0ae5eec5b8bc590bd60639fa17f9c101d6dc0c3a6ecf79355f62531b1753ff77',
  getArchiveChangeSkillTemplate: '1b39fb0ec1ac6548124dbe0144b743d879fb29211025bd498d2e805fa59a7b9d',
  getBulkArchiveChangeSkillTemplate: '4a02f271aa6d0d2ca74147f601ea0831065415474c471495c1674a82ae92cb02',
  getOpsxSyncCommandTemplate: '6d93eea4ab0048e8b139fee7f96c2c0ac759574d03ba6bbe1cdb387e1bc1ff92',
  getVerifyChangeSkillTemplate: 'ca79bcf4324cd5edbeae153e4afb8d1dac151b1a158099f218c6b7ecd38a6314',
  getOpsxArchiveCommandTemplate: 'ad651aeec1d9f713df111ca33600425eaa5cd68cb5c52cc3aac937b14644c404',
  getOpsxOnboardCommandTemplate: '074dd88227629216c0190a02171c673b01c7cc46fb9c7b75e3740cc8f909c013',
  getOpsxBulkArchiveCommandTemplate: '3209f92bde67f5a19ad20267c5dedce577f8d8ce9b984585b7b0118b1be33667',
  getOpsxVerifyCommandTemplate: 'b815c4b4376e6a45e89a884d34be213e6ed6436f6ae0349a8c9b37e307f30b10',
  getOpsxProposeSkillTemplate: '5c39a293c1c6e133fb8d95ff5d67e8d0a92023d48c45cfc03af9500a31a8d31e',
  getOpsxProposeCommandTemplate: 'f16cd3b74661252e42e24f20da75d5c4c876b4e5e7e2b5c186f4323353603c48',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getUpdateChangeSkillTemplate: 'ce795b99e7c839b50ac76fa9b7797d267c4bef46527ac052d0329e349bfbc2c4',
  getOpsxUpdateCommandTemplate: 'e5e72b74f41486e03cf0d5ca1702d6015fa6208a93b9e031d6f08d20f1842df7',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '5559df4703a1d7510b38e7d34b11028c2c974e20e5db11b0797eb73a0dc90614',
  'openspec-new-change': '4d0ef4b0705e171b5c29b9817c2e8927f49ce9987c717b2c7c537ab52fc47a59',
  'openspec-continue-change': '763c567607b85b014c157da718d0417f6c3c30366507649e89294672cceb2525',
  'openspec-apply-change': '4fd5222f7b4289a6f45017a54d51f1d4e35652a0ba8ee3741b93f87dad90c8d3',
  'openspec-ff-change': '197d66cc18bfa6a3154b712cafd1cd8462a767bfb5815f5bdc1dfffff38d1449',
  'openspec-sync-specs': '8b647824989f93e8f528fc2ad4a45ec501cb83df4a71b1b6f52b4e75cf227d8c',
  'openspec-archive-change': '0b42b1205f14536bbb7095d12414a04e4c55bdcda53e12d09d088d1a187f190c',
  'openspec-bulk-archive-change': '77dd1dd94c197457765c5dab7843bd85011026933c36ea833287dc3ab7d90391',
  'openspec-verify-change': 'c982d0f24b1fe3b27fca0eed1b1c6ccc89c06b62607091e924db2e0a254590b6',
  'openspec-onboard': 'bba0dd64d4dc22c3edffdbfa0615ed8faed3a237b3a3dab296e6a70a652b1e1c',
  'openspec-propose': 'e8cce612db3ebd73ba32b077692052de4b75c9dae46968b47b3f8c78c05b0ca2',
  'openspec-update-change': 'fb0a9e5c3bdd151977e718e3ce1d189b34b8062d3e2ad4400afa25aa952e5f49',
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

  it('keeps planning CUE in sync and requires a dense file summary', () => {
    const planningSkills = [
      getContinueChangeSkillTemplate(),
      getFfChangeSkillTemplate(),
      getOpsxProposeSkillTemplate(),
      getUpdateChangeSkillTemplate(),
    ];
    const planningCommands = [
      getOpsxContinueCommandTemplate().content,
      getOpsxFfCommandTemplate().content,
      getOpsxProposeCommandTemplate().content,
      getOpsxUpdateCommandTemplate().content,
    ];

    for (const template of planningSkills) {
      expect(template.instructions, template.name).toContain('Never defer a required CUE edit');
      expect(template.instructions, template.name).toContain('a summary in the chat response is not a substitute');
      expect(template.instructions, template.name).toContain('no more than 300 words');
    }

    for (const content of planningCommands) {
      expect(content).toContain('Never defer a required CUE edit');
      expect(content).toContain('a summary in the chat response is not a substitute');
      expect(content).toContain('no more than 300 words');
    }
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
