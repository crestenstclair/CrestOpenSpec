# Prompt: Language-Agnostic Adversarial Acceptance Gates

Work in `~/workspace/crestopenspec`.

## Objective

Integrate a phase-aware adversarial implementation review into OpenSpec acceptance, and make all of the following mandatory acceptance gates:

- successful CUE architecture evaluation;
- strict OpenSpec validation;
- execution of every declared project completion check;
- assertion evaluation for each executed check;
- proof that every test-bearing check executed at least one test.

The implementation must be language-, build-system-, and test-runner-agnostic. Project-specific behavior belongs behind explicit extension points, never in the acceptance model itself.

## Preflight and worktree isolation

1. Read every applicable `AGENTS.md`.
2. Inspect `git status`, `openspec list --json`, and `openspec context --json`.
3. The source ref must contain the in-progress CUE bridge and architecture-context work. Do not implement in a dirty checkout and do not stash, copy, discard, or overwrite uncommitted work. If that work is not committed, stop and report the exact prerequisite.
4. Create a dedicated sibling worktree and branch from the committed source ref, for example:
   - worktree: `../crestopenspec-adversarial-acceptance`
   - branch: `codex/adversarial-acceptance-gates`
5. Inspect the active `track-spec-progress` change. Do not silently broaden or replace it. Reuse a shared executable-check service if compatible, while preserving its rule that ordinary progress and context reads never execute project commands.
6. Use OpenSpec itself for this work. Create a new change such as `add-adversarial-acceptance-gates`, complete its proposal, design, delta specs, and tasks, validate it strictly, and then implement it. Do not use legacy crest-spec tooling.

Preserve unrelated user work and existing behavior for projects that do not declare CUE architecture or executable acceptance gates.

## Existing behavior to reconcile

- CUE is evaluated and injected into planning, exploration, apply, and verify context.
- Invalid or conflicting CUE already stops those context-producing paths.
- `/opsx:verify` is currently an advisory agent workflow in the expanded profile.
- It can declare readiness without executing `completion.projectChecks`.
- Archive validates OpenSpec deltas and task state but does not execute CUE project checks, and some paths allow validation to be skipped or accepted with warnings.
- The proposed progress command keeps normal reads non-executing and runs declared checks only through an explicit action. Preserve that trust boundary.

## Acceptance has two distinct layers

Implement and document two layers without conflating them:

1. **Deterministic acceptance gates** implemented in core code, producing structured evidence and an enforceable exit status.
2. **Adversarial semantic review** implemented through shared agent-workflow instructions, producing evidence-backed findings about implementation conformance.

Do not claim that command success proves semantic conformance. Do not let an agent's prose substitute for executable proof.

## Phase-aware applicability

Before reporting a contract violation, construct an obligation ledger from the repository's declared authority documents, evaluated CUE, the selected OpenSpec change and its artifacts, and the implementation diff.

Classify every reviewed obligation as exactly one of:

1. `CURRENT_SLICE`
   - Explicitly required by the selected increment, its evaluated CUE, or its OpenSpec proposal, specs, design, or tasks.

2. `EVERGREEN_INVARIANT`
   - A master safety, ownership, domain, dependency, compatibility, or architecture rule that applies to every implemented slice even if the complete product capability is scheduled later.

3. `DEFERRED_SCOPE`
   - A later roadmap phase, explicit non-goal, or future capability that the selected slice does not claim to implement.

4. `UNAUTHORIZED_EARLY_SCOPE`
   - Later functionality implemented prematurely in a way that contradicts current exclusions or the master architecture.

Only the following may block acceptance:

- an implemented path contradicts a `CURRENT_SLICE` obligation;
- an implemented path contradicts an `EVERGREEN_INVARIANT`;
- an `UNAUTHORIZED_EARLY_SCOPE` implementation exists;
- evidence explicitly required for an applicable obligation is missing or invalid;
- a deterministic gate fails.

`DEFERRED_SCOPE` is never a failure merely because it is absent. Record it as `not applicable — deferred` or omit it. A deliberately narrow implementation is allowed; it must not redefine or contradict the master design.

A reported violation requires all of:

- a cited authoritative requirement;
- an explicit applicability classification and rationale;
- concrete evidence from a current or executed implementation path;
- a specific contradiction or falsifiable consequence.

Keyword searches, architectural suspicion, missing future features, or lack of investigation are not proven violations. Use these finding classes:

- `BLOCKING_CURRENT_VIOLATION`
- `BLOCKING_EVERGREEN_VIOLATION`
- `BLOCKING_REQUIRED_PROOF_GAP`
- `DEFERRED_NOT_APPLICABLE`
- `INFORMATIONAL_FUTURE_RISK`

## Deterministic acceptance service

Create one core acceptance service with a coherent CLI surface. Prefer `openspec acceptance <change-name> [--json]` unless repository conventions identify a clearly better, non-conflicting name.

The service must:

1. Resolve repositories and stores through existing canonical root-selection behavior.
2. Evaluate the complete top-level CUE package in memory.
3. Fail closed on bridge errors, conflicts, incomplete CUE, invalid output, or unresolved architecture.
4. Strictly validate the selected OpenSpec change and every canonical specification affected by it using shared validator code.
5. Provide a project/release mode that strictly validates all applicable OpenSpec material.
6. Resolve every `completion.projectChecks` reference to exactly one project-scope validation. Missing, duplicated, malformed, or ambiguous references fail acceptance.
7. Execute every resolved project check from its declared argument vector:
   - never use shell interpolation;
   - use an explicit canonical working directory;
   - enforce the declared timeout and resource limits;
   - capture exit, signal, timeout, stdout, and stderr;
   - evaluate every declared assertion;
   - treat nonzero exit, signal termination, timeout, or failed assertion as blocking.
8. Return nonzero whenever any mandatory gate fails.
9. Produce deterministic human output and exactly one documented JSON result in JSON mode.
10. Include execution provenance without recording environment secrets: validation ID, argument vector, working directory, timing, termination state, assertion results, test evidence, and bounded stdout/stderr diagnostics.
11. Remain transient. Do not add a database, cache, generated status manifest, daemon, or mutable verification ledger.

Only explicit acceptance/check operations may execute repository-declared commands. `context`, `list`, ordinary progress reads, planning, and static validation must not unexpectedly execute them.

## Language-agnostic executable checks

Model command execution, assertions, and test evidence as independent concepts:

- A command runner executes an argument vector and produces a neutral process result.
- Assertion evaluators consume that result and implement declared assertions.
- Test-evidence providers determine whether a test-bearing validation actually executed tests.

Core acceptance types must not contain names, flags, output grammar, or assumptions from any specific programming language, package manager, compiler, build tool, or test runner.

Project-specific parsing or invocation behavior must live behind a provider interface and registry. Providers may be built in, installed, or selected by explicit validation metadata, but they are peers; no ecosystem is the default architecture.

Prefer explicit structured metadata such as the following conceptual contract, refining the exact schema during design:

```yaml
proof:
  type: test-suite
  provider: <provider-id>
  minimumExecuted: 1
```

The neutral result should be able to report:

```yaml
testEvidence:
  provider: <provider-id>
  discovered: <integer-or-unknown>
  executed: <integer>
  passed: <integer-or-unknown>
  failed: <integer-or-unknown>
  skipped: <integer-or-unknown>
  source: <structured explanation of how the count was established>
```

The exact serialized shape may differ, but its semantics must remain tool-independent.

## Mandatory nonzero-test validation

A successful process exit is insufficient for a test-bearing check.

For every validation declared as a test suite:

- require trustworthy evidence that `executed >= minimumExecuted`;
- default `minimumExecuted` to at least one;
- do not count discovered, filtered, skipped, ignored, compiled, or merely enumerated tests as executed;
- fail if the provider cannot establish an executed count;
- fail if the evidence is malformed, internally inconsistent, or reports zero execution;
- preserve the process result and test evidence as separate report fields.

Do not infer test success from validation descriptions, filenames, success markers, or arbitrary human-readable text in core code. If a provider parses runner-specific output, that parser must be isolated in the provider and covered by provider-specific tests.

Non-test integration checks, smoke programs, linters, compilers, formatters, and other executable proofs must not be subjected to test-count rules unless they explicitly declare test-suite proof.

Design the provider registry so support for a new test runner does not require changes to the acceptance service, archive flow, report model, or CUE/OpenSpec semantics.

## Adversarial semantic review

Refactor verify and archive workflow templates to share one acceptance-review contract instead of duplicating prose that can drift.

The review must:

- read evaluated CUE before reviewing artifacts and implementation;
- build the phase-aware obligation ledger above;
- trace current behavior through declared relationships, layers, boundaries, resources, assets, validations, witnesses, and production paths;
- prefer production execution and controlled negative proof over success strings, mocks that bypass the behavior, or construction-only tests;
- run the deterministic acceptance service;
- never report `ready to archive` when a deterministic gate or applicable blocking finding fails;
- include authority citation, applicability, implementation evidence, proof command, observed result, severity, and repair direction for every blocking finding;
- list deferred observations separately and state explicitly that they do not affect acceptance.

Integrate the shared review contract into:

- source and generated `/opsx:verify` skill/command templates;
- `/opsx:archive`;
- bulk archive where applicable;
- documentation;
- generated-skill and template-parity tests.

## Archive enforcement

For CUE-governed projects:

- Core `openspec archive` must run deterministic acceptance before modifying canonical specs or moving a change.
- `/opsx:archive` must perform the shared adversarial review and deterministic gates before archiving.
- Bulk archive must enforce the same rule independently for each change and report partial eligibility without archiving failures.
- `--yes`, incomplete-task confirmation, warning acceptance, and existing validation-skip behavior must not bypass CUE evaluation, strict OpenSpec validation, project checks, assertions, or test evidence.
- Make backward compatibility for existing validation-skip flags explicit in the design. At most they may retain legacy behavior for projects outside the new gate contract; they cannot mean “skip mandatory acceptance.”
- No archive mutation may occur before all mandatory checks pass.

Projects without CUE or without the new executable-gate declarations must preserve documented legacy behavior and report unavailable gates as `not applicable`, not silently pretend they ran.

Keep the enforcement boundary honest: a direct CLI archive can enforce deterministic gates but cannot itself perform semantic agent reasoning. Document that distinction rather than claiming otherwise.

## Security and execution constraints

- Treat repository-declared commands as trusted only after the user invokes an explicit command-running workflow.
- Execute argument vectors directly without a shell.
- Do not interpolate repository data into command strings.
- Apply timeouts and bounded output capture.
- Do not include environment values or secrets in reports.
- Preserve platform-neutral path handling and canonical path identity.
- Return structured failure for unavailable executables and unsupported evidence providers.
- Never convert an unsupported proof into a passing or skipped gate.

## Required tests

Use self-contained temporary fixture projects and neutral fixture executables. The acceptance test suite must not require a particular application language or globally installed project toolchain.

Cover at least:

- valid and invalid CUE evaluation;
- missing, duplicated, malformed, and ambiguous project-check references;
- command success, nonzero exit, signal, timeout, and assertion failure;
- a test provider reporting zero executed tests while the process exits successfully;
- a provider reporting positive execution;
- malformed or inconsistent test evidence;
- a test-bearing check with no available provider failing closed;
- provider registration and selection without changes to core acceptance logic;
- non-test executable checks remaining unaffected by test-count enforcement;
- argument-vector safety and paths containing spaces;
- store-aware and canonicalized root behavior;
- one-document JSON failure output and nonzero status;
- archive blocked before any filesystem mutation;
- confirmation flags unable to bypass mandatory gates;
- projects without CUE retaining documented behavior;
- generated verify/archive skill and command parity;
- phase-aware wording that expressly forbids treating deferred roadmap scope as a violation.

Follow `test/AGENTS.md` for cross-platform paths and canonicalization.

## Verification before handoff

Run and report:

- every build required by the repository;
- focused tests for CUE evaluation, acceptance execution, evidence providers, CLI output, archive behavior, and generated templates;
- the complete repository test suite;
- linting and type checking;
- strict validation of the new OpenSpec change;
- the new acceptance command against self-contained passing, failing, unsupported-provider, and zero-test fixtures.

Do not edit a downstream application repository as part of this implementation. Downstream repositories may be used read-only for optional manual dogfooding only after self-contained tests pass.

## Final handoff

Report:

- the OpenSpec change name;
- the chosen architecture and why it is language agnostic;
- core interfaces and extension points;
- files changed;
- exact verification commands and results;
- example JSON for a successful process that fails acceptance because it executed zero tests;
- confirmation that adding another test runner requires only a provider, not changes to acceptance or archive logic;
- confirmation that deferred roadmap functionality cannot produce a blocking violation;
- confirmation that no user-owned work was reverted or overwritten.
