## ADDED Requirements

### Requirement: Shared adversarial acceptance review before archive

The `/opsx:archive` workflow SHALL apply the same phase-aware adversarial review contract as `/opsx:verify` and SHALL require both semantic eligibility and passing deterministic acceptance before invoking archive.

#### Scenario: Review authority before implementation

- **WHEN** an agent evaluates a change for archive
- **THEN** it reads the evaluated CUE context before change artifacts and implementation
- **AND** builds an obligation ledger from authority documents, evaluated CUE, selected artifacts, and the implementation diff

#### Scenario: Applicable semantic contradiction exists

- **WHEN** current implementation contradicts a `CURRENT_SLICE` obligation, an `EVERGREEN_INVARIANT`, or an unauthorized early-scope rule
- **THEN** the workflow reports a blocking finding with authority, applicability rationale, implementation evidence, falsifiable contradiction, proof command, observed result, severity, and repair direction
- **AND** does not archive the change

#### Scenario: Required proof is missing

- **WHEN** evidence explicitly required for an applicable obligation is missing or invalid
- **THEN** the workflow reports `BLOCKING_REQUIRED_PROOF_GAP`
- **AND** does not archive the change

#### Scenario: Deferred capability is absent

- **WHEN** a roadmap capability or explicit non-goal is classified as `DEFERRED_SCOPE` and is not implemented
- **THEN** the workflow records it separately as `not applicable — deferred` or omits it
- **AND** does not treat that absence as a violation or archive blocker

#### Scenario: Deterministic acceptance fails

- **WHEN** `openspec acceptance <change-name> --json` reports a failed gate
- **THEN** the workflow preserves that executable evidence separately from semantic findings
- **AND** does not invoke archive regardless of user confirmation

#### Scenario: Both layers pass

- **WHEN** deterministic acceptance passes and the semantic review has no applicable blocking finding
- **THEN** the workflow may invoke core `openspec archive`
- **AND** states that the agent review and deterministic gates are distinct evidence layers

### Requirement: Mandatory architecture-drift guards

The shared archive review SHALL build an architecture-conformance matrix and SHALL apply composition, runtime-preparation, asynchronous-failure, end-to-end observability, and validation-integrity guards only where evaluated architecture makes them applicable.

#### Scenario: Production composition bypasses a declared port

- **WHEN** evaluated architecture assigns concrete selection to a composition root or injected port but production application code constructs or selects the concrete adapter internally
- **THEN** review reports an applicable blocking violation with the complete production trace
- **AND** a unit test of the concrete adapter alone is insufficient proof

#### Scenario: Production honors a declared composition seam

- **WHEN** production construction, supply, consumption, substitution witness, and layer direction all match the evaluated architecture
- **THEN** the composition guard records conforming evidence
- **AND** does not mandate a different injection style

#### Scenario: Preparation precedes runtime negotiation

- **WHEN** an artifact is prepared from a default/requested value before a different actual value is negotiated, or capacity overflow is silently truncated or padded
- **THEN** review reports a blocking current or evergreen violation
- **AND** requires non-default and boundary witnesses before acceptance

#### Scenario: Runtime negotiation and preparation conform

- **WHEN** production discovers, validates, completely prepares for, starts with, and later checks the actual runtime contract
- **THEN** the negotiation guard records conforming evidence
- **AND** does not block the implementation

#### Scenario: Post-start asynchronous failure is ignored

- **WHEN** a callback, task, event, worker, or device failure after successful startup does not reach the declared bounded observation/recovery path
- **THEN** review reports a blocking violation
- **AND** startup success is not accepted as later-failure proof

#### Scenario: Post-start failure is observably handled

- **WHEN** a controlled post-start failure reaches the declared observation or recovery boundary
- **THEN** the asynchronous guard records the exact negative witness
- **AND** does not require a framework-specific error mechanism

#### Scenario: Production caller erases a typed failure

- **WHEN** a component failure is returned but a production caller discards or converts it to success, or a witness proves non-mutation without separately proving required failure observation
- **THEN** review reports a blocking end-to-end observability violation
- **AND** identifies the production caller where evidence is lost

#### Scenario: Failure propagation proves both obligations

- **WHEN** a production-seam witness independently proves forbidden mutation did not occur and required status/error/counter observation did occur
- **THEN** the observability guard records conforming evidence

#### Scenario: Source-language inference is unavailable

- **WHEN** core acceptance lacks an explicit validation/provider for source analysis
- **THEN** deterministic acceptance does not guess from AST, framework, method, or ecosystem patterns
- **AND** unsupported semantic inference never becomes a passing deterministic gate

### Requirement: Independent bulk archive eligibility

The bulk archive workflow SHALL evaluate semantic and deterministic eligibility independently for every selected change and SHALL archive only eligible changes.

#### Scenario: Mixed eligible and failed changes

- **WHEN** some selected changes pass both acceptance layers and others fail
- **THEN** the workflow reports a per-change eligibility table
- **AND** offers to archive the passing subset without archiving any failed change

#### Scenario: One change fails during deterministic checks

- **WHEN** a selected change has a failing command, assertion, strict validation, or test-evidence gate
- **THEN** that change is marked blocked independently
- **AND** no confirmation for the batch overrides its failed status

#### Scenario: Archive an eligible subset

- **WHEN** the user confirms the eligible subset
- **THEN** the workflow invokes the core archive command for each eligible change
- **AND** reports successful, failed, and skipped outcomes separately

#### Scenario: Deferred observations in bulk review

- **WHEN** one or more changes have deferred observations
- **THEN** the workflow lists them separately from blocking findings
- **AND** states explicitly that deferred observations do not affect eligibility

### Requirement: Shared generated workflow contract

Verify, archive, and bulk-archive source templates and generated skill/command artifacts SHALL use one shared acceptance-review contract so their applicability rules and finding evidence cannot drift.

#### Scenario: Generate workflow artifacts

- **WHEN** OpenSpec produces verify, archive, or bulk-archive instructions for a supported tool
- **THEN** each artifact contains the same phase classifications, architecture-conformance matrix, drift guards, blocking rules, required finding fields, and deferred-scope rule
- **AND** template parity checks confirm the generated copies match their source templates
