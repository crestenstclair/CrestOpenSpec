## Why

CUE and OpenSpec can describe what the system should be, but they do not currently provide a trustworthy view of what has actually been planned, materialized, or verified. Users must inspect change tasks, source files, and validations separately, which makes it easy for declared architecture and implemented behavior to drift apart.

We need a deliberately coarse, evidence-based progress view. It must derive status from information the project already owns and report uncertainty honestly, rather than creating another ledger that agents must constantly synchronize.

## What Changes

- Add a read-only `openspec progress [<spec-or-resource>]` command with human and JSON output.
- Compute progress transiently from existing sources of truth:
  - OpenSpec change deltas, aggregate task completion, and archive state provide lifecycle evidence.
  - The evaluated CUE project and relationship index provide the declared architecture and traceability graph.
  - CUE assets, asset kinds, targets, and file patterns provide materialization evidence where the declaration is specific enough to resolve files.
  - CUE validations and witnesses provide verification coverage; checks run only through an explicit `--check` action.
- Report separate evidence dimensions instead of collapsing everything into an unjustified percentage:
  - **Lifecycle:** `untracked`, `planned`, `in-progress`, or `complete`.
  - **Materialization:** `unknown`, `absent`, or `present`.
  - **Verification:** `not-declared`, `not-run`, `passing`, `failing`, or `unsupported`.
- Derive a concise summary such as `declared`, `in-progress`, `present`, `verified`, or `unknown`, while always including the evidence that produced it.
- Reserve `verified` for currently passing declared checks. File presence, archived changes, and completed task checkboxes can never produce `verified` on their own.
- Use existing identity rather than introducing tracking IDs:
  - CUE resources use their canonical resource IDs.
  - OpenSpec requirements use the existing spec ID plus requirement heading used by delta specs.
  - Active changes are associated only through their delta specs and canonical IDs already named in proposal/design artifacts; the projection does not guess fuzzy relationships.
- Treat change task completion as a coarse change-level signal. Requirements and resources touched by the same change share that signal; no per-task-to-resource mapping is required.
- Report canonical specs or resources with insufficient history as `unknown`, not as unimplemented. Imported/baseline specifications must never acquire fabricated completion status.
- Surface a compact progress summary in `openspec list --specs` and in agent context so planning can distinguish existing, in-progress, and unknown areas before proposing work.
- Keep the default command read-only and non-executing. `--check` runs selected declared checks in the foreground, returns their results for that invocation, and does not record them anywhere.
- Surface conflicting lifecycle or verification evidence explicitly instead of choosing whichever signal looks most complete.
- Keep CUE and OpenSpec semantics intact: CUE remains the architectural source of truth; OpenSpec remains the change/spec/task workflow; progress is only a computed projection over both.
- Add explicit guardrails:
  - no SQLite, database, cache, daemon, or background scanner
  - no status fields written into CUE
  - no generated progress manifest
  - no second set of task checkboxes
  - no required per-file or per-symbol annotations
  - no claim that file existence proves behavioral correctness
  - no automatic execution of validation commands without `--check`

## Capabilities

### New Capabilities

- `spec-progress`: Evidence-based, transient progress reporting across OpenSpec specifications and evaluated CUE architecture resources.

### Modified Capabilities

- `cli-list`: Adds a compact, uncertainty-preserving progress summary when listing specifications.
- `context-injection`: Makes the derived progress summary available during exploration, artifact planning, and apply without persisting a parallel state model.

## Impact

- New progress projection code over existing OpenSpec change/spec parsers and the CUE architecture bridge.
- New CLI surface for `openspec progress`, including deterministic JSON suitable for agents and human-readable evidence summaries.
- Optional explicit execution of already-declared CUE validations and witnesses; read-only progress remains the default.
- Updates to spec listing and instruction context assembly.
- Cross-platform path resolution for asset-kind file patterns and validation execution.
- Tests covering unknown baselines, active and archived changes, partially completed tasks, CUE resource relationships, file presence, validation pass/fail, conflicting evidence, and projects without CUE.
- Documentation explaining what each signal proves—and what it does not prove.
