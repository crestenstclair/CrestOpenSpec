import type { SkillTemplate, CommandTemplate } from '../types.js';
import { ACCEPTANCE_REVIEW_CONTRACT } from './acceptance-review.js';
import { STORE_SELECTION_GUIDANCE } from './store-selection.js';

function archiveInstructions(input: string): string {
  return `Review and archive one OpenSpec change without bypassing acceptance.

${STORE_SELECTION_GUIDANCE}

**Input**: ${input}

**Workflow**

1. Resolve exactly one active change. If the name is missing or ambiguous, run \`openspec list --json\` with the selected store flag and ask the user to choose; never guess.
2. Run \`openspec status --change "<name>" --json\` with the selected store flag. Use the returned planning root, change root, artifact paths, schema, and action context.
3. Run \`openspec instructions apply --change "<name>" --json\` with the selected store flag. Read evaluated \`context\` before every artifact in \`contextFiles\`.
4. Apply the shared adversarial acceptance review below. Incomplete artifacts or tasks are evidence to classify against current authority; a confirmation does not override an applicable blocker.
5. If delta specs exist, assess the intended canonical-spec update and explain it before archive. Do not mutate specs or move files yourself.
6. Only when both semantic review and deterministic acceptance pass, ask for the ordinary archive confirmation if needed and invoke \`openspec archive "<name>" --yes\` with the selected store flag. Core archive reruns deterministic acceptance immediately before every spec or archive mutation.
7. Preserve and report the core command's result. If it fails, the change remains unarchived.

${ACCEPTANCE_REVIEW_CONTRACT}

**Output**

Before mutation, show semantic eligibility, the complete deterministic result, deferred observations, and the planned spec/archive effect. On success, report the core archive destination and spec-update result. On failure, state that no semantic finding or deterministic gate can be bypassed by confirmation or legacy skip flags.`;
}

export function getArchiveChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-archive-change',
    description: 'Adversarially review and archive one completed change through core archive enforcement.',
    instructions: archiveInstructions('Optionally provide a change name. Infer only when the conversation identifies one unambiguously; otherwise prompt for selection.'),
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxArchiveCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Archive',
    description: 'Review and archive a change through mandatory acceptance gates',
    category: 'Workflow',
    tags: ['workflow', 'archive', 'experimental'],
    content: archiveInstructions('Optionally provide a change name after \`/opsx:archive\`. Infer only when the conversation identifies one unambiguously; otherwise prompt for selection.'),
  };
}
