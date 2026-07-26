---
name: openspec-update-change
description: Update an OpenSpec change by revising its existing planning artifacts and keeping them coherent with one another. Use when the user wants to revise a change's plan, fold new decisions into it, or reconcile its artifacts after an edit. Never edits code.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Revise a change's existing planning artifacts and keep them coherent. Never edit code.

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `acceptance`, `archive`, `doctor`, `context`). Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **If no change name provided, prompt for selection**

   Run `openspec list --json` to get available changes sorted by most recently modified. Then use the **AskUserQuestion tool** to let the user select which change to update.

   Present the top 3-4 most recently modified changes as options, showing:
   - Change name
   - Schema (from `schema` field if present, otherwise "spec-driven")
   - Status (e.g., "0/5 tasks", "complete", "no tasks")
   - How recently it was modified (from `lastModified` field)

   Mark the most recently modified change as "(Recommended)" since it's likely what the user wants to update.

   **IMPORTANT**: Do NOT guess or auto-select a change. Always let the user choose.

2. **Get the change's artifacts**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to understand current state. The response includes:
   - `schemaName`: The workflow schema being used (e.g., "spec-driven")
   - `artifacts`: Array of artifacts with their status ("done", "skipped", "ready", "blocked")
   - `isComplete`: Boolean indicating if all artifacts are complete
   - `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`: path and scope context. Use these instead of assuming repo-local paths.

   The artifact ids and paths come from the active schema - do NOT assume them, and do NOT branch on hardcoded artifact names. Custom schemas must work unchanged.

   The files to edit are `artifactPaths.<id>.existingOutputPaths` - the concrete files that exist on disk, already glob-expanded for glob artifacts (e.g. `specs/**/*.md`). Do NOT write to `resolvedOutputPath`: for a glob artifact it is still the glob pattern, not a real file.

   Also load project architecture context:
   ```bash
   openspec context --json
   ```
   When `architecture.kind` is `cue`, `architecture.files` are writable planning sources and must be reconciled with the artifact revisions.

3. **Understand the request**
   - If the user asked for a specific revision ("the design now uses X"), that is the starting edit.
   - If they only said "update" / "make this coherent", treat it as a coherence review: read the existing artifacts and check them against each other for contradictions, gaps, and duplication.

4. **Read and reconcile**
   - Read the artifact(s) the request touches and the change's other existing artifacts.
   - Apply the requested edit. Then check every other existing artifact against it - in ANY direction: an edit to a later artifact may require revising an earlier one, not only the other way around. Build order is a useful reading order, not a constraint on which artifacts may be revised.
   - Note everything that is now inconsistent, missing, or contradictory.
   - If the project has CUE architecture, reconcile the listed CUE sources in the same update. Do not turn required CUE edits into future implementation tasks.
   - If a summary artifact already exists, revise it last so it remains a dense, bullet-only outline of the reconciled source artifacts and CUE model.
   - Revise only files that already exist (`existingOutputPaths`). Do NOT create artifacts that don't exist yet, and do NOT invent new files under a glob artifact - note them and point the user to `/openspec-continue-change` to create them.
   - If the change is already coherent, say so and make no edits.

5. **Confirm and apply, one artifact at a time**
   - Show each proposed revision and why. Write only after the user confirms.
   - If the user rejects a revision, do not write it - leave that artifact unchanged.
   - When a substantial rewrite is needed, get that artifact's rules and template first:
     ```bash
     openspec instructions <artifact-id> --change "<name>" --json
     ```

6. **Point to the next step (guidance only - NEVER act on it)**
   - Artifacts still missing -> suggest `/openspec-continue-change` to create them.
   - Change already implemented (tasks checked off / already applied) -> the code may no longer match the revised plan; suggest `/openspec-apply-change` to carry the delta into code.
   - Everything done and implemented -> suggest `/openspec-archive-change`.

**Output**

After each invocation, show:
- Which artifacts were revised (and which proposed revisions were rejected)
- Which CUE sources were revised, or that the evaluated CUE required no semantic change
- Anything deferred to `/openspec-continue-change` (not-yet-created artifacts or files)
- Where the change stands and the recommended next command

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
- Planning artifacts and listed CUE architecture sources only - NEVER edit implementation code. If the revised plan implies code changes, stop and point to `/openspec-apply-change`.
- Use the artifact ids and paths reported by `openspec status`; never branch on hardcoded artifact names.
- For change artifacts, edit only the concrete files in `existingOutputPaths`; never write to a glob `resolvedOutputPath`. Existing paths in `architecture.files` are the explicit CUE exception.
- Do not advance the build frontier: no new artifacts, no new files under glob artifacts - that is `/openspec-continue-change`'s job.
- Confirm every edit with the user before writing.
- If the request changes the change's *intent* rather than refining it, recommend starting fresh with `/openspec-new-change` (the "Update vs. Start Fresh" heuristic).
- `/openspec-continue-change` and `/openspec-new-change` may not be installed (core profile). When suggesting one that is unavailable, point to the CLI instead: `openspec status --change "<name>" --json` shows the next artifact and `openspec instructions <artifact-id> --change "<name>" --json` explains how to create it.
