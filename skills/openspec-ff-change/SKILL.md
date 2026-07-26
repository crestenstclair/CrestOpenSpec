---
name: openspec-ff-change
description: Fast-forward through OpenSpec artifact creation. Use when the user wants to quickly create all artifacts needed for implementation without stepping through each one individually.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Fast-forward through artifact creation - generate everything needed to start implementation in one go.

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `acceptance`, `archive`, `doctor`, `context`). Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root.

**Input**: The user's request should include a change name (kebab-case) OR a description of what they want to build.

**Steps**

1. **If no clear input provided, ask what they want to build**

   Use the **AskUserQuestion tool** (open-ended, no preset options) to ask:
   > "What change do you want to work on? Describe what you want to build or fix."

   From their description, derive a kebab-case name (e.g., "add user authentication" → `add-user-auth`).

   **IMPORTANT**: Do NOT proceed without understanding what the user wants to build.

2. **Create the change directory**
   ```bash
   openspec new change "<name>"
   ```
   This creates a scaffolded change in the planning home resolved by the CLI.

3. **Get the artifact build order**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to get:
   - `applyRequires`: array of artifact IDs needed before implementation (e.g., `["tasks", "summary"]`)
   - `artifacts`: list of all artifacts with their status and dependencies
   - `planningHome`, `changeRoot`, `artifactPaths`, and `actionContext`: path and scope context. Use these instead of assuming repo-local paths.

4. **Create artifacts in sequence until apply-ready**

   Use the **TodoWrite tool** to track progress through the artifacts.

   Loop through artifacts in dependency order (artifacts with no pending dependencies first):

   a. **For each artifact that is `ready` (dependencies satisfied)**:
      - Get instructions:
        ```bash
        openspec instructions <artifact-id> --change "<name>" --json
        ```
      - The instructions JSON includes:
        - `context`: Project background (constraints for you - do NOT include in output)
        - `contextFiles.cue`: Concrete CUE sources to reconcile during planning, when present
        - `rules`: Artifact-specific rules (constraints for you - do NOT include in output)
        - `template`: The structure to use for your output file
        - `instruction`: Schema-specific guidance for this artifact type
        - `resolvedOutputPath`: Resolved path or pattern to write the artifact
        - `dependencies`: Completed artifacts to read for context
      - Read any completed dependency files for context - always re-read them from disk, even if you saw them earlier in the conversation (the user may have edited them)
      - Create the artifact file using `template` as the structure and write it to `resolvedOutputPath`
      - Apply `context` and `rules` as constraints - but do NOT copy them into the file
      - Show brief progress: "✓ Created <artifact-id>"

   b. **Continue until all `applyRequires` artifacts are complete**
      - After creating each artifact, re-run `openspec status --change "<name>" --json`
      - Check if every artifact ID in `applyRequires` has `status: "done"` in the artifacts array
      - Stop when all `applyRequires` artifacts are done

   c. **If an artifact requires user input** (unclear context):
      - Use **AskUserQuestion tool** to clarify
      - Then continue with creation

5. **Show final status**
   ```bash
   openspec status --change "<name>"
   ```

**Output**

After completing all artifacts, summarize:
- Change name and location
- List of artifacts created with brief descriptions
- What's ready: "All artifacts created! Ready for implementation."
- Prompt: "Run `/opsx:apply` or ask me to implement to start working on the tasks."

**Artifact Creation Guidelines**

- Follow the `instruction` field from `openspec instructions` for each artifact type
- The schema defines what each artifact should contain - follow it
- Read dependency artifacts for context before creating new ones
- Use `template` as the structure for your output file - fill in its sections
- **IMPORTANT**: `context` and `rules` are constraints for YOU, not content for the file
  - Do NOT copy `<context>`, `<rules>`, `<project_context>` blocks into the artifact
  - These guide what you write, but should never appear in the output

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
- Create ALL artifacts needed for implementation (as defined by schema's `apply.requires`)
- Always read dependency artifacts before creating a new one - re-read from disk, not from conversation memory (files may have changed since you last saw them)
- If context is critically unclear, ask the user - but prefer making reasonable decisions to keep momentum
- If a change with that name already exists, suggest continuing that change instead
- Verify each artifact file exists after writing before proceeding to next
