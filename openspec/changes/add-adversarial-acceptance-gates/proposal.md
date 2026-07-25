## Why

OpenSpec can currently declare architectural checks and an agent can advise that implementation is complete without executing those checks or proving that test-bearing validations ran any tests. Acceptance needs an enforceable, evidence-producing boundary at the end of execute/apply, while implementation context is still active and repairs are natural. Archive should remain a later user approval and record-keeping action rather than repeating functional review.

## What Changes

- Add `openspec acceptance <change-name>` with human and single-document JSON output, plus project/release scope, to enforce CUE evaluation, strict OpenSpec validation, declared project checks, assertions, and test-execution evidence.
- Introduce language-agnostic command, assertion, and test-evidence contracts. Runner-specific evidence parsing is selected explicitly through a provider registry rather than embedded in acceptance or workflow logic.
- Require each test-suite check to prove at least one executed test (or its declared higher minimum), independently of process success.
- Inventory and independently execute every applicable test-bearing validation attached to an evaluated CUE resource, relationship, capability, invariant, witness, or acceptance asset; a passing broad suite cannot cover a stale targeted selector.
- Make `/opsx:apply` run semantic and deterministic acceptance exactly when all implementation tasks are complete, including when apply begins in an already-complete state, and withhold execute-phase completion while either layer blocks.
- Keep projects outside the CUE/executable-gate contract on their documented path and report inapplicable gates honestly.
- Give end-of-execute apply and explicit `/opsx:verify` one shared adversarial acceptance contract, while keeping archive and bulk archive approval-focused and non-repeating.
- Require that shared review to trace production composition, negotiation-before-preparation, asynchronous failures, end-to-end error observability, and validation-declaration integrity through an architecture-conformance matrix.
- Separate semantic agent findings from executable proof: deterministic command success cannot establish semantic conformance, and agent prose cannot replace a failed or missing gate.
- Preserve the `track-spec-progress` boundary: ordinary progress, context, list, planning, static validation, and archive remain non-executing; only explicit check/acceptance and end-of-execute operations run repository-declared commands.
- Keep acceptance transient: no database, cache, daemon, generated status manifest, or mutable verification ledger is introduced.

## Capabilities

### New Capabilities

- `acceptance-gates`: Deterministic, language-agnostic acceptance execution and structured evidence, including provider-extensible nonzero-test proof and project/release scope.
- `opsx-apply-skill`: End-of-execute acceptance integrates semantic review and deterministic evidence with the implementation repair loop.

### Modified Capabilities

- `opsx-archive-skill`: Archive and bulk archive collect user approval and perform record mutation without rerunning implementation acceptance.
- `opsx-verify-skill`: Verification must use the shared adversarial review contract, distinguish deferred scope from applicable obligations, execute deterministic acceptance, and withhold readiness on any blocking result.

## Impact

- Adds an acceptance core service, neutral process runner, assertion evaluators, test-evidence provider registry, CLI command, deterministic reports, and CUE validation-inventory/resolution logic with declaration-owner and selector provenance.
- Reuses canonical root selection, the in-memory CUE bridge, and shared strict OpenSpec validator code.
- Changes execute/apply completion for CUE-governed projects while retaining an explicit verification command and ordinary archive behavior.
- Refactors apply and verify around one shared contract, simplifies archive/bulk archive to approval and record mutation, and updates generated skills, parity tests, and documentation.
- Adds self-contained cross-platform fixture executables plus language-neutral semantic-review fixtures, including conforming and violating counterparts, without requiring an application language, build system, test runner, or globally installed downstream toolchain.
