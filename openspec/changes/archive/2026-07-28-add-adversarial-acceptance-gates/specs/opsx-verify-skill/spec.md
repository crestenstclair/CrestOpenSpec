## ADDED Requirements

### Requirement: Deterministic acceptance layer

The `/opsx:verify` workflow SHALL run the deterministic acceptance service and SHALL keep its executable results separate from adversarial semantic findings.

#### Scenario: Run deterministic acceptance

- **WHEN** an agent verifies a selected change
- **THEN** it runs `openspec acceptance <change-name> --json`
- **AND** includes the gate status and evidence in its report

#### Scenario: Deterministic gate fails

- **WHEN** CUE evaluation, strict OpenSpec validation, a declared command, an assertion, or required test evidence fails
- **THEN** verification reports the failure as blocking
- **AND** never reports execution acceptance as passed

#### Scenario: Deterministic gates pass

- **WHEN** all deterministic gates pass
- **THEN** the agent continues to evaluate semantic conformance
- **AND** does not claim that command success proves implementation conformance

### Requirement: Architecture-conformance matrix and drift guards

The `/opsx:verify` workflow SHALL link each applicable port, layer, composition decision, prepared-runtime constraint, failure channel, and validation declaration to its production implementation and witness, and SHALL exercise each mandatory architecture-drift guard.

#### Scenario: Composition-root trace

- **WHEN** architecture declares a port or injected dependency
- **THEN** review identifies the owner selecting the implementation, production composition site, consuming application service, substitution/mismatch witness, bypasses, and layer direction
- **AND** blocks internal concrete selection only when evaluated architecture assigns that decision elsewhere

#### Scenario: Negotiation-before-preparation trace

- **WHEN** artifact validity depends on a runtime-selected format, protocol, schema, capacity, topology, feature, page size, or hardware limit
- **THEN** review traces discover or negotiate, validate, complete compatible preparation, processing start, and later contract checks in that order
- **AND** tests a supported non-default value and relevant capacity boundaries

#### Scenario: Asynchronous failure trace

- **WHEN** failure can arrive after successful startup
- **THEN** review traces every callback, future, event, worker, notification, and background-task error entry point to its declared observation/recovery boundary
- **AND** requires a controlled negative witness after startup

#### Scenario: End-to-end observability trace

- **WHEN** an applicable component returns typed failure
- **THEN** review follows the result through every production caller
- **AND** independently proves both forbidden-mutation absence and required error/status/counter observation

#### Scenario: Validation declaration trace

- **WHEN** project, resource, or witness test validations are applicable
- **THEN** review maps every declaration identity, location, owner, selector, invocation, provider, assertions, and witness
- **AND** verifies that a broad passing suite does not conceal a stale targeted declaration

#### Scenario: Guard premise is not declared

- **WHEN** evaluated architecture does not assign a composition decision, runtime-negotiated constraint, failure-observation contract, or validation to the selected slice or evergreen rules
- **THEN** review does not invent a blanket implementation-style requirement
- **AND** applies normal phase classification and evidence rules instead

## MODIFIED Requirements

### Requirement: Completeness Verification

The agent SHALL verify applicable completeness obligations using the selected change, evaluated CUE, authoritative artifacts, and concrete implementation evidence without requiring deferred roadmap scope.

#### Scenario: Task completion check

- **WHEN** verifying completeness
- **THEN** the agent reads tasks.md
- **AND** counts tasks marked `- [x]` (complete) versus `- [ ]` (incomplete)
- **AND** reports the exact incomplete tasks as current-slice evidence

#### Scenario: All tasks complete

- **WHEN** all tasks are marked complete
- **THEN** report "Tasks: N/N complete"
- **AND** mark completeness dimension as passed

#### Scenario: Incomplete tasks found

- **WHEN** some tasks are incomplete
- **THEN** report "Tasks: X/N complete"
- **AND** list each incomplete task
- **AND** mark as CRITICAL issue
- **AND** suggest: "Complete remaining tasks or mark as done if already implemented"

#### Scenario: Spec coverage check

- **WHEN** verifying completeness
- **AND** delta specs exist in `openspec/changes/<name>/specs/`
- **THEN** the agent maps every delta requirement into the obligation ledger with concrete implementation evidence
- **AND** reports each requirement's applicability classification and evidence status instead of keyword-search coverage

#### Scenario: Build obligation ledger

- **WHEN** verifying completeness
- **THEN** the agent classifies every reviewed obligation exactly once as `CURRENT_SLICE`, `EVERGREEN_INVARIANT`, `DEFERRED_SCOPE`, or `UNAUTHORIZED_EARLY_SCOPE`
- **AND** records the cited authority and applicability rationale before deciding whether absence is a defect

#### Scenario: Applicable implementation evidence is missing

- **WHEN** evidence explicitly required for a `CURRENT_SLICE` or `EVERGREEN_INVARIANT` obligation is missing or invalid
- **THEN** the agent reports `BLOCKING_REQUIRED_PROOF_GAP`
- **AND** provides the proof command attempted, observed result, and specific repair direction

#### Scenario: Deferred scope is not implemented

- **WHEN** a later roadmap phase, future capability, or explicit non-goal is classified as `DEFERRED_SCOPE`
- **THEN** the agent records `DEFERRED_NOT_APPLICABLE` or omits it
- **AND** never treats its absence as incomplete current work

#### Scenario: All applicable obligations have evidence

- **WHEN** current-slice and evergreen obligations have valid implementation evidence and no unauthorized early scope exists
- **THEN** completeness may pass
- **AND** deferred observations remain non-blocking

### Requirement: Correctness Verification

The agent SHALL trace current or executed implementation paths against applicable authoritative requirements and SHALL report a violation only when authority, applicability, concrete evidence, and a falsifiable contradiction are all present.

#### Scenario: Trace an applicable implementation path

- **WHEN** verifying a current-slice requirement or evergreen invariant
- **THEN** the agent traces declared relationships, layers, boundaries, resources, assets, validations, witnesses, production composition, runtime preparation, and failure-observation paths that implement it
- **AND** cites current code or executed behavior as evidence

#### Scenario: Current-slice contradiction is proven

- **WHEN** an implemented path contradicts a `CURRENT_SLICE` obligation
- **THEN** the agent reports `BLOCKING_CURRENT_VIOLATION`
- **AND** includes authority citation, classification rationale, implementation evidence, falsifiable consequence, proof command, observed result, severity, and repair direction

#### Scenario: Evergreen contradiction is proven

- **WHEN** an implemented path contradicts an `EVERGREEN_INVARIANT`
- **THEN** the agent reports `BLOCKING_EVERGREEN_VIOLATION`
- **AND** includes the same complete finding evidence

#### Scenario: Unauthorized later functionality exists

- **WHEN** later functionality is implemented early in a way that contradicts current exclusions or master architecture
- **THEN** the agent classifies it `UNAUTHORIZED_EARLY_SCOPE`
- **AND** reports the applicable current or evergreen blocking violation with concrete implementation evidence

#### Scenario: Search produces only suspicion

- **WHEN** keyword searches, filenames, construction-only tests, mocks that bypass behavior, architectural suspicion, or lack of investigation are the only evidence
- **THEN** the agent does not report a proven blocking violation
- **AND** may record an `INFORMATIONAL_FUTURE_RISK` with its uncertainty

#### Scenario: Prefer behavioral proof

- **WHEN** production execution or a controlled negative proof is feasible
- **THEN** the agent prefers that evidence over self-reported success strings or mocks that bypass the reviewed behavior


#### Scenario: Requirement implementation mapping
- **WHEN** verifying correctness
- **THEN** for each requirement in delta specs:
  - Search codebase for implementation
  - Identify relevant files and line numbers
  - Assess whether implementation satisfies the requirement

#### Scenario: Scenario coverage check
- **WHEN** verifying correctness
- **THEN** for each scenario in delta specs:
  - Check if the scenario's conditions are handled in code
  - Check if tests exist that cover the scenario
  - Report coverage status

#### Scenario: Implementation matches spec
- **WHEN** implementation appears to satisfy a requirement
- **THEN** report which files/lines implement it
- **AND** mark requirement as covered

#### Scenario: Implementation diverges from spec
- **WHEN** implementation exists but doesn't match spec intent
- **THEN** report the divergence as WARNING
- **AND** explain what differs
- **AND** suggest: either update implementation or update spec to match reality

#### Scenario: Missing implementation
- **WHEN** no implementation found for a requirement
- **THEN** report as CRITICAL issue
- **AND** suggest: "Implement requirement X" with guidance on what's needed
### Requirement: Coherence Verification

The agent SHALL verify applicable implementation coherence against evaluated CUE, design decisions, boundaries, dependency direction, ownership, and project patterns while keeping deferred future design non-blocking.

#### Scenario: Read evaluated architecture first

- **WHEN** beginning semantic review
- **THEN** the agent reads the evaluated CUE model and relationship index before artifacts and implementation
- **AND** treats invalid or conflicting CUE as a deterministic blocker

#### Scenario: Applicable design decision is followed

- **WHEN** an implemented current path follows an applicable design decision and architecture relation
- **THEN** the agent records the confirming implementation or execution evidence

#### Scenario: Applicable architecture rule is violated

- **WHEN** a current path violates an applicable safety, ownership, domain, dependency, compatibility, or architecture rule
- **THEN** the agent reports the corresponding current or evergreen blocking finding
- **AND** identifies the exact boundary or relation contradicted

#### Scenario: Complete future architecture is not present

- **WHEN** the master design schedules a capability for a later phase and the selected slice does not claim it
- **THEN** the agent does not flag the narrow implementation merely for lacking that future capability
- **AND** still verifies that the narrow implementation does not redefine or contradict the master design

#### Scenario: Informational future risk

- **WHEN** evidence suggests a possible future integration concern without a current contradiction
- **THEN** the agent may report `INFORMATIONAL_FUTURE_RISK`
- **AND** states that it does not affect acceptance


#### Scenario: Design.md adherence check
- **WHEN** verifying coherence
- **AND** design.md exists for the change
- **THEN** extract key decisions from design.md
- **AND** verify implementation follows those decisions
- **AND** report any deviations

#### Scenario: No design.md
- **WHEN** verifying coherence
- **AND** no design.md exists
- **THEN** skip design adherence check
- **AND** note "No design.md to verify against"

#### Scenario: Design decision followed
- **WHEN** implementation follows a design decision
- **THEN** report as confirmed
- **AND** cite evidence from code

#### Scenario: Design decision violated
- **WHEN** implementation contradicts a design decision
- **THEN** report as WARNING
- **AND** explain the contradiction
- **AND** suggest: either update implementation or update design.md

#### Scenario: Code pattern consistency
- **WHEN** verifying coherence
- **THEN** check if new code follows existing project patterns
- **AND** flag any significant deviations as suggestions
### Requirement: Verification Report Format

The agent SHALL produce a structured report that separates deterministic gates, applicable blocking semantic findings, deferred observations, and informational risks.

#### Scenario: Deterministic gate section

- **WHEN** verification completes
- **THEN** the report lists CUE evaluation, strict OpenSpec validation, each project check and applicable attached test validation, assertion results, and test evidence from the acceptance report
- **AND** preserves command success separately from semantic findings

#### Scenario: Blocking finding details

- **WHEN** a semantic blocker is reported
- **THEN** it uses `BLOCKING_CURRENT_VIOLATION`, `BLOCKING_EVERGREEN_VIOLATION`, or `BLOCKING_REQUIRED_PROOF_GAP`
- **AND** includes authority citation, applicability and rationale, implementation evidence, falsifiable contradiction, proof command, observed result, severity, and repair direction

#### Scenario: Deferred observations section

- **WHEN** deferred obligations are mentioned
- **THEN** the report lists them separately as `DEFERRED_NOT_APPLICABLE`
- **AND** states explicitly that they do not affect acceptance

#### Scenario: Only a future risk is found

- **WHEN** a concern is not a proven applicable contradiction
- **THEN** the report labels it `INFORMATIONAL_FUTURE_RISK`
- **AND** does not count it as blocking

#### Scenario: Execution acceptance passes

- **WHEN** every applicable deterministic gate passes and no applicable blocking semantic finding exists
- **THEN** the report states `execution acceptance passed; ready for user review`
- **AND** explains that readiness combines two distinct evidence layers

#### Scenario: Verification is blocked

- **WHEN** any deterministic gate or applicable semantic finding blocks
- **THEN** the report states that execution acceptance remains incomplete
- **AND** does not allow warnings, prose, or user confirmation to replace the failed proof

#### Scenario: Report summary
- **WHEN** verification completes
- **THEN** display summary scorecard:
  ```text
  ## Verification Report: <change-name>

  ### Summary
  | Dimension    | Status   |
  |--------------|----------|
  | Completeness | X/Y      |
  | Correctness  | X/Y      |
  | Coherence    | Followed |
  ```

#### Scenario: Issue prioritization
- **WHEN** issues are found
- **THEN** group and display in priority order:
  1. CRITICAL - Must fix before archive (missing implementation, incomplete tasks)
  2. WARNING - Should fix (divergence from spec/design, missing tests)
  3. SUGGESTION - Nice to fix (pattern inconsistencies, minor improvements)

#### Scenario: Actionable recommendations
- **WHEN** reporting an issue
- **THEN** include specific, actionable fix recommendation
- **AND** reference relevant files and line numbers where applicable
- **AND** avoid vague suggestions like "consider reviewing"

#### Scenario: All checks pass
- **WHEN** no issues found across all dimensions
- **THEN** display:
  ```text
  All checks passed. Ready for archive.
  ```

#### Scenario: Critical issues found
- **WHEN** CRITICAL issues exist
- **THEN** display:
  ```text
  X critical issue(s) found. Fix before archiving.
  ```
- **AND** do NOT suggest running archive

#### Scenario: Only warnings/suggestions
- **WHEN** no CRITICAL issues but warnings exist
- **THEN** display:
  ```text
  No critical issues. Y warning(s) to consider.
  Ready for archive (with noted improvements).
  ```
