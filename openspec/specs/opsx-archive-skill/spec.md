# OPSX Archive Skill Spec

## Purpose

Define the expected behavior for the `/opsx:archive` skill, including readiness checks, spec sync prompting, archive execution, and user-facing output.
## Requirements
### Requirement: OPSX Archive Skill

The system SHALL provide an `/opsx:archive` skill that archives a completed change after user approval without repeating implementation acceptance.

#### Scenario: Archive a change with all artifacts complete

- **WHEN** the user approves archiving an exact active change
- **AND** all artifacts in the schema are complete
- **AND** all tasks are complete
- **THEN** the agent moves the change to `openspec/changes/archive/<target-name>/`
- **AND** displays success message with archived location

#### Scenario: Change selection prompt

- **WHEN** agent executes `/opsx:archive` without specifying a change
- **THEN** the agent prompts user to select from available changes
- **AND** shows only active changes (excludes archive/)

#### Scenario: Archive a reviewed change

- **WHEN** the user approves archiving an exact active change
- **THEN** the workflow summarizes artifact/task completion and the planned canonical-spec/archive effect
- **AND** invokes core `openspec archive` without performing another semantic or deterministic implementation review

#### Scenario: User has not approved archive

- **WHEN** the current request does not explicitly approve archiving the selected change
- **THEN** the workflow asks for archive approval before invoking the mutating command

#### Scenario: User requests another functional review

- **WHEN** the user wants renewed implementation assurance before archive approval
- **THEN** the workflow directs that separate request to `/opsx:verify`
- **AND** returns to archive only after the user decides whether to approve

#### Scenario: Core archive fails

- **WHEN** core archive reports a validation, confirmation, spec-update, target, or filesystem failure
- **THEN** the workflow reports that diagnostic and leaves the change active
- **AND** does not convert the failure into a second adversarial implementation review

### Requirement: Artifact Completion Check

The skill SHALL check artifact completion status using the artifact graph before archiving.

#### Scenario: Incomplete artifacts warning

- **WHEN** agent checks artifact status
- **AND** one or more artifacts have status other than `done`
- **THEN** display warning listing incomplete artifacts
- **AND** prompt user for confirmation to continue
- **AND** proceed if user confirms

#### Scenario: All artifacts complete

- **WHEN** agent checks artifact status
- **AND** all artifacts have status `done`
- **THEN** proceed without warning

### Requirement: Task Completion Check

The skill SHALL check task completion status from tasks.md before archiving.

#### Scenario: Incomplete tasks found

- **WHEN** agent reads tasks.md
- **AND** incomplete tasks are found (marked with `- [ ]`)
- **THEN** display warning showing count of incomplete tasks
- **AND** prompt user for confirmation to continue
- **AND** proceed if user confirms

#### Scenario: All tasks complete

- **WHEN** agent reads tasks.md
- **AND** all tasks are complete (marked with `- [x]`)
- **THEN** proceed without task-related warning

#### Scenario: No tasks file

- **WHEN** tasks.md does not exist
- **THEN** proceed without task-related warning

### Requirement: Spec Sync Prompt

The skill SHALL prompt to sync delta specs before archiving if specs exist.

#### Scenario: Delta specs exist

- **WHEN** agent checks for delta specs
- **AND** `specs/` directory exists in the change with spec files
- **THEN** prompt user: "This change has delta specs. Would you like to sync them to main specs before archiving?"
- **AND** if user cancels, stop without archiving
- **AND** if user confirms, execute `/opsx:sync` logic inline and wait for it to complete
- **AND** verify every capability that has a delta spec, not only those the sync reports it touched: ADDED requirements present, MODIFIED requirements carrying the changes named in the delta, REMOVED requirements absent, RENAMED requirements present under the new name and absent under the old one
- **AND** stop without archiving if the sync fails or any capability does not verify
- **AND** archive only after verification passes, or when the user explicitly chose to archive without syncing or to archive already-synced specs

#### Scenario: No delta specs

- **WHEN** agent checks for delta specs
- **AND** no `specs/` directory or no spec files exist
- **THEN** proceed without sync prompt

### Requirement: Archive Process

The skill SHALL move the change to the archive folder with date prefix.

#### Scenario: Successful archive

- **WHEN** archiving a change
- **THEN** create `archive/` directory if it doesn't exist
- **AND** generate target name as `YYYY-MM-DD-<change-name>` using current date, keeping the name as-is when it already starts with a `YYYY-MM-DD-` prefix
- **AND** move entire change directory to archive location
- **AND** preserve `.openspec.yaml` file in archived change

#### Scenario: Archive already exists

- **WHEN** target archive directory already exists
- **THEN** fail with error message
- **AND** suggest renaming existing archive or using different date

### Requirement: Skill Output

The skill SHALL provide clear feedback about the archive operation.

#### Scenario: Archive complete with sync

- **WHEN** archive completes after syncing specs
- **THEN** display summary:
  - Specs synced (from `/opsx:sync` output)
  - Change archived to location
  - Schema that was used

#### Scenario: Archive complete without sync

- **WHEN** archive completes without syncing specs
- **THEN** display summary:
  - Note that specs were not synced (if applicable)
  - Change archived to location
  - Schema that was used

#### Scenario: Archive complete with warnings

- **WHEN** archive completes with incomplete artifacts or tasks
- **THEN** include note about what was incomplete
- **AND** suggest reviewing if archive was intentional

### Requirement: Runtime-session non-execution during archive
Archive and bulk archive SHALL consume reviewed completion state and user approval without starting deterministic runtime sessions, process supervisors, or interaction drivers.

#### Scenario: Archive a change with runtime declarations
- **WHEN** a user approves archive for a change whose evaluated architecture declares runtime-session proofs
- **THEN** archive performs its normal validation, spec update, and record operation without invoking acceptance or any runtime provider

### Requirement: Approval-focused bulk archive

The bulk archive workflow SHALL collect one user-approved subset and ordering, report completion and delta-spec overlap, and invoke core archive separately for each approved change without rerunning acceptance.

#### Scenario: Select an archive subset

- **WHEN** multiple active changes are available
- **THEN** the workflow asks which exact subset and ordering the user approves
- **AND** never treats selection as proof generated by a new implementation review

#### Scenario: Archive approved changes independently

- **WHEN** the user confirms the subset
- **THEN** the workflow invokes core archive for each selected change in order
- **AND** reports archived and failed outcomes separately

#### Scenario: No acceptance ceremony during bulk archive

- **WHEN** bulk archive processes an approved subset
- **THEN** it does not embed the shared adversarial acceptance contract or run `openspec acceptance`
- **AND** relies on execute/apply or an explicitly requested verify workflow for functional acceptance

