---
name: openspec-continue-change
description: Continue working on an OpenSpec change by creating the next artifact. Use when the user wants to progress their change, create the next artifact, or continue their workflow.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Continue working on a change by creating the next artifact.

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `acceptance`, `archive`, `doctor`, `context`). Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes sorted by most recently modified. Then use the **AskUserQuestion tool** to let the user select which change to work on.

   Present the top 3-4 most recently modified changes as options, showing:
   - Change name
   - Schema (from `schema` field if present, otherwise "spec-driven")
   - Status (e.g., "0/5 tasks", "complete", "no tasks")
   - How recently it was modified (from `lastModified` field)

   Mark the most recently modified change as "(Recommended)" since it's likely what the user wants to continue.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Check current status**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to understand current state. The response includes:
   - `schemaName`: The workflow schema being used (e.g., "spec-driven")
   - `artifacts`: Array of artifacts with their status ("done", "ready", "blocked")
   - `isComplete`: Boolean indicating if all artifacts are complete
   - `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`: path and scope context. Use these instead of assuming repo-local paths.

3. **Act based on status**:

   ---

   **If all artifacts are complete (`isComplete: true`)**:
   - Congratulate the user
   - Show final status including the schema used
   - Suggest: "All artifacts created! You can now implement this change or archive it."
   - STOP

   ---

   **If artifacts are ready to create** (status shows artifacts with `status: "ready"`):
   - Pick the FIRST artifact with `status: "ready"` from the status output
   - Get its instructions:
     ```bash
     openspec instructions <artifact-id> --change "<name>" --json
     ```
   - Parse the JSON. The key fields are:
     - `context`: Project background (constraints for you - do NOT include in output)
     - `contextFiles.cue`: Concrete CUE sources to reconcile during planning, when present
     - `rules`: Artifact-specific rules (constraints for you - do NOT include in output)
     - `template`: The structure to use for your output file
     - `instruction`: Schema-specific guidance
     - `resolvedOutputPath`: Resolved path or pattern to write the artifact
     - `dependencies`: Completed artifacts to read for context
   - **Create the artifact file**:
     - Read any completed dependency files for context - always re-read them from disk, even if you saw them earlier in the conversation (the user may have edited them)
     - Use `template` as the structure - fill in its sections
     - Apply `context` and `rules` as constraints when writing - but do NOT copy them into the file
     - Write to the `resolvedOutputPath` specified in instructions. If it is a glob pattern, choose the concrete file path using the schema instruction and the change's context
   - Show what was created and what's now unlocked
   - STOP after creating ONE artifact

   ---

   **If no artifacts are ready (all blocked)**:
   - This shouldn't happen with a valid schema
   - Show status and suggest checking for issues

4. **After creating an artifact, show progress**
   ```bash
   openspec status --change "<name>"
   ```

**Output**

After each invocation, show:
- Which artifact was created
- Schema workflow being used
- Current progress (N/M complete)
- What artifacts are now unlocked
- Prompt: "Want to continue? Just ask me to continue or tell me what to do next."

**Artifact Creation Guidelines**

The artifact types and their purpose depend on the schema. Use the `instruction` field from the instructions output to understand what to create.

Common artifact patterns:

**spec-driven schema** (proposal → specs → design → tasks → summary):
- **proposal.md**: Ask user about the change if not clear. Fill in Why, What Changes, Capabilities, Impact.
  - The Capabilities section is critical - each capability listed will need a spec file.
- **specs/<capability>/spec.md**: Create one spec per capability listed in the proposal's Capabilities section (use the capability name, not the change name).
- **design.md**: Document technical decisions, architecture, and implementation approach.
- **tasks.md**: Break down implementation into checkboxed tasks.
- **summary.md**: Dense, bullet-only outline of the completed plan. It is the final required planning artifact.

For other schemas, follow the `instruction` field from the CLI output.

**CUE planning reconciliation**

When the project has a CUE architecture, planning owns that source state too:
- Artifact instructions expose the concrete sources in `contextFiles.cue`; `openspec context --json` exposes the same paths in `architecture.files`.
- Read every listed CUE file before changing the plan. If the plan changes architectural intent, capabilities, requirements, boundaries, resources, relationships, constraints, or proof, edit the CUE sources during planning.
- Never defer a required CUE edit to a task artifact or the apply phase. Before declaring planning complete, the evaluated CUE package and every Markdown artifact must describe the same planned system.
- Keep CUE information-dense: encode the model and its relationships, not copies of Markdown explanation.
- Re-run `openspec context --json` after editing CUE. Stop on evaluation errors or incomplete/conflicting values.
- If the plan requires no semantic CUE change, leave the files untouched and report that they were checked.

**Dense planning summary**

In the built-in spec-driven schema, `summary` is the final required artifact:
- Create the actual output file for `summary`; a summary in the chat response is not a substitute.
- Keep it as a short outline of the other artifacts: headings plus bullets/nested bullets only, normally 10-16 bullets and no more than 300 words.
- Do not add narrative prose or introduce new decisions. If summarizing reveals a gap, fix the authoritative source artifact first.

**Guardrails**
- Create ONE artifact per invocation
- Always read dependency artifacts before creating a new one - re-read from disk, not from conversation memory (files may have changed since you last saw them)
- Never skip artifacts or create out of order
- If context is unclear, ask the user before creating
- Verify the artifact file exists after writing before marking progress
- Use the schema's artifact sequence, don't assume specific artifact names
- **IMPORTANT**: `context` and `rules` are constraints for YOU, not content for the file
  - Do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into the artifact
  - These guide what you write, but should never appear in the output
