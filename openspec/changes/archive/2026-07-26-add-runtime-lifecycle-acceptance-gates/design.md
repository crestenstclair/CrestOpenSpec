## Context

Deterministic acceptance currently executes project checks and applicable attached `test-suite` proofs through a bounded command runner. It records process output, generic assertions, and provider-supplied test counts, but the first success record and exit zero are still the only process-level terminal observations. There is no declaration for an external runtime lifecycle, no ownership model for descendants and resources, and no way to drive and prove a concurrent production interaction between observed milestones.

The escaped Crest Synth incident demonstrates why mutually consistent prose, fake-window tests, dry-run target validation, and success markers do not prove a user-facing command terminates. It is read-only regression context; the implementation and automated suite remain self-contained in CrestOpenSpec.

## Goals / Non-Goals

**Goals:**

- Make every applicable external runtime proof independently binding at end-of-execute acceptance.
- Distinguish reachability, static validation, in-process behavior, external lifecycle, production composition, environment fidelity, and controlled interaction evidence.
- Supervise exact owned process trees with stage-specific timeouts and bounded evidence.
- Permit project-specific interaction mechanisms without adding framework or toolkit logic to core.
- Preserve compatibility for projects with no runtime-session declarations and preserve non-execution for reads and archive.

**Non-Goals:**

- Inferring runtime claims, race windows, providers, or environment fidelity from source code, command names, frameworks, or host heuristics.
- Adding a daemon, database, mutable acceptance ledger, downstream parser, or UI automation framework.
- Making Crest Synth, Make, Cargo, audio hardware, or a desktop session an automated dependency.

## Decisions

### Runtime proofs use a provider union, not special cases in ordinary command checks

`ResolvedValidation.proof` becomes a discriminated union. Existing `test-suite` checks retain the ordinary command runner and test-evidence provider. A `runtime-session` proof is handed to a separately registered `RuntimeSessionProvider`, whose result includes the ordinary bounded process record plus structured lifecycle evidence. This keeps acceptance orchestration stable when another runtime mechanism is added.

The built-in `process-lifecycle-v1` provider accepts only a direct argument vector and canonical working directory. Its proof declares a proof role, entry point, boundary, environment, lifecycle, termination owner, resource dispositions, output mode, six timeout budgets, progress/completion milestones, exit/descendant requirements, required host capabilities, optional controlled interactions, and persistent-runtime teardown.

### A session state machine owns terminal-success coherence

The process supervisor observes output while the command is alive. It records milestone occurrence counts and ordering, first-observation times, parent exit, process-group or tracked-descendant state, and teardown actions. For a bounded lifecycle, terminal success begins the short completion-to-exit grace; it never completes the proof by itself. For persistent lifecycle classes, terminal markers mean readiness and cause the declared controller teardown to run within a bounded grace.

Failure stages are stable: spawn, startup, progress silence, completion, completion-to-exit, hard limit, marker assertion, exit assertion, interaction, teardown, and descendant cleanup. Cleanup targets only the spawned process group and descendants learned from that ownership graph. Unix and Windows behavior sits behind a platform adapter; unsupported PTY or host capability requests fail closed rather than downgrade to a pipe or skip.

### PTY is an explicit transport capability

`stdioMode` is declared as `pipe` or `pty`. Pipe uses direct Node process spawning. PTY uses an explicit platform transport adapter and still preserves the target argument vector as data. Availability is reported as a capability; requesting PTY on a host without an adapter produces a required-proof gap. Tests exercise the state machine with an injected PTY adapter on every platform and exercise the real platform adapter where available.

### Interaction drivers return session-bound structured evidence

Each interaction names a provider, an opening milestone, a closing milestone, an opaque request, and required assertion IDs. The supervisor invokes it only after the opening milestone. Evidence must echo the session and action IDs, state that the production seam was reached, report a delivery time within the same session clock, and include passing structured assertions for every required ID. Core validates those generic fields; the provider owns the project-specific action.

The built-in `process-json-v1` interaction provider starts a declared driver argument vector directly in the runtime working directory and sends a bounded JSON request on stdin. The driver may press a key, call a protocol, touch a fixture seam, or use any project-owned mechanism; core does not interpret it.

### Declaration honesty is partly deterministic and partly semantic

Core rejects incompatible combinations such as a `runtime-session` presented as target reachability or a `test-suite` presented as external lifecycle. It records declared boundary and environment without pretending to verify what only production review can establish. The shared semantic contract maps each applicable runtime claim to an exact production entry point and matching proof, and blocks dry runs, mocks, or construction tests offered for stronger claims.

### Report version advances for the new binding evidence

The JSON report advances to version `2.0`. Validation summaries separate applicable attached tests and runtime sessions. Each runtime result binds declaration provenance, proof/provider/role, argv, canonical cwd, lifecycle/environment/boundary, timeout budgets, milestone and interaction evidence, parent and descendant lifecycle, cleanup actions, assertions, and bounded output. No environment variables are serialized.

## Risks / Trade-offs

- [Process ownership differs by platform] → isolate group discovery, descendant tracking, signaling, and PTY launch behind adapters; test identity and alias behavior and fail closed where ownership cannot be established.
- [Very short fixture timings can be flaky] → use event-driven milestones, generous ratios between fixture delays and limits, and declared timeouts rather than one hard-coded hang threshold.
- [A provider could self-report false seam evidence] → bind evidence to the generated session/action IDs and core timestamps, require explicit assertion IDs, and retain semantic production-seam review as the separate adversarial layer.
- [Native/physical environments are unavailable in CI] → model availability as an explicit required capability and return `BLOCKING_REQUIRED_PROOF_GAP`; never silently skip or relabel synthetic evidence.
- [Report growth exposes noisy output] → retain existing independent byte caps and record only bounded streams, milestones, process identifiers, and declared evidence, never inherited environment data.

## Migration Plan

1. Introduce union types and parsers while leaving absent runtime declarations on the current path.
2. Add runtime and interaction registries plus the supervised process provider.
3. Extend report rendering, docs, templates, and generated skills.
4. Prove behavior with self-contained fixtures, full tests, build, lint, strict change validation, and final acceptance.
5. Use Crest Synth read-only only after the self-contained suite passes.
