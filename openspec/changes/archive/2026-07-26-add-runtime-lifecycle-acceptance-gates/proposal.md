## Why

OpenSpec can currently accept an implementation after in-process checks, declared success markers, and specifications agree, even when the user-facing process never exits or a production input races the autonomous flow. End-of-execute acceptance needs first-class evidence at the same external runtime and interaction boundary as the claim so `/opsx:apply` cannot report completion while owned resources remain resident or a material concurrent producer is untested.

## What Changes

- Add a language-neutral `runtime-session` proof declaration and provider registry alongside existing test-suite evidence.
- Supervise directly spawned production commands through startup, progress, terminal success, teardown, parent exit, and owned-descendant cleanup with bounded, stage-specific diagnostics.
- Add explicit lifecycle, boundary, environment, proof-role, resource, timeout, marker, PTY, host-capability, and interaction declarations to runtime evidence.
- Add a project-owned interaction-driver extension point that binds attempted delivery, production-seam reachability, race-window timing, assertions, and session identity.
- Expand the acceptance inventory and versioned JSON report so every applicable attached runtime proof is independently binding and unavailable required physical/native capabilities fail as proof gaps.
- Extend the shared apply/verify semantic review with runtime-boundary, terminal-success, critical-interleaving, and declaration-honesty guards while keeping archive non-executing.
- Add deterministic process fixtures covering resident success, slow progress, silence, missing/duplicate/out-of-order markers, orphaned children, persistent teardown, PTY behavior, interaction timing, provider/capability failures, and exact-tree cleanup.

## Capabilities

### New Capabilities

- `runtime-lifecycle-acceptance`: Declared external runtime sessions, lifecycle supervision, controlled interactions, evidence, and end-of-execute semantic guards.

### Modified Capabilities

- `opsx-verify-skill`: Explicit verification applies the same runtime-boundary and interleaving review used by execute/apply.
- `opsx-archive-skill`: Archive remains an approval and record operation that never starts runtime sessions.

## Impact

- Acceptance declarations, inventory, providers, process supervision, report rendering, and CLI contracts under `src/core/acceptance` and `docs/`.
- Shared apply/verify workflow templates, generated skills, and parity tests.
- Cross-platform process-tree and PTY adapters with fail-closed capability reporting.
- Self-contained Node fixture executables and end-to-end acceptance tests; no downstream repository becomes a test dependency.
