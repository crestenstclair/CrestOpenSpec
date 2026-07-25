## MODIFIED Requirements

### Requirement: Archive Validation

The archive command SHALL enforce deterministic acceptance before any archive mutation for a project whose evaluated CUE declares `completion.projectChecks` or an attached validation with a `proof` field, while preserving documented validation controls when the acceptance contract is not applicable.

#### Scenario: Pre-archive acceptance for a governed change

- **WHEN** executing `openspec archive <change-name>` for a project with the declared acceptance contract
- **THEN** OpenSpec evaluates CUE, strictly validates the selected change and affected specifications, executes every resolved project check and applicable attached test validation, evaluates every assertion, and verifies required test evidence
- **AND** performs these gates before writing canonical specs, creating the archive target, or moving the change

#### Scenario: Mandatory gate fails

- **WHEN** any deterministic acceptance gate fails
- **THEN** archive returns nonzero with the acceptance evidence
- **AND** no canonical specification or change/archive path is modified

#### Scenario: Confirmation flags cannot bypass acceptance

- **WHEN** a user supplies `--yes`, accepts incomplete tasks or warnings, skips spec updates, or otherwise confirms archive
- **THEN** every mandatory deterministic gate still runs
- **AND** a failed gate still blocks archive mutation

#### Scenario: Validation-skip flag on a governed project

- **WHEN** a user supplies `--no-validate` for a project with the declared acceptance contract
- **THEN** strict validation inside deterministic acceptance still runs
- **AND** `--no-validate` cannot mean “skip mandatory acceptance”

#### Scenario: Acceptance contract is not applicable

- **WHEN** a project has no CUE package or valid CUE contains neither `completion.projectChecks` nor an attached validation with a `proof` field
- **THEN** archive reports deterministic acceptance as `not applicable`
- **AND** retains its documented legacy validation, confirmation, task, spec-update, and `--no-validate` behavior

#### Scenario: Acceptance passes

- **WHEN** every applicable deterministic gate passes
- **THEN** archive may continue to its existing task, confirmation, spec-update, and move behavior
- **AND** the direct CLI does not claim that deterministic success performed semantic agent review
