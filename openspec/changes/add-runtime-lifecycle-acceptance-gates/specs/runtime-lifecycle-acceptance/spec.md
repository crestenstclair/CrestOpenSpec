## ADDED Requirements

### Requirement: Honest language-neutral runtime proof inventory
Deterministic acceptance SHALL execute each applicable runtime-session independently and preserve behavior when none is declared. Declarations and reports SHALL distinguish reachability, static, in-process, external-lifecycle, production-composition, environment, and interaction roles. Each proof SHALL declare its entry point and provider, boundary and environment, lifecycle and ownership, I/O and timeouts, markers, exit and descendant requirements, capabilities, and interactions as data.

#### Scenario: Applicable attached runtime proof
- **WHEN** an attached runtime-session proof applies to the selected change
- **THEN** acceptance executes and reports that exact declaration independently of broad project checks or attached tests

#### Scenario: Project without runtime declarations
- **WHEN** a governed project declares only existing project checks and test-suite proofs
- **THEN** acceptance retains their existing execution and pass/fail semantics

#### Scenario: Dry run offered as lifecycle proof
- **WHEN** a reachability or dry-run role is paired with a runtime lifecycle claim
- **THEN** declaration resolution fails with a stable proof-role mismatch rather than executing it as runtime evidence

#### Scenario: In-process test offered for external lifecycle
- **WHEN** a test-suite proof claims the external-process lifecycle role
- **THEN** declaration resolution fails and identifies the stronger required proof role

#### Scenario: Malformed runtime declaration
- **WHEN** any mandatory runtime field, timeout, marker, lifecycle pairing, resource disposition, or provider is missing or malformed
- **THEN** acceptance fails closed before starting project code and identifies the declaration location

#### Scenario: Unregistered runtime provider
- **WHEN** an applicable declaration selects an unregistered runtime provider
- **THEN** acceptance fails nonzero with provider and declaration provenance in the report

### Requirement: Bounded runtime terminal sequence, marker assertions, and exact cleanup
For a bounded lifecycle, acceptance SHALL require start, progress, declared success, normal teardown, required parent exit, and no owned descendants or resources. The provider SHALL evaluate declared stream, substring, count, and order predicates over bounded output. The supervisor SHALL track a uniquely owned process tree where supported, terminate only that tree in bounded stages after failure, and verify every owned process is gone.

#### Scenario: Success marker then resident process
- **WHEN** all terminal markers occur but the parent remains alive beyond `completionToExitGraceMs`
- **THEN** the proof fails promptly with `success_reported_but_process_resident` and the exact owned tree is cleaned up

#### Scenario: Slow valid progress
- **WHEN** a runtime emits declared progress within each silence budget, emits terminal markers once in order, exits zero in time, and leaves no descendants
- **THEN** the runtime proof passes

#### Scenario: Silence before completion
- **WHEN** output becomes silent before terminal success for longer than `progressSilenceMs`
- **THEN** the proof fails at the progress-silence stage and performs bounded cleanup

#### Scenario: Exit before success
- **WHEN** a command exits zero before every required terminal marker
- **THEN** the proof fails with missing-marker and exit-before-completion diagnostics

#### Scenario: Missing duplicated or reordered terminal marker
- **WHEN** a required terminal marker occurs zero times, more times than declared, or after a marker that it was required to precede
- **THEN** the proof fails with stable count or ordering diagnostics and the observed occurrences remain in evidence

#### Scenario: Parent exits with resident child
- **WHEN** the parent exits while a child it created remains alive
- **THEN** the proof fails, records the child lifecycle, and terminates that child

#### Scenario: Unrelated matching executable
- **WHEN** an unrelated process uses the same executable name as a timed-out fixture
- **THEN** cleanup leaves the unrelated process alive because it is not in the owned tree

### Requirement: Persistent lifecycle controller
Interactive-persistent, service-persistent, and background-owned proofs SHALL declare a bounded controller-owned teardown protocol and SHALL not be treated as bounded application completion.

#### Scenario: Ready service is deliberately stopped
- **WHEN** a persistent service reaches its declared readiness condition and its declared controller teardown stops the owned tree within budget
- **THEN** the proof passes and reports readiness and teardown separately

#### Scenario: Persistent proof lacks teardown
- **WHEN** a persistent lifecycle declaration omits a supported bounded teardown protocol
- **THEN** acceptance rejects the declaration before execution

### Requirement: Pipe and PTY fidelity
The process lifecycle provider SHALL honor an explicitly declared pipe or PTY mode and SHALL never silently substitute one for the other.

#### Scenario: PTY exposes buffered progress
- **WHEN** the same fixture is silent past its pipe budget but emits timely progress when attached to a supported PTY
- **THEN** the pipe proof fails for silence and the PTY proof observes progress and may pass

#### Scenario: PTY unavailable
- **WHEN** an applicable proof requires PTY and the host adapter is unavailable
- **THEN** acceptance reports a blocking required-proof gap rather than passing or skipping

### Requirement: Controlled critical interleavings
Each runtime interaction SHALL be bound to opening and closing milestones and SHALL return structured evidence that the action was attempted, reached the declared production seam, occurred inside the window, belongs to the same session, and evaluated every required assertion.

#### Scenario: Interaction within the race window
- **WHEN** a registered driver acts after the opening milestone and before the closing milestone, reaches the seam, and returns matching passing assertions
- **THEN** the interaction and runtime session pass with their shared session identity

#### Scenario: Interaction evidence mismatch
- **WHEN** an action occurs outside the window, misses the seam, omits an assertion, or reports another session identity
- **THEN** the proof fails with a stable interaction diagnostic even if the process otherwise exits zero

#### Scenario: Missing interaction provider
- **WHEN** a required interaction names an unregistered provider
- **THEN** the runtime proof fails closed and does not infer a driver from the command, framework, or host

### Requirement: Required host capability gaps
An unavailable host capability for an applicable physical, native, or controlled-interaction proof SHALL remain a blocking proof gap.

#### Scenario: Physical capability unavailable
- **WHEN** an applicable physical proof requires a host capability that is not available
- **THEN** acceptance returns `BLOCKING_REQUIRED_PROOF_GAP`, never pass or implicit skip

### Requirement: Complete versioned runtime evidence
JSON mode SHALL emit exactly one complete versioned report on every runtime pass or failure path and SHALL bind declaration provenance, applicability, argv, canonical cwd, proof/provider/role, boundary, environment, lifecycle, timeout budgets, output observations, interactions, parent and descendant termination, assertions, cleanup, and bounded diagnostics without secrets.

#### Scenario: Runtime JSON failure
- **WHEN** a runtime proof fails after reporting success but remaining resident
- **THEN** stdout contains one parseable report with `passed: false`, the stable lifecycle diagnostic, process-tree cleanup evidence, and a nonzero command exit

#### Scenario: Runtime JSON success
- **WHEN** every deterministic gate and runtime proof passes
- **THEN** stdout contains one parseable report with `passed: true` and no second status document

### Requirement: End-of-execute runtime semantic guards
The shared apply and verify review SHALL evaluate runtime-boundary completeness, terminal-success coherence, critical-interleaving completeness, and declaration honesty after rebuilding authority and validation inventories from final evaluated CUE and implementation state. Runtime sessions SHALL execute only through direct acceptance, end-of-execute apply, or explicit verify; normal reads, planning, status, static validate, archive, and bulk archive SHALL remain non-executing.

#### Scenario: Matching production proof is absent
- **WHEN** a current-slice or evergreen claim covers an external runtime boundary but no applicable proof exercises that same boundary and environment
- **THEN** review records an evidence-complete `BLOCKING_REQUIRED_PROOF_GAP` and execution remains incomplete

#### Scenario: Self-consistent persistent autonomous command
- **WHEN** prose, mocks, and implementation agree that an autonomous completion witness stays persistent
- **THEN** review reports the lifecycle contradiction until authoritative artifacts resolve whether it is bounded or controller-persistent

#### Scenario: Concrete race gap
- **WHEN** applicable authority and a producer trace identify a material shared-state window without a production-seam interaction witness
- **THEN** review blocks with the exact milestones, competing producer, missing command, and repair direction rather than a keyword-based suspicion

#### Scenario: Ordinary command reads declarations
- **WHEN** a user runs a normal read, planning, status, instruction, validation, archive, or bulk-archive operation
- **THEN** no runtime-session provider or project interaction driver starts
