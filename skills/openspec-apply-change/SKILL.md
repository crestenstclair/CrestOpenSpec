---
name: openspec-apply-change
description: Implement tasks from an OpenSpec change. Use when the user wants to start implementing, continue implementation, or work through tasks.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Implement tasks from an OpenSpec change.

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `acceptance`, `archive`, `doctor`, `context`). Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx:apply <other>`).

2. **Check status to understand the schema**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to understand:
   - `schemaName`: The workflow being used (e.g., "spec-driven")
   - `planningHome`, `changeRoot`, and `actionContext`: planning scope and edit constraints
   - Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)

3. **Get apply instructions**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns:
   - `context`: project guidance and, when present, the evaluated CUE architecture with its relationship index
   - `contextFiles`: artifact ID -> array of concrete file paths (varies by schema - could be proposal/specs/design/tasks or spec/tests/implementation/docs)
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If `state: "blocked"` (missing artifacts): show message, suggest using openspec-continue-change
   - If `state: "all_done"`: skip task execution and proceed directly to end-of-execute acceptance
   - Otherwise: proceed to implementation

4. **Read project context and context files**

   Read and follow `context` first. When it contains a CUE architecture, treat the resolved model and relationships as authoritative constraints on implementation; edit the listed CUE sources only when the planned architecture itself changes.
   Read every file path listed under `contextFiles` from the apply instructions output.
   The files depend on the schema being used:
   - **spec-driven**: proposal, specs, design, tasks
   - Other schemas: follow the contextFiles from CLI output

5. **Show current progress**

   Display:
   - Schema being used
   - Progress: "N/M tasks complete"
   - Remaining tasks overview
   - Dynamic instruction from CLI

6. **Implement tasks (loop until done or blocked)**

   For each pending task:
   - Show which task is being worked on
   - Make the code changes required
   - Keep changes minimal and focused
   - Mark task complete in the tasks file: `- [ ]` → `- [x]`
   - Continue to next task

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Error or blocker encountered → report and wait for guidance
   - User interrupts

7. **At the end of execute/apply, run acceptance**

   - If implementation paused or any task remains incomplete, show status and stop without claiming execution acceptance.
   - Once every task is complete, apply the full end-of-execute acceptance contract below.
   - Run semantic review and `openspec acceptance "<name>" --json` once here, after implementation and before reporting the execute phase complete.
   - If either layer blocks, continue repairing in the execute phase when possible; otherwise report the exact blocker and leave execution incomplete.
   - Only a passing semantic and deterministic result permits the execute/apply phase to be reported complete and handed to the user for review and archive approval.

## End-of-execute adversarial acceptance

Treat semantic review and deterministic acceptance as separate, mandatory layers. The CLI proves only declared deterministic gates; it does not establish semantic implementation conformance.

### 1. Establish authority and applicability

Read the evaluated CUE context before interpreting proposal, design, specs, tasks, implementation, or tests. Build an obligation ledger for every relevant architecture declaration, relationship, layer, boundary, resource, asset, validation, witness, requirement, and task. Classify each item exactly as:

- `CURRENT_SLICE`: required by this change now.
- `EVERGREEN_INVARIANT`: required in every phase, including this change.
- `DEFERRED_SCOPE`: authorized roadmap work that is not required now.
- `UNAUTHORIZED_EARLY_SCOPE`: behavior implemented before its authorized phase and in conflict with current authority.

Only an applicable current-slice or evergreen contradiction, unauthorized early scope, required proof gap, or failed deterministic gate may block. Missing deferred functionality is never a blocker; record it separately as `DEFERRED_NOT_APPLICABLE` or omit it. A future risk may be `INFORMATIONAL_FUTURE_RISK`, but it cannot reduce present acceptance.

### 2. Use evidence-complete findings

Classify semantic findings as `BLOCKING_CURRENT_VIOLATION`, `BLOCKING_EVERGREEN_VIOLATION`, `BLOCKING_REQUIRED_PROOF_GAP`, `DEFERRED_NOT_APPLICABLE`, or `INFORMATIONAL_FUTURE_RISK`. Report unauthorized early scope through the applicable current or evergreen blocking class; do not invent another finding class.

Every blocker must include all of the following:

1. the exact evaluated-CUE or current OpenSpec authority citation;
2. applicability classification and rationale;
3. production implementation evidence with concrete paths or runtime trace;
4. a falsifiable contradiction or precisely missing required proof;
5. the exact controlled proof command and the production-seam witness it exercises (if execution cannot complete, report the attempted command and preserve the gap as blocking evidence);
6. the observed result, not an expected or inferred result;
7. severity and a scoped repair direction.

Keyword searches, name similarity, architectural suspicion, a success string, missing future functionality, or lack of investigation are not proof. Do not turn uncertainty into a blocker. Prefer production execution and controlled negative witnesses over mocks that bypass the production seam or tests that only construct a component.

### 3. Build the architecture-conformance matrix

For every `CURRENT_SLICE` obligation and `EVERGREEN_INVARIANT`, map the evaluated declaration to its production composition, runtime behavior, and behavioral witness. Include every applicable port, layer, composition decision, prepared-runtime constraint, failure channel, and validation declaration. Local component correctness is insufficient when production composition drops, bypasses, overwrites, or makes the contract unreachable.

Apply every guard below:

#### composition-root-and-dependency-direction

For each declared port or injected dependency, identify the architecture owner that selects and constructs the concrete implementation, the production composition site that supplies it, the application service that consumes it, and the resulting production dependency direction. Verify that production uses the supplied dependency and does not construct, import, or select an adapter internally when the evaluated architecture assigns that choice to a composition root. Verify that the port is not declaration-only or test-only while production bypasses it. This is conditional on the applicable architecture; do not invent a blanket dependency-injection rule.

Require a production-composition witness that substitutes or deliberately mismatches the dependency at the declared port and observes the specified typed acceptance or rejection. A concrete-adapter unit test is not sufficient.

#### negotiation-before-preparation

For every artifact whose validity depends on a runtime-selected value, trace the exact order: negotiate or discover -> validate -> prepare a complete compatible artifact -> start runtime processing -> check later runtime values against the prepared contract. Cover a supported non-default negotiated value and relevant capacity boundaries. Block defaults or requested values used before negotiation, ignored actual values, incompatible preparation, silent truncation, silent padding, or degraded fallback. Unsupported configurations must fail visibly before processing starts.

#### asynchronous-runtime-failure

Trace startup failures and post-start failures from callbacks, futures, event streams, worker completions, device notifications, and background tasks into the declared bounded status, error transport, state transition, recovery, or user-visible boundary. Block an ignored callback argument, empty error handler, detached failed task, caught-and-discarded exception, unconditional success conversion, or silent output. Require a controlled negative witness that injects failure after successful startup and proves the exact production observation or recovery behavior.

#### end-to-end-failure-observability

Trace every contractually observable typed status or error through every production caller. Block discarded results, unused booleans, caught-but-unrecorded failures, or substitution of ordinary success. Enter through the production composition seam and independently prove both (a) no forbidden mutation, routing, or fallback and (b) the required error, status, state, or counter observation. Either assertion alone is incomplete; a direct component test does not cover a production caller that erases the result.

#### validation-declaration-integrity

Build the inventory from `completion.projectChecks` and test-bearing validations attached to every applicable CUE resource, relationship, capability, invariant, witness, or acceptance asset. Record exact validation identity, declaration location, owner, argument vector, provider, opaque selector, applicability, and execution provenance. Every applicable declaration is independently binding. A broad suite cannot rehabilitate a targeted validation that selects zero tests, and evidence for a broad or different selector cannot satisfy the targeted declaration. Missing applicability metadata, orphaned evidence references, duplicated identities, and ambiguous ownership fail closed according to the evaluated schema.

Do not add AST assumptions, framework names, method spellings, runner-name guesses, or ecosystem heuristics to deterministic acceptance. A project that wants machine-enforced semantic or source analysis must declare an executable validation or explicit provider. Unsupported inference is never a deterministic pass.

### 4. Run deterministic acceptance

Run `openspec acceptance "<name>" --json` with the selected store flag, if any. Preserve its complete result as the deterministic layer. A command exit of zero is not enough for a test-bearing validation: its declared provider must return trustworthy, selector-matched evidence with a nonzero executed count and satisfy its own assertions. Do not reuse evidence between different invocations or selectors.

### 5. Decide and report

Report the obligation ledger, architecture-conformance matrix, evidence-complete semantic findings, deterministic acceptance result, and final execution status separately. Put deferred and informational observations in a non-blocking section. Never report the execute/apply phase complete while any applicable semantic blocker or deterministic gate fails. Repair the implementation or its authoritative artifacts and rerun execute/apply or explicit verify; later archive approval does not rerun or override this work.

**Output During Implementation**

```
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete
```

**Output On Completion**

```
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete ✓
**Execution acceptance:** passed ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

Implementation and end-of-execute acceptance are complete. Ready for user review and archive approval; archive will not rerun acceptance.
```

**Output On Pause (Issue Encountered)**

```
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

**Guardrails**
- Keep going through tasks until done or blocked
- Always read context files before starting (from the apply instructions output)
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Run the full acceptance contract only when every task is complete, including when apply begins in `all_done` state
- Do not report implementation complete or suggest archive while end-of-execute acceptance is blocked
- Pause on errors, blockers, or unclear requirements - don't guess
- Use contextFiles from CLI output, don't assume specific file names

**Fluid Workflow Integration**

This skill supports the "actions on a change" model:

- **Can be invoked anytime**: Before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions
- **Allows artifact updates**: If implementation reveals design issues, suggest updating artifacts - not phase-locked, work fluidly
