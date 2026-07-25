## Why

OpenSpec can currently declare architectural checks and an agent can advise that a change looks ready, yet archive paths can still mutate specifications without executing those checks or proving that test-bearing validations ran any tests. Acceptance needs an enforceable, evidence-producing boundary while preserving a separate adversarial review for semantic conformance and preserving legacy behavior where the new CUE contract is not declared.

## What Changes

- Add `openspec acceptance <change-name>` with human and single-document JSON output, plus project/release scope, to enforce CUE evaluation, strict OpenSpec validation, declared project checks, assertions, and test-execution evidence.
- Introduce language-agnostic command, assertion, and test-evidence contracts. Runner-specific evidence parsing is selected explicitly through a provider registry rather than embedded in acceptance or archive logic.
- Require each test-suite check to prove at least one executed test (or its declared higher minimum), independently of process success.
- Inventory and independently execute every applicable test-bearing validation attached to an evaluated CUE resource, relationship, capability, invariant, witness, or acceptance asset; a passing broad suite cannot cover a stale targeted selector.
- Make CUE-governed archive operations run deterministic acceptance before any canonical-spec or archive mutation; confirmation and legacy validation-skip flags cannot bypass mandatory gates.
- Keep projects outside the CUE/executable-gate contract on their documented legacy path and report inapplicable gates honestly.
- Give `/opsx:verify`, `/opsx:archive`, and bulk archive a shared adversarial acceptance-review contract that builds a phase-aware obligation ledger and runs deterministic acceptance.
- Require that shared review to trace production composition, negotiation-before-preparation, asynchronous failures, end-to-end error observability, and validation-declaration integrity through an architecture-conformance matrix.
- Separate semantic agent findings from executable proof: deterministic command success cannot establish semantic conformance, and agent prose cannot replace a failed or missing gate.
- Preserve the `track-spec-progress` boundary: ordinary progress, context, list, planning, and static validation remain non-executing; only explicit check/acceptance operations run repository-declared commands.
- Keep acceptance transient: no database, cache, daemon, generated status manifest, or mutable verification ledger is introduced.

## Capabilities

### New Capabilities

- `acceptance-gates`: Deterministic, language-agnostic acceptance execution and structured evidence, including provider-extensible nonzero-test proof and project/release scope.

### Modified Capabilities

- `cli-archive`: CUE-governed changes must pass mandatory deterministic acceptance before archive mutation, regardless of confirmation or validation-skip flags.
- `opsx-archive-skill`: Archive and bulk-archive workflows must apply the shared phase-aware semantic review and deterministic gates before archiving eligible changes.
- `opsx-verify-skill`: Verification must use the shared adversarial review contract, distinguish deferred scope from applicable obligations, execute deterministic acceptance, and withhold readiness on any blocking result.

## Impact

- Adds an acceptance core service, neutral process runner, assertion evaluators, test-evidence provider registry, CLI command, deterministic reports, and CUE validation-inventory/resolution logic with declaration-owner and selector provenance.
- Reuses canonical root selection, the in-memory CUE bridge, and shared strict OpenSpec validator code.
- Changes archive eligibility for CUE-governed projects while retaining documented behavior for projects without the new gate contract.
- Refactors verify/archive/bulk-archive templates and generated skills around one shared review contract, with parity tests and documentation updates.
- Adds self-contained cross-platform fixture executables plus language-neutral semantic-review fixtures, including conforming and violating counterparts, without requiring an application language, build system, test runner, or globally installed downstream toolchain.
