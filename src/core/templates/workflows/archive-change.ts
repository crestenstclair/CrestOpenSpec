import type { SkillTemplate, CommandTemplate } from '../types.js';
import { STORE_SELECTION_GUIDANCE } from './store-selection.js';

function archiveInstructions(input: string): string {
  return `Archive one OpenSpec change after the user has reviewed and approved the completed implementation.

${STORE_SELECTION_GUIDANCE}

**Input**: ${input}

**Workflow**

1. Resolve exactly one active change. If the name is missing or ambiguous, run \`openspec list --json\` with the selected store flag and ask the user to choose; never guess.
2. Run \`openspec status --change "<name>" --json\` with the selected store flag. Use the returned planning root, change root, artifact paths, schema, and action context.
3. Summarize the artifact/task completion shown by status and the fact that core archive may update canonical specs from delta specs. Do not reinterpret implementation correctness here.
4. Ask for the user's archive approval unless the current request already explicitly approved archiving this exact change.
5. After approval, invoke \`openspec archive "<name>" --yes\` with the selected store flag. Never move directories or write canonical specs directly.
6. Preserve and report the core command's result. If it fails, the change remains unarchived.

Acceptance belongs at the end of execute/apply. Do not run the shared adversarial review or \`openspec acceptance\` as archive ceremony, and do not imply that archive revalidated functionality. If the user requests another functional review before approving, use \`/opsx:verify\` explicitly and return to archive only after that separate review.

**Output**

Before mutation, show the selected change, completion summary, and planned spec/archive effect, then obtain approval. On success, report the core archive destination and spec-update result. On failure, report the core diagnostic without starting a second implementation review.`;
}

export function getArchiveChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-archive-change',
    description: 'Archive one completed, reviewed change after user approval without rerunning implementation acceptance.',
    instructions: archiveInstructions('Optionally provide a change name. Infer only when the conversation identifies one unambiguously; otherwise prompt for selection.'),
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxArchiveCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Archive',
    description: 'Archive a reviewed change after user approval',
    category: 'Workflow',
    tags: ['workflow', 'archive', 'experimental'],
    content: archiveInstructions('Optionally provide a change name after \`/opsx:archive\`. Infer only when the conversation identifies one unambiguously; otherwise prompt for selection.'),
  };
}
