# Acceptance Gates

OpenSpec acceptance has two deliberately separate layers:

1. **Deterministic acceptance** is core CLI code. It evaluates CUE, strictly validates OpenSpec material, executes every applicable declared validation, checks assertions and test evidence, and returns an enforceable exit status.
2. **Adversarial semantic review** is the shared agent workflow used by `/opsx:verify`, `/opsx:archive`, and `/opsx:bulk-archive`. It traces architecture through production composition and behavior. CLI success never claims that this semantic review passed.

Both layers must pass before an agent reports a governed change ready to archive.

## Running deterministic acceptance

```bash
# One change
openspec acceptance add-dark-mode
openspec acceptance add-dark-mode --json

# Every active change and canonical spec
openspec acceptance --project --json
openspec acceptance --release --json   # alias for --project

# A registered store
openspec acceptance add-dark-mode --store team-plans --json
```

A change name and `--project`/`--release` are mutually exclusive. JSON mode prints exactly one versioned report. Any mandatory failure sets a nonzero exit status. The report always states that semantic conformance was not evaluated by the deterministic command.

Normal reads remain non-executing: `list`, `context`, `status`, `instructions`, planning, ordinary progress reads, and static `validate` do not run repository-declared commands. Only an explicit command-running workflow such as `acceptance` or `archive` does so.

## When the gate applies

The CLI evaluates the complete top-level `spec/*.cue` package. Executable acceptance is declared when the concrete `project` contains either:

- `completion.projectChecks`, including an explicitly empty array; or
- an attached validation with a `proof` field.

No CUE package, or valid CUE containing neither declaration form, reports deterministic execution as `not_applicable` and retains legacy archive behavior. CUE evaluation failure and malformed declared contracts fail closed.

## Language-neutral declaration schema

This example shows a project check and an independently binding resource test:

```cue
package architecture

project: {
  completion: projectChecks: ["validation.all"]

  validations: all: {
    id:               "validation.all"
    scope:            "project"
    command:          ["./tools/neutral-check", "--all"]
    workingDirectory: "."
    limits: {
      timeoutMs:  60000
      stdoutBytes: 262144
      stderrBytes: 262144
    }
    assertions: [{type: "exit-code", equals: 0}]
    proof: {
      type:            "test-suite"
      provider:        "structured-json-v1"
      minimumExecuted: 1
      selector: {kind: "suite", value: "all"}
      options: stream: "stdout"
    }
  }

  resources: storage: validations: targeted: {
    id:               "validation.storage"
    scope:            "attached"
    applicability: {mode: "changes", changes: ["add-dark-mode"]}
    command:          ["./tools/neutral-check", "--resource", "storage"]
    workingDirectory: "."
    limits: {
      timeoutMs:  60000
      stdoutBytes: 262144
      stderrBytes: 262144
    }
    assertions: [{type: "exit-code", equals: 0}]
    proof: {
      type:            "test-suite"
      provider:        "structured-json-v1"
      minimumExecuted: 1
      selector: {kind: "resource", value: "storage"}
      options: stream: "stdout"
    }
  }
}
```

Top-level `project.validations` supply project-check declarations. A project check must resolve by ID to exactly one top-level declaration with `scope: "project"`.

The inventory also walks every nested `validations` attachment, including resources, relationships, capabilities, invariants, witnesses, and acceptance assets. An attached test declaration has `scope: "attached"`; its exact evaluated parent path is its owner and its exact field path is its declaration location. Applicability is explicit:

- `{mode: "always"}` applies in every scope.
- `{mode: "changes", changes: ["change-id"]}` applies to matching change runs and is conservatively included in project/release runs.

Once the contract is governed, missing IDs, duplicate identities, ambiguous owners, orphaned string references, malformed declarations, or missing/malformed attached-test applicability block all execution. Core does not infer roadmap intent from prose.

Every applicable declaration is a separate gate. A broad project suite cannot cover an attached target by implication. Identical commands currently execute independently, which keeps their assertions and evidence records isolated.

## Process and assertion boundary

`command` is a non-empty argument vector, not a shell string. Core starts it with shell interpolation disabled and records the exact arguments. `workingDirectory` must exist and resolve, through aliases and symlinks, inside the canonical project root.

Every declaration supplies positive limits. Core caps them at 30 minutes and 16 MiB per output stream, captures stdout and stderr independently, and terminates on timeout or overflow. Reports preserve bounded output, duration, exit code, signal, timeout, overflow, and spawn errors, but never serialize environment keys or values.

Built-in generic assertions are `exit-code`, `stdout-contains`, `stdout-not-contains`, `stderr-contains`, and `stderr-not-contains`. Every declared assertion is evaluated even after process failure. Unsupported, malformed, throwing, or false assertions fail closed.

## Trustworthy test evidence

A validation is treated as a test suite only when it declares `proof.type: "test-suite"` and explicitly names a provider. Non-test checks do not need test counts.

The built-in `structured-json-v1` provider reads one complete JSON document from the explicitly selected stdout or stderr stream:

```json
{
  "selector": { "kind": "resource", "value": "storage" },
  "discovered": 3,
  "executed": 2,
  "passed": 2,
  "failed": 0,
  "skipped": 1,
  "source": { "report": "project-owned adapter output" }
}
```

Core, not the provider, enforces nonnegative integer counts, count consistency, no failed tests, and `executed >= minimumExecuted >= 1`. Discovered, filtered, skipped, ignored, compiled, or merely enumerated tests do not count as executed.

The evidence selector must deep-equal the declaration's opaque selector. A count from a broad or related invocation cannot satisfy a targeted declaration. This successful process therefore still fails acceptance:

```json
{
  "id": "validation.storage",
  "declaration": {
    "kind": "attached_test",
    "owner": "project.resources.storage",
    "location": "project.resources.storage.validations.targeted"
  },
  "processPassed": true,
  "testEvidence": {
    "provider": "structured-json-v1",
    "minimumExecuted": 1,
    "selector": { "kind": "resource", "value": "storage" },
    "status": "failed",
    "evidence": {
      "provider": "structured-json-v1",
      "selector": { "kind": "resource", "value": "storage" },
      "executed": 0,
      "passed": 0,
      "failed": 0,
      "source": { "kind": "process-stream", "stream": "stdout" }
    },
    "diagnostics": [{
      "severity": "error",
      "code": "test_evidence_minimum_not_met",
      "message": "Executed 0 test(s); at least 1 must execute."
    }]
  },
  "passed": false
}
```

Runner-specific parsing belongs in a provider. Adding another runner requires implementing and registering a `TestEvidenceProvider`; it does not change acceptance orchestration, archive logic, CUE resolution, or the report model. No provider is inferred from command names, filenames, or output prose.

## Archive enforcement

Core `openspec archive` runs deterministic acceptance immediately after resolving the root and active change, before validation prompts, task confirmation, spec preparation or writes, archive-directory creation, or moving the change.

When acceptance is applicable and fails, archive returns nonzero and includes the complete report. `--yes`, incomplete-task confirmation, warning acceptance, `--skip-specs`, and `--no-validate` cannot bypass it. A failed gate leaves canonical specs, the active change, and the archive target unchanged.

For an inapplicable legacy project, those flags keep their existing meaning. For a governed passing project, they can still control legacy prompts or optional spec behavior after mandatory acceptance has passed.

## Adversarial semantic review

The agent reads evaluated CUE before artifacts and implementation. It classifies each obligation exactly once as `CURRENT_SLICE`, `EVERGREEN_INVARIANT`, `DEFERRED_SCOPE`, or `UNAUTHORIZED_EARLY_SCOPE`. Missing deferred functionality is never a blocker; it is reported as `DEFERRED_NOT_APPLICABLE` or omitted.

Blocking finding classes are `BLOCKING_CURRENT_VIOLATION`, `BLOCKING_EVERGREEN_VIOLATION`, and `BLOCKING_REQUIRED_PROOF_GAP`. Every blocker needs an authority citation, applicability rationale, production evidence, falsifiable contradiction or precise proof gap, the exact controlled proof command and production-seam witness, observed result, severity, and repair direction. If execution cannot complete, the attempted command and remaining proof gap stay explicit and blocking. Keyword suspicion, name matching, a success string, missing future work, or lack of investigation is not proof.

The review builds an architecture-conformance matrix and, where evaluated architecture supplies the premise, traces four guard families:

- **Composition root and dependency direction:** declared owner, production construction and supply, consuming service, bypasses, layer direction, and a production substitution/mismatch witness.
- **Negotiation before preparation:** discover or negotiate, validate, completely prepare, start, and check later values; cover a supported non-default value and capacity boundaries without silent truncation, padding, or fallback.
- **Asynchronous runtime failure:** startup and post-start error entry points through callbacks, futures, events, workers, and tasks to the declared observation or recovery boundary; use a controlled failure after startup.
- **End-to-end failure observability:** trace typed failure through every production caller and independently prove both forbidden-mutation absence and the required error, status, state, or counter observation.

Core acceptance contains no AST, framework, method-name, runner-name, or ecosystem heuristic for these semantic questions. A project can make additional analysis deterministic by declaring an executable validation or installing an explicit provider; unsupported inference never becomes a pass.
