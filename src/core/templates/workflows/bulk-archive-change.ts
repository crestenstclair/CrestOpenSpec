import type { SkillTemplate, CommandTemplate } from '../types.js';
import { ACCEPTANCE_REVIEW_CONTRACT } from './acceptance-review.js';
import { STORE_SELECTION_GUIDANCE } from './store-selection.js';

function bulkArchiveInstructions(input: string): string {
  return `Review several OpenSpec changes independently and archive only the eligible subset.

${STORE_SELECTION_GUIDANCE}

**Input**: ${input}

**Workflow**

1. Run \`openspec list --json\` with the selected store flag and ask the user which active changes to review. Never auto-select; one or more selections are valid.
2. For each selected change independently, run \`openspec status --change "<name>" --json\` and \`openspec instructions apply --change "<name>" --json\` with the selected store flag. Read that change's evaluated \`context\` before its artifacts.
3. Apply the complete shared adversarial acceptance review below independently to each change. Do not let evidence, applicability, a broad suite, or a passing result for one change satisfy another.
4. Build a table with semantic status, deterministic status, blocking classes, deferred observations, delta-spec overlap, and final eligibility for every selected change. A spec overlap is a coordination fact, not proof of implementation; resolve ordering only from current authority and evidence.
5. Ask once which eligible changes to archive. Blocked changes are not offered as overrideable choices.
6. For every confirmed eligible change, invoke \`openspec archive "<name>" --yes\` with the selected store flag. Never move directories or write canonical specs directly. Core archive reruns deterministic acceptance immediately before mutation.
7. Continue through independent failures and report archived, failed, and acceptance-blocked changes separately. Partial success never turns a failed change into an archive candidate.

${ACCEPTANCE_REVIEW_CONTRACT}

**Output**

Show one evidence-backed eligibility row per change, then the confirmed eligible subset. Finish with separate archived, failed, blocked, and non-blocking deferred sections. Include the core archive result for each attempted change.`;
}

export function getBulkArchiveChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-bulk-archive-change',
    description: 'Adversarially review multiple changes and archive only the independently eligible subset.',
    instructions: bulkArchiveInstructions('None required; always prompt for one or more active changes.'),
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxBulkArchiveCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Bulk Archive',
    description: 'Review multiple changes and archive only independently eligible ones',
    category: 'Workflow',
    tags: ['workflow', 'archive', 'experimental', 'bulk'],
    content: bulkArchiveInstructions('None required; always prompt for one or more active changes.'),
  };
}
