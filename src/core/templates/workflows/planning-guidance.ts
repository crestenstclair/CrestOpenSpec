export const CUE_PLANNING_RECONCILIATION_GUIDANCE = `**CUE planning reconciliation**

When the project has a CUE architecture, planning owns that source state too:
- Artifact instructions expose the concrete sources in \`contextFiles.cue\`; \`openspec context --json\` exposes the same paths in \`architecture.files\`.
- Read every listed CUE file before changing the plan. If the plan changes architectural intent, capabilities, requirements, boundaries, resources, relationships, constraints, or proof, edit the CUE sources during planning.
- Never defer a required CUE edit to a task artifact or the apply phase. Before declaring planning complete, the evaluated CUE package and every Markdown artifact must describe the same planned system.
- Keep CUE information-dense: encode the model and its relationships, not copies of Markdown explanation.
- Re-run \`openspec context --json\` after editing CUE. Stop on evaluation errors or incomplete/conflicting values.
- If the plan requires no semantic CUE change, leave the files untouched and report that they were checked.`;

export const SPEC_DRIVEN_ARTIFACT_FLOW = 'proposal → specs → design → tasks → summary';

export const DENSE_SUMMARY_GUIDANCE = `**Dense planning summary**

In the built-in spec-driven schema, \`summary\` is the final required artifact:
- Create the actual output file for \`summary\`; a summary in the chat response is not a substitute.
- Keep it as a short outline of the other artifacts: headings plus bullets/nested bullets only, normally 10-16 bullets and no more than 300 words.
- Do not add narrative prose or introduce new decisions. If summarizing reveals a gap, fix the authoritative source artifact first.`;
