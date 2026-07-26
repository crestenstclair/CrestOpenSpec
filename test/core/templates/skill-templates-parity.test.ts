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
  getExploreSkillTemplate: 'ec9afc16352ee4a9b3507b69f7bbdbaa8313e70ab3d2ea9fc8ef8fde5b1dd369',
  getNewChangeSkillTemplate: '3fc357ec605f6f87bdbfa85bb8fff995ccc0c4879e0f110d086792a0d39034e1',
  getContinueChangeSkillTemplate: '3d7b3ea6b89e4144847cbbc85c49ef8b02500ee958f3e9a15343ec49dca21233',
  getApplyChangeSkillTemplate: 'bd717c04d756770f600de13cbbcb3da5bf35b8fabf241e3cf4dc50d2adaeac5d',
  getFfChangeSkillTemplate: '55e26bebbfd707a1aa7d9861fd38b04b5a5ba33c26ffc2f1515508d0dbe45d3c',
  getSyncSpecsSkillTemplate: '5da63c41449edeebc8240ff7a939e385b1a14abc6074396735432eea57b4422d',
  getOnboardSkillTemplate: 'c5ff55c0b3f2c5f841ee5c5251b5fa58a1a12630c5e23a2043c97f85e3835fc7',
  getOpsxExploreCommandTemplate: '47eec45a5a9418bbee2bc9948102f2951933bf48694c6ed35806e4005f37a3bd',
  getOpsxNewCommandTemplate: 'f88f178126b8add9c75201715e41bcae53d08c0c7c8cd11c2f33d83d75c30465',
  getOpsxContinueCommandTemplate: '13d150e3f48de4a07517390b8a29285115246458c0d1dedc18739895d8fb3d6d',
  getOpsxApplyCommandTemplate: 'faee6db7a441f05a775403e71688bc8b8bd49097b461ace85a6a1582d645c612',
  getOpsxFfCommandTemplate: '4dd32d155d9fce532934e0a1d13dbe1743051aa2a98703bf3d55ac3f76a39b5f',
  getArchiveChangeSkillTemplate: '1b39fb0ec1ac6548124dbe0144b743d879fb29211025bd498d2e805fa59a7b9d',
  getBulkArchiveChangeSkillTemplate: '4a02f271aa6d0d2ca74147f601ea0831065415474c471495c1674a82ae92cb02',
  getOpsxSyncCommandTemplate: '630a806d36d207af222c0a7a6dbb734907b853884cb3bb6f5f6147f0c5801c43',
  getVerifyChangeSkillTemplate: 'ca79bcf4324cd5edbeae153e4afb8d1dac151b1a158099f218c6b7ecd38a6314',
  getOpsxArchiveCommandTemplate: 'ad651aeec1d9f713df111ca33600425eaa5cd68cb5c52cc3aac937b14644c404',
  getOpsxOnboardCommandTemplate: '06f02f80270d8f7698ee06027e47ef791c3f8d6aabe3c7cd00b2a1cd78e60cb9',
  getOpsxBulkArchiveCommandTemplate: '3209f92bde67f5a19ad20267c5dedce577f8d8ce9b984585b7b0118b1be33667',
  getOpsxVerifyCommandTemplate: 'b815c4b4376e6a45e89a884d34be213e6ed6436f6ae0349a8c9b37e307f30b10',
  getOpsxProposeSkillTemplate: '241d2684e8ff696dabd832ad70e3136fbaa4e1cf9711e64ebef6fb3b9998ca40',
  getOpsxProposeCommandTemplate: '19284ef2a72f65e1a7631f63c058f87f2689f20802563e5ac810ecca4edf9aa9',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getUpdateChangeSkillTemplate: 'd63101d44e3f7994c61112ffb06f8ba1df4977c3347e5a888bea13bd7066c25b',
  getOpsxUpdateCommandTemplate: 'b80db4fb061a7072f9226a622548c3d2b9b28eda87d04f472f82f5d00d721661',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': 'dc3fe128650b80270fbf1642f23053294ccfcae69e2268cc5ce5d0cc3a9b58d5',
  'openspec-new-change': '4d0ef4b0705e171b5c29b9817c2e8927f49ce9987c717b2c7c537ab52fc47a59',
  'openspec-continue-change': 'e11334db5ffe795c64b6c00bcfc35a4724a0a71b5f3d8d3ff726da00502adebe',
  'openspec-apply-change': '450a0bed913e724a481736c087778ec7032a030378e96848cf9d7acfb90b8851',
  'openspec-ff-change': 'fc0ffe2012c0f96746da0a87cc4a379348fa9a5b5446f9d808c96190e7da85a6',
  'openspec-sync-specs': '4ffdb4478bbae47066a95c3715d2950ab219611d20d2b77cde2f67e497a602cc',
  'openspec-archive-change': '0b42b1205f14536bbb7095d12414a04e4c55bdcda53e12d09d088d1a187f190c',
  'openspec-bulk-archive-change': '77dd1dd94c197457765c5dab7843bd85011026933c36ea833287dc3ab7d90391',
  'openspec-verify-change': 'c982d0f24b1fe3b27fca0eed1b1c6ccc89c06b62607091e924db2e0a254590b6',
  'openspec-onboard': 'e972972aae26928222844f3889e6cab31cba46df21364d9223587c0cf97b6559',
  'openspec-propose': '819c629d3c443d6026a2a297bea5ff04b852dc1b199b52897a3987806485aeab',
  'openspec-update-change': '43174aefcf6a7984f39e9a1f72d9998b9b8cf1ae7b0cbcd83a4da470be2be793',
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

  // The assertion above only compares the skills this file already lists, so a
  // workflow added to getSkillTemplates() but never pinned here would ship with
  // no golden hash and nothing would fail. Pin the registry itself.
  it('pins every skill the production registry deploys', () => {
    const pinned = GENERATED_SKILL_FACTORIES.map(([dirName]) => dirName).sort();
    const deployed = getSkillTemplates().map(({ dirName }) => dirName).sort();

    expect(pinned, 'add the new skill to GENERATED_SKILL_FACTORIES and EXPECTED_GENERATED_SKILL_CONTENT_HASHES').toEqual(deployed);
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

  it('delegates archive mutations to the core CLI after approval', () => {
    const singleVariants: Array<[string, string]> = [
      ['single skill', generateSkillContent(getArchiveChangeSkillTemplate(), 'PARITY-BASELINE')],
      ['single opsx command', getOpsxArchiveCommandTemplate().content],
    ];
    const bulkVariants: Array<[string, string]> = [
      ['bulk skill', generateSkillContent(getBulkArchiveChangeSkillTemplate(), 'PARITY-BASELINE')],
      ['bulk opsx command', getOpsxBulkArchiveCommandTemplate().content],
    ];

    for (const [variant, content] of singleVariants) {
      expect(content, variant).toContain("Ask for the user's archive approval");
      expect(content, variant).toContain('openspec archive "<name>" --yes');
      expect(content, variant).toContain('Never move directories or write canonical specs directly');
      expect(content, variant).toContain("Preserve and report the core command's result");
      expect(content, variant).not.toContain('mv "<changeRoot>"');
      expect(content, variant).not.toContain('mkdir -p');
    }

    for (const [variant, content] of bulkVariants) {
      expect(content, variant).toContain('Ask once for the exact subset and ordering to archive');
      expect(content, variant).toContain('openspec archive "<name>" --yes');
      expect(content, variant).toContain('Never move directories or write canonical specs directly');
      expect(content, variant).toContain('Continue through independent core archive failures');
      expect(content, variant).not.toContain('mv "<changeRoot>"');
      expect(content, variant).not.toContain('mkdir -p');
    }
  });

  it('makes the schema instruction field authoritative for artifact creation (#777)', () => {
    const variants: Array<[string, string]> = [
      ['propose skill', generateSkillContent(getOpsxProposeSkillTemplate(), 'PARITY-BASELINE')],
      ['propose command', getOpsxProposeCommandTemplate().content],
      ['continue skill', generateSkillContent(getContinueChangeSkillTemplate(), 'PARITY-BASELINE')],
      ['continue command', getOpsxContinueCommandTemplate().content],
      ['ff skill', generateSkillContent(getFfChangeSkillTemplate(), 'PARITY-BASELINE')],
      ['ff command', getOpsxFfCommandTemplate().content],
    ];

    for (const [variant, content] of variants) {
      // The instruction field wins even for familiar artifact names: the old
      // hard-coded "Common artifact patterns" shortcut is what let agents
      // ignore custom schemas that reuse proposal.md/tasks.md file names.
      expect(content, variant).toContain('the authoritative guidance');
      expect(content, variant).not.toContain('Common artifact patterns');

      // Delegated creation is honored at the creation step itself, and the
      // delegated skill's output is verified rather than assumed.
      expect(content, variant).toContain(
        'If the `instruction` field delegates creation to a specific skill or command, invoke it to produce the artifact instead of writing the file yourself, then verify the artifact file exists at `resolvedOutputPath`'
      );

      // ...and restated in the artifact-creation guidelines.
      expect(content, variant).toContain(
        'If the `instruction` field directs you to use a specific skill or command to create the artifact, invoke it instead of writing the artifact directly'
      );
    }
  });
});
