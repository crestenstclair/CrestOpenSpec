## Context

The committed CUE bridge evaluates the complete top-level `spec/*.cue` package in memory and supplies its concrete `project` value plus a relationship index to planning, exploration, apply, and verify instructions. The active `track-spec-progress` proposal intentionally keeps ordinary reads non-executing and reserves command execution for an explicit `--check` action. Apply currently marks task completion without a final evidence boundary, while expanded review workflows use heuristics that can confuse missing future scope with a current defect. Archive is a later approval and record mutation and should not repeat implementation work.

Acceptance therefore crosses four existing boundaries: canonical root/store selection, evaluated CUE, shared OpenSpec validation, and execute/apply completion. It must also support arbitrary project toolchains without importing their terminology or output formats into the core model. Repository-declared commands are trusted only after a user invokes an explicit command-running workflow.

## Goals / Non-Goals

**Goals:**

- Provide one transient deterministic acceptance service and `openspec acceptance` surface for change and project/release scope.
- Fail closed for any applicable CUE, OpenSpec, process, assertion, or test-evidence failure.
- Keep command execution, assertion evaluation, and test-evidence extraction independent and extensible.
- Prove nonzero test execution only when a validation explicitly declares test-suite proof.
- Enforce the same deterministic service at the end of execute/apply in projects that declare the acceptance contract.
- Give execute/apply and explicit verify one shared phase-aware adversarial review contract without claiming that CLI success proves semantic conformance.
- Keep archive and bulk archive focused on user approval and record mutation without repeating implementation review.
- Preserve canonical root identity, cross-platform paths, bounded diagnostics, single-document JSON, and legacy behavior outside the declared contract.

**Non-Goals:**

- Implement the separate `track-spec-progress` projection or cause ordinary progress/context/list/static validation reads to execute commands.
- Embed knowledge of a programming language, package manager, compiler, build system, test runner, or runner-specific output grammar in acceptance core or workflow instructions.
- Persist acceptance state, introduce a database/cache/daemon, or generate a verification ledger.
- Make a direct CLI process perform semantic agent reasoning.
- Infer test execution from descriptions, paths, success strings, discovered tests, or arbitrary prose.

## Decisions

### 1. Treat deterministic gates and semantic review as separate products

`AcceptanceService` returns enforceable structured evidence and a pass/fail status. A shared workflow fragment, `EXECUTION_ACCEPTANCE_CONTRACT`, tells agents how to construct an obligation ledger and report semantic findings. The fragment is consumed at the end of execute/apply and by explicit verify, and therefore by their generated skills/commands. Archive and bulk archive deliberately do not consume it.

The CLI report states that semantic review is outside its enforcement boundary. Execute-phase completion requires both a passing deterministic report and no applicable blocking semantic finding. Neither layer can substitute for the other.

Alternative considered: put semantic heuristics in the CLI. Rejected because phase applicability and implementation intent require repository reasoning that cannot be reduced to deterministic command success.

### 2. Make applicability explicit and fail malformed declarations closed

The service first evaluates the complete top-level CUE package through `loadCueArchitecture`. A project declares the new executable-gate contract when the evaluated `project` contains `completion.projectChecks` or any attached validation contains a `proof` field; an empty project-check array is still an explicit declaration. No CUE package, or valid CUE with neither declaration form, yields `not_applicable` for executable acceptance and lets execute/apply complete without project-declared commands. Once either declaration form is present, malformed values cannot escape enforcement.

Any top-level CUE file that fails bridge execution, unification, concreteness, JSON rendering, or project resolution produces a failed architecture gate. A malformed `completion.projectChecks` declaration or unresolved validation is also a blocking architecture/declaration failure.

This compatibility rule gives existing projects an opt-in boundary without silently reporting gates as passed. It also prevents a malformed declaration from being treated as an opt-out.

### 3. Use a strict, tool-neutral evaluated CUE contract and validation inventory

Only top-level `project.validations` entries are project-scope candidates. Object and array forms are supported, but every referenced validation must resolve by canonical `id` to exactly one entry whose explicit `scope` is `project`. Duplicate references, duplicate IDs, missing references, local-scope references, non-string/empty references, or malformed validation entries fail before command execution.

The inventory also walks evaluated `validations` attachments below project scope, including attachments owned by resources, relationships, capabilities, invariants, witnesses, and acceptance assets. String-valued validation lists remain evidence references, not declarations. Every attached test-bearing declaration is independently binding when its explicit applicability selects the current scope. Attached declarations use `scope: attached`; their evaluated parent path is their immutable owner and their exact field path is their declaration location.

Attached test applicability is explicit and language-neutral:

```yaml
applicability:
  mode: always
```

or:

```yaml
applicability:
  mode: changes
  changes: [add-example]
```

Change scope includes `always` plus an exact selected change match. Project/release scope includes every explicitly applicable attachment. Missing/malformed applicability on an attached test fails closed. Evidence validation references must resolve to one global validation identity; orphaned references, identities owned at multiple locations, and ambiguous ownership fail inventory construction.

The concrete contract is:

```yaml
completion:
  projectChecks: [validation.tests]
validations:
  tests:
    id: validation.tests
    scope: project
    command: [<executable>, <arg>, ...]
    workingDirectory: .
    limits:
      timeoutMs: 60000
      stdoutBytes: 262144
      stderrBytes: 262144
    assertions:
      - type: exit-code
        equals: 0
    proof:
      type: test-suite
      provider: structured-json-v1
      minimumExecuted: 1
      selector:
        kind: declared-project-selector
        value: complete-suite
      options:
        stream: stdout
```

`command` is a non-empty string argument vector; it is never converted to a shell string. `workingDirectory` is resolved from the canonical project root, must exist, and must remain inside that root after real-path canonicalization. `limits` is required and contains positive bounded integers. Assertions are optional declarations, but the assertion phase runs for every executed check and evaluates every entry. `proof` is omitted for non-test checks; declaring `test-suite` makes provider evidence and an opaque structured `selector` mandatory. Core compares the provider-returned selector to the declaration exactly; it never interprets runner syntax.

Alternative considered: accept package-script/test-runner shorthand. Rejected because it would make one ecosystem the architecture and would couple CUE semantics to invocation conventions.

### 4. Keep orchestration and evidence in a neutral report model

The service is dependency-injected with a command runner, assertion registry, test-evidence registry, and CUE loader. The versioned report contains:

- scope, selected change (when any), canonical root provenance, applicability, overall result, and deterministic gate results;
- each validation ID, declaration location and owner, argument vector, canonical working directory, enforced limits, duration, exit/signal/timeout/spawn/output-limit state, and bounded stdout/stderr diagnostics;
- one result for every declared assertion;
- process result and test evidence as separate fields;
- stable diagnostic codes and ordering without environment values.

Human output renders the same report in fixed gate/check order. JSON mode prints exactly one JSON document to stdout and sets a nonzero exit code whenever `passed` is false. Timing values are measured evidence; deterministic output means stable schema, ordering, classification, and rendering for the same result, not identical wall-clock durations.

### 5. Reuse the strict Validator and validate future archive state in memory

Change scope uses `Validator(true)` to validate the selected change deltas and proposal, discovers every affected canonical spec through the existing spec-update machinery, strictly validates each existing canonical spec, builds each post-delta spec in memory, and strictly validates that future content before any write.

Project/release scope strictly validates every active change and every canonical spec through the same shared validator. It then runs the same project completion checks once. Validation reports are normalized into acceptance evidence instead of invoking the CLI as a subprocess.

Alternative considered: shell out to `openspec validate`. Rejected because it would duplicate root selection/output handling and make one command's human formatting an internal protocol.

### 6. Execute with a direct, bounded command runner

`CommandRunner` receives a neutral execution request and returns a neutral process result. The Node implementation uses `spawn` with `shell: false`, an explicit canonical `cwd`, inherited execution environment, hidden Windows console, and no interpolation. It captures stdout/stderr independently up to their declared byte limits, records truncation, terminates the process on timeout or overflow, and records spawn errors, exit code, signal, and duration. It never serializes environment keys or values.

Unavailable executables, nonzero exit, signal termination, timeout, and output-limit termination are structured blocking failures. Assertions still receive the completed neutral result so every declared assertion has evidence even when the process gate fails.

### 7. Resolve assertions through an evaluator registry

An `AssertionEvaluatorRegistry` maps a generic `type` to an evaluator. Initial evaluators cover process-result concepts only: `exit-code`, `stdout-contains`, `stdout-not-contains`, `stderr-contains`, and `stderr-not-contains`. Unsupported or malformed declarations return failed assertion evidence; they are never skipped or treated as passing.

The acceptance service knows only the registry interface and `AssertionResult`, so new generic assertions do not change orchestration or execute/archive workflow templates.

### 8. Require explicit test-evidence providers and validate their evidence centrally

`TestEvidenceProviderRegistry` maps an explicit provider ID to a provider. A provider consumes the neutral process result plus opaque proof options and returns tool-independent evidence bound to the exact declared selector:

```yaml
provider: <provider-id>
selector: <opaque structured selector>
discovered: <integer or omitted>
executed: <integer>
passed: <integer or omitted>
failed: <integer or omitted>
skipped: <integer or omitted>
source: <structured JSON explanation>
```

Core validates exact selector equality, nonnegative integer counts, known passed/failed accounting, discovered counts, failed-test absence, and `executed >= minimumExecuted`. Unknown executed count, selector mismatch, malformed/inconsistent evidence, zero execution, provider error, or unsupported provider fails closed even if the process exited zero. Because each declaration owns its process/evidence result, a broad suite's count cannot satisfy another targeted declaration. Exact duplicate declarations may later share a frozen result by content identity, but the initial implementation executes them independently to avoid accidental evidence reuse.

The initial `structured-json-v1` provider is runner-neutral: explicit `options.stream` selects stdout or stderr, and the entire selected stream must be one JSON object in the neutral evidence shape. Runner-specific parsers can be separate provider modules registered through the same interface. Adding one requires provider implementation/registration only; acceptance, reports, CUE resolution, and execute/archive workflow orchestration do not change. No provider is inferred or selected as a default.

### 9. Preserve explicit execution and canonical root boundaries

`openspec acceptance <change> [--json] [--store <id>]` is the change surface. `openspec acceptance --project` and its `--release` alias select all applicable OpenSpec material; a change and project/release flag are mutually exclusive. The command uses existing canonical root/store resolution and reports root provenance.

Only direct `acceptance`, future explicit progress `--check`, and end-of-execute apply/explicit verify may invoke the runner. Context, list, planning, normal progress, instructions, static validation, and archive continue to call only the CUE loader/validator and never the runner.

### 10. Put acceptance at the end of execute/apply

When apply completes its final task—or begins with instructions already in `all_done` state—it applies the shared semantic contract and runs `openspec acceptance <change> --json`. A failing layer keeps execute/apply incomplete and returns the agent to the implementation repair loop. A passing result hands the completed implementation to the user for review and optional archive approval.

If implementation pauses with tasks remaining, final acceptance does not run. For a project where executable acceptance is `not_applicable`, the semantic layer still determines whether the current implementation satisfies applicable authority, while no repository-declared validation command is invented.

Archive and bulk archive summarize completion and delta-spec effects, obtain exact user approval, and invoke core archive. They do not rerun semantic review or deterministic acceptance. A user who wants a fresh functional review invokes explicit verify before deciding whether to approve archive.

### 11. Make the semantic review phase-aware and enforce architecture-drift guards

The shared review contract requires agents to read evaluated CUE before artifacts and implementation, then create an obligation ledger from authority documents, evaluated CUE, selected change artifacts, and implementation diff. Every obligation is exactly one of `CURRENT_SLICE`, `EVERGREEN_INVARIANT`, `DEFERRED_SCOPE`, or `UNAUTHORIZED_EARLY_SCOPE`. It also builds an architecture-conformance matrix linking each applicable port, layer, composition decision, prepared-runtime constraint, failure channel, and validation declaration to its production implementation and behavioral witness.

Four semantic guards apply only where evaluated architecture makes their premise applicable:

- **Composition root and dependency direction:** trace declared ownership, production construction/supply, consumption, bypasses, and layer direction. Construction inside an application service blocks only when architecture assigns selection elsewhere. Require a production-composition substitution/mismatch witness.
- **Negotiation before preparation:** trace actual runtime discovery, validation, complete compatible preparation, processing start, and later contract checks. Default-before-negotiation, ignored negotiated values, incompatible preparation, silent truncation/padding, and degraded fallback block. Require non-default and capacity-boundary witnesses.
- **Asynchronous runtime failures:** trace errors after successful startup through every callback/task/event entry point to the declared bounded observation/recovery path. Empty handlers, ignored failures, detached failed work, caught-and-discarded exceptions, and unconditional success block. Require a post-start controlled negative witness.
- **End-to-end failure observability:** trace typed failures through every production caller and separately prove both forbidden-mutation absence and the required error/status/counter observation. Direct component tests do not cover a production caller that erases the result.

Validation-declaration integrity is the bridge between layers: semantic review checks whether declarations and witnesses represent the applicable contracts, while deterministic inventory enforces each applicable invocation, assertion, selector, and test count. Source-language AST heuristics, framework names, method spellings, or ecosystem guesses never enter core acceptance; projects can declare an executable validation/provider when they want deterministic source analysis.

Only contradictions on implemented paths, unauthorized early implementation, required applicable proof gaps, and deterministic gate failures block. Absence of `DEFERRED_SCOPE` is expressly not a violation. Each blocking semantic finding must include authority citation, applicability rationale, current/executed implementation evidence, falsifiable contradiction, proof command, observed result, severity class, and repair direction. Keyword searches, suspicion, missing future functionality, and lack of investigation cannot establish a violation.

## Risks / Trade-offs

- **[Risk] Existing CUE projects may contain a field named `completion.projectChecks` before adopting the full validation contract.** → Treat field presence as an intentional enforcement boundary, document the schema, and fail malformed declarations with actionable diagnostics instead of silently executing or bypassing them.
- **[Risk] A child process can emit large output or ignore termination.** → Enforce independent byte caps and timeout, issue termination once, bound retained diagnostics, and report termination state. Tests use short-lived controlled fixtures.
- **[Risk] Provider output may claim impossible counts.** → Apply central consistency rules after provider parsing; providers cannot mark their own evidence accepted.
- **[Risk] A broad suite can produce valid counts while a targeted selector is stale.** → Require opaque selector identity in both declaration and provider evidence, execute every applicable attachment independently, and reject selector mismatch.
- **[Risk] Future resource validations could be executed in the wrong phase.** → Require explicit attached-test applicability metadata and fail malformed applicability instead of interpreting roadmap prose.
- **[Risk] Strict validation can expose warnings in affected baseline specs.** → Report each exact validator issue and require repair for governed acceptance; do not downgrade warnings in mandatory mode.
- **[Risk] End-of-execute acceptance can lengthen the final apply turn.** → Run it only after all tasks complete, keep failures inside the active repair context, and retain explicit verify for deliberate later review without burdening archive.
- **[Trade-off] The neutral structured provider requires projects to emit or adapt to a small JSON proof protocol.** → This supplies trustworthy evidence without making any runner a default; runner-specific adapters remain isolated providers.

## Migration Plan

1. Land the neutral types, registries, runner, declaration resolver, validators, service, renderers, and CLI without enabling any read-path execution.
2. Add self-contained acceptance fixtures and verify pass/failure/provider/nonzero-test behavior, independent resource-level execution, and selector binding.
3. Integrate the shared review contract and deterministic service at all-done apply completion; keep blocked work in the implementation repair loop.
4. Reuse the contract for explicit verify, simplify archive/bulk archive to approval and record mutation, regenerate committed skills/commands, and update parity tests, language-neutral conforming/violating fixtures, and documentation.
5. Projects adopt executable enforcement by adding a concrete `completion.projectChecks` array and conforming validation declarations. Rollback is removal of that explicit declaration; semantic end-of-execute review remains applicable to implemented scope.
