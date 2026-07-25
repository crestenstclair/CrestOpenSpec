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
  getExploreSkillTemplate: '549686a6c41e173592b5466768fc16747cc1897dd8c6bcabeb22ef3a0071b70a',
  getNewChangeSkillTemplate: '39663a6d2037e6697020393a66f6327506e3e3bc573b7a3556dcb7f9457dc51d',
  getContinueChangeSkillTemplate: 'acc07a489a30192b4bf2bbdc587a889478fbf6fffbbc9353c7775c4ca1ec5011',
  getApplyChangeSkillTemplate: '6a744f3b4068502dd4437a1ca1c35658ff5bf4bdea8e57c86bc78903b9dc448e',
  getFfChangeSkillTemplate: '20ebb682ba89809a100cd4985c074908df5bada2bd649ca1b0f4059a63a1c728',
  getSyncSpecsSkillTemplate: 'dc07ea0312687f3edc602329c889dbbab737c6d79327eb7a723553d346b43433',
  getOnboardSkillTemplate: 'e871d8ce172bb805ae62a7611aee7a3154d89414f427ad5ef31721c903f13002',
  getOpsxExploreCommandTemplate: 'fdc467b44cb5e8213b428039d92b59bff73513a449a362ee855e942ab19e4a9f',
  getOpsxNewCommandTemplate: '57c600cce318d16b9b4308a18d0d983ea3c0673034e606a7cceec07b4c705e87',
  getOpsxContinueCommandTemplate: 'f63964fab7720ede097aa48808baff196c391b962930ca960459205c724800e5',
  getOpsxApplyCommandTemplate: 'f375ec90dc6294e6dcfa80ad9bc0d6179e1d9c212a0f283f661ec66104d59bf0',
  getOpsxFfCommandTemplate: 'b859b1955cda6012877ae7f9ec6980e468f2e949a3838dfcdebc17209d133749',
  getArchiveChangeSkillTemplate: '81c0ef6794bc0e0b79342ea2a1814efb0d9bc8c7ebc9d7d63a16714d781ee804',
  getBulkArchiveChangeSkillTemplate: 'f675122bce3ef583b245352abedecf50ff4043e45bea6bac091885f83c7b6362',
  getOpsxSyncCommandTemplate: '98b20e00da5c588ff83ed6e6f0e959dfc540349090fb3f5792ea030d099b8169',
  getVerifyChangeSkillTemplate: '8d41ac7f23c18221eee7d5ab52c83df92608090d4473f85d8ae85366c05bbffb',
  getOpsxArchiveCommandTemplate: '871d9909e0e465fc98f07826c29183f4739c1d9fb79bd268ac5f8685f37f872d',
  getOpsxOnboardCommandTemplate: '0673f34a0f81fd173bcfb8c3ac83e2b1c617f7b7564e24e5298d3bd5665a05a9',
  getOpsxBulkArchiveCommandTemplate: 'd0d84040bcbd44e89ac525bb21100bee7befb3604e51095bfa65b8453d85290c',
  getOpsxVerifyCommandTemplate: '8f32c9a78f01f314bbe29520be53a1f516496e7f245e09244ffcba6d1d78e46b',
  getOpsxProposeSkillTemplate: '59197064a46c53264b62925a1c725af4ebe7caf9f0eaed4101990b7c13a40db1',
  getOpsxProposeCommandTemplate: '04f808a36e850b9cdbc4f943ef324a9fd2b1b0cc59b92f127ab6cc452d66cc4e',
  getFeedbackSkillTemplate: 'd7d83c5f7fc2b92fe8f4588a5bf2d9cb315e4c73ec19bcd5ef28270906319a0d',
  getUpdateChangeSkillTemplate: 'fe2e8edaf973d42dc7fc7dfd846105c4c3cfec0437606e582ec644985cd4e81d',
  getOpsxUpdateCommandTemplate: 'e55ac5774203a7d9037d2d588889c97c53f3f930da49497cc79e865375920da7',
};

const EXPECTED_GENERATED_SKILL_CONTENT_HASHES: Record<string, string> = {
  'openspec-explore': '9300dfbf0d7367acb98eff6c5311386e1b9d29169bbcd70da8c1f50253ade3ad',
  'openspec-new-change': 'd5b8909bea70a33b7a312b38ce204a91f40b6bb2bff12c4c06b3e11641b6a689',
  'openspec-continue-change': 'bdb8bbb6a768a741b05256effbc284d65ac6a45360b59c24b94198792d3d0ebf',
  'openspec-apply-change': 'b20b4423b681e50482bc388c2d352dec047c4b540c70c2e5f95a4447daba1238',
  'openspec-ff-change': '0c82830cd9bc98f86eb56b63ddaabe2bf5d35fe25b6c40a7059311aee2c8acac',
  'openspec-sync-specs': 'b3f694ab81956d05126b089fe82dea78dec21788978bb9651485f996aee96740',
  'openspec-archive-change': '5efd666d9b13e3cb41346bc65829026325daaf0b8eaa0e924e12e7021f2ff15a',
  'openspec-bulk-archive-change': '545b9528df52fbb0b4898405b42a2ce10416678d469d20cf597d022fa6e16e3b',
  'openspec-verify-change': 'e7def65df618a2feb1f698e5f31555e27bb8e201702ea624c2b2446543494b57',
  'openspec-onboard': 'b1b6fc9a1b3ff64dafe9b8c39a761ee1bd001b542d47b4e4deaf058e0aa21256',
  'openspec-propose': '024db4bce28d9a4d7b25fa92525da6fc701a64ac07dfdcf777d286c95b5281b5',
  'openspec-update-change': '77ff4d1f1cd08a57649cce1f25e0ebc4f55d6d032dfde5c301d1b479561b72fa',
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
