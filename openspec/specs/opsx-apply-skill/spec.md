# opsx-apply-skill Specification

## Purpose
TBD - created by archiving change add-adversarial-acceptance-gates. Update Purpose after archive.
## Requirements
### Requirement: End-of-execute adversarial acceptance

The `/opsx:apply` execute workflow SHALL perform semantic and deterministic acceptance after every implementation task is complete and before it reports the execute phase complete.

#### Scenario: Final task completes

- **WHEN** the execute/apply workflow completes the final pending task
- **THEN** it applies the shared phase-aware adversarial review contract to evaluated authority, artifacts, production implementation, and witnesses
- **AND** runs `openspec acceptance <change-name> --json` as the distinct deterministic layer

#### Scenario: Apply starts with all tasks complete

- **WHEN** apply instructions report `state: "all_done"`
- **THEN** the workflow skips task execution and proceeds directly to end-of-execute acceptance
- **AND** does not suggest archive before both acceptance layers pass

#### Scenario: Implementation pauses before completion

- **WHEN** implementation is blocked, interrupted, or still has incomplete tasks
- **THEN** the workflow reports execution progress without running final acceptance
- **AND** does not claim that the execute phase is complete

#### Scenario: End-of-execute acceptance blocks

- **WHEN** deterministic acceptance fails or semantic review proves an applicable blocker
- **THEN** the workflow keeps the execute phase incomplete and reports the exact evidence and repair direction
- **AND** continues repair when possible or tells the user how to resume execute/apply

#### Scenario: End-of-execute acceptance passes

- **WHEN** every deterministic gate passes and semantic review has no applicable blocker
- **THEN** the workflow reports implementation and execution acceptance complete
- **AND** hands the change to the user for functional review and optional archive approval

### Requirement: Shared execute and verify contract

The apply and explicit verify workflows SHALL use the same language-neutral acceptance contract, while archive workflows SHALL not embed or rerun it.

#### Scenario: Generate execute and verify workflows

- **WHEN** OpenSpec generates apply and verify skill or command artifacts
- **THEN** both contain the same applicability classifications, architecture-conformance matrix, mandatory drift guards, finding evidence, deferred-scope rule, and deterministic command
- **AND** template parity tests confirm generated artifacts match their sources

#### Scenario: Generate archive workflows

- **WHEN** OpenSpec generates archive or bulk-archive instructions
- **THEN** those workflows treat archive as user approval and record mutation
- **AND** do not repeat semantic review or invoke deterministic acceptance

