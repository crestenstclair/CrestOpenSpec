import type { SkillTemplate, CommandTemplate } from '../types.js';
import { EXECUTION_ACCEPTANCE_CONTRACT } from './acceptance-review.js';
import { STORE_SELECTION_GUIDANCE } from './store-selection.js';

function verifyInstructions(input: string): string {
  return `Explicitly re-verify that an implementation satisfies its evaluated architecture and current OpenSpec change.

${STORE_SELECTION_GUIDANCE}

**Input**: ${input}

**Workflow**

1. Resolve exactly one active change. If the name is missing or ambiguous, run \`openspec list --json\` with the selected store flag and ask the user to choose; never guess.
2. Run \`openspec status --change "<name>" --json\` with the selected store flag. Use its planning root, change root, artifact paths, schema, and action context rather than assuming paths.
3. Run \`openspec instructions apply --change "<name>" --json\` with the selected store flag. Read the returned evaluated \`context\` first, then every concrete path in \`contextFiles\`.
4. Apply the shared adversarial acceptance review below to evaluated authority, artifacts, implementation, production composition, and witnesses.
5. Return one report that keeps semantic findings, deterministic gates, deferred observations, and the final eligibility decision distinct.

${EXECUTION_ACCEPTANCE_CONTRACT}

**Output**

Include a compact scorecard for obligation coverage and deterministic gates, followed by the architecture-conformance matrix and evidence-complete findings. Cite concrete files, traces, commands, and observed results. If there are no blockers, say \`execution acceptance passed; ready for user review\`; otherwise state the exact blocking classes and repairs. Never soften a blocker into a warning, and never promote a deferred observation into a blocker.`;
}

export function getVerifyChangeSkillTemplate(): SkillTemplate {
  return {
    name: 'openspec-verify-change',
    description: 'Verify implementation matches evaluated architecture and current change obligations with semantic and deterministic acceptance layers.',
    instructions: verifyInstructions('Optionally provide a change name. Infer only when the conversation identifies one unambiguously; otherwise prompt for selection.'),
    license: 'MIT',
    compatibility: 'Requires openspec CLI.',
    metadata: { author: 'openspec', version: '1.0' },
  };
}

export function getOpsxVerifyCommandTemplate(): CommandTemplate {
  return {
    name: 'OPSX: Verify',
    description: 'Run adversarial semantic and deterministic acceptance for a change',
    category: 'Workflow',
    tags: ['workflow', 'verify', 'experimental'],
    content: verifyInstructions('Optionally provide a change name after \`/opsx:verify\`. Infer only when the conversation identifies one unambiguously; otherwise prompt for selection.'),
  };
}
