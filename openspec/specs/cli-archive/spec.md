# CLI Archive Command Specification

## Purpose
The archive command moves completed changes from the active changes directory to the archive folder with date-based naming, following OpenSpec conventions.

## Command Syntax
```bash
openspec archive [change-name] [--yes|-y]
```

Options:
- `--yes`, `-y`: Skip confirmation prompts (for automation)
## Requirements
### Requirement: Change Selection

The command SHALL support both interactive and direct change selection methods.

#### Scenario: Interactive selection

- **WHEN** no change-name is provided
- **THEN** display interactive list of available changes (excluding archive/)
- **AND** allow user to select one

#### Scenario: Direct selection

- **WHEN** change-name is provided
- **THEN** use that change directly
- **AND** validate it exists

### Requirement: Task Completion Check

The command SHALL verify task completion status before archiving to prevent premature archival.

#### Scenario: Incomplete tasks found

- **WHEN** incomplete tasks are found (marked with `- [ ]`)
- **THEN** display all incomplete tasks to the user
- **AND** prompt for confirmation to continue
- **AND** default to "No" for safety

#### Scenario: All tasks complete

- **WHEN** all tasks are complete OR no tasks.md exists
- **THEN** proceed with archiving without prompting

### Requirement: Archive Process

The archive operation SHALL follow a structured process to safely move changes to the archive.

#### Scenario: Performing archive

- **WHEN** archiving a change
- **THEN** execute these steps:
  1. Create archive/ directory if it doesn't exist
  2. Generate target name as `YYYY-MM-DD-[change-name]` using current date, keeping the name as-is when it already starts with a `YYYY-MM-DD-` prefix
  3. Check if target directory already exists
  4. Update main specs from the change's future state specs (see Spec Update Process below)
  5. Move the entire change directory to the archive location

#### Scenario: Archive already exists

- **WHEN** target archive already exists
- **THEN** fail with error message
- **AND** do not overwrite existing archive

#### Scenario: Successful archive

- **WHEN** move succeeds
- **THEN** display success message with archived name and list of updated specs

### Requirement: Spec Update Process

Before moving the change to archive, the command SHALL apply delta changes to main specs to reflect the deployed reality.

#### Scenario: Applying delta changes

- **WHEN** archiving a change with delta-based specs
- **THEN** parse and apply delta changes as defined in openspec-conventions
- **AND** validate all operations before applying

#### Scenario: Validating delta changes

- **WHEN** processing delta changes
- **THEN** perform validations as specified in openspec-conventions
- **AND** if validation fails, show specific errors and abort

#### Scenario: Conflict detection

- **WHEN** applying deltas would create duplicate requirement headers
- **THEN** abort with error message showing the conflict
- **AND** suggest manual resolution

#### Scenario: New main spec inherits the delta's Purpose

- **WHEN** a delta creates a main spec that does not exist yet
- **AND** the delta spec has a line-initial `## Purpose` header that is not inside a fenced code block or an HTML comment
- **AND** the section body, ignoring fenced blocks and HTML comments, is not empty
- **THEN** write the section body into the new main spec, trimmed but otherwise verbatim, fenced code blocks included
- **AND** the section body runs to the next `## ` heading outside a fenced block

#### Scenario: New main spec without an authored Purpose

- **WHEN** a delta creates a main spec that does not exist yet
- **AND** the delta spec has no such `## Purpose` header, or that section's body is empty once fenced blocks and HTML comments are ignored
- **THEN** write the TBD placeholder Purpose naming the change to update after archive

#### Scenario: Delta Purpose that would leave the new main spec unreadable

- **WHEN** a delta creates a main spec that does not exist yet
- **AND** carrying its `## Purpose` body over would leave a spec that reads differently to different readers - a heading or requirement header that truncates a section, an unterminated code fence that swallows one, or any HTML comment, which the section scan skips but the file keeps
- **THEN** write the TBD placeholder Purpose instead and warn that the delta Purpose was ignored
- **AND** complete the archive rather than aborting it

#### Scenario: Carried Purpose shorter than the strict-mode minimum

- **WHEN** the Purpose parsed back out of the new main spec is shorter than the minimum Purpose length strict validation enforces
- **THEN** carry it over unchanged and warn that `openspec validate --strict` reports it as too brief

#### Scenario: Delta Purpose for a capability that already has a main spec

- **WHEN** a delta carries a `## Purpose` and the target main spec already exists
- **THEN** leave the existing Purpose untouched
- **AND** warn that the delta Purpose was ignored, naming the spec file to edit directly, but only when that spec has a Purpose of its own and it differs from the delta's

### Requirement: Confirmation Behavior

The spec update confirmation SHALL provide clear visibility into changes before they are applied.

#### Scenario: Displaying confirmation

- **WHEN** prompting for confirmation
- **THEN** display a clear summary showing:
  - Which specs will be created (new capabilities)
  - Which specs will be updated (existing capabilities)
  - The source path for each spec
- **AND** format the confirmation prompt as:
  ```
  The following specs will be updated:
  
  NEW specs to be created:
    - cli-archive (from changes/add-archive-command/specs/cli-archive/spec.md)
  
  EXISTING specs to be updated:
    - cli-init (from changes/update-init-command/specs/cli-init/spec.md)
  
  Update 2 specs and archive 'add-archive-command'? [y/N]:
  ```
#### Scenario: Handling confirmation response

- **WHEN** waiting for user confirmation
- **THEN** default to "No" for safety (require explicit "y" or "yes")
- **AND** skip confirmation when `--yes` or `-y` flag is provided

#### Scenario: User declines confirmation

- **WHEN** user declines the confirmation
- **THEN** abort the entire archive operation
- **AND** display message: "Archive cancelled. No changes were made."
- **AND** exit with non-zero status code

### Requirement: Error Conditions

The command SHALL handle various error conditions gracefully.

#### Scenario: Handling errors

- **WHEN** errors occur
- **THEN** handle the following conditions:
  - Missing openspec/changes/ directory
  - Change not found
  - Archive target already exists
  - File system permissions issues

### Requirement: Skip Specs Option

The archive command SHALL support a `--skip-specs` flag that skips all spec update operations and proceeds directly to archiving.

#### Scenario: Skipping spec updates with flag

- **WHEN** executing `openspec archive <change> --skip-specs`
- **THEN** skip spec discovery and update confirmation
- **AND** proceed directly to moving the change to archive
- **AND** display a message indicating specs were skipped

### Requirement: Non-blocking confirmation

The archive operation SHALL proceed when the user declines spec updates instead of cancelling the entire operation.

#### Scenario: User declines spec update confirmation

- **WHEN** the user declines spec update confirmation
- **THEN** skip spec updates
- **AND** continue with the archive operation
- **AND** display a success message indicating specs were not updated

### Requirement: Display Output

The command SHALL provide clear feedback about delta operations.

#### Scenario: Showing delta application

- **WHEN** applying delta changes
- **THEN** display for each spec:
  - Number of requirements added
  - Number of requirements modified
  - Number of requirements removed
  - Number of requirements renamed
- **AND** use standard output symbols (+ ~ - →) as defined in openspec-conventions:
  ```
  Applying changes to specs/user-auth/spec.md:
    + 2 added
    ~ 3 modified
    - 1 removed
    → 1 renamed
  ```

### Requirement: Archive Validation

The archive command SHALL validate changes before applying them to ensure data integrity.

#### Scenario: Pre-archive validation

- **WHEN** executing `openspec archive change-name`
- **THEN** validate the change structure first
- **AND** only proceed if validation passes
- **AND** show validation errors if it fails

#### Scenario: Proposal warnings stay proposal-level

- **WHEN** archiving a change
- **THEN** the non-blocking proposal warnings SHALL NOT repeat requirement-level
  issues reached through the delta specs
- **AND** a requirement removed by a `## REMOVED Requirements` delta SHALL NOT be
  reported as missing a scenario
- **AND** proposal-level issues SHALL still be reported

#### Scenario: Force archive without validation

- **WHEN** executing `openspec archive change-name --no-validate`
- **THEN** skip validation (unsafe mode)
- **AND** show warning about skipping validation

### Requirement: Local Archive Date

The archive command SHALL derive the `YYYY-MM-DD` prefix of a new archive target from the calendar date in the effective local time zone of the Node.js process executing the CLI.

#### Scenario: Archive crosses a UTC date boundary

- **GIVEN** the CLI process's effective local time zone is `Asia/Shanghai`
- **AND** the current instant is `2026-07-14T16:30:00.000Z`
- **WHEN** the user archives a change named `add-auth`
- **THEN** the target archive name begins with `2026-07-15-add-auth`

#### Scenario: Non-interactive archive uses the local date

- **WHEN** an automation invokes `openspec archive <change-name> --yes`
- **THEN** the target archive name uses the CLI process's effective local calendar date

### Requirement: Archive incomplete-task gate SHALL use the tracked-tasks artifact glob

`openspec archive`'s incomplete-task gate — the check that prevents archiving a change whose tasks are not all complete — SHALL read task progress through the change's tracked-tasks artifact glob, the same file-resolution `openspec status` and `openspec view` use, rather than a fixed `changes/<name>/tasks.md` path. The tracked-tasks artifact SHALL be identified as the artifact whose `generates` equals the schema's `apply.tracks` value, falling back to the artifact with id `tasks` when no `apply` block is present; checkbox counts SHALL be aggregated across every file matched by that artifact's `generates` glob, scoped to the change directory. When the schema cannot be resolved or no tracked-tasks artifact is found, the gate SHALL fall back to a single top-level `tasks.md` exactly as today and SHALL NOT crash. This closes the data-safety gap where a change whose tasks live in nested/glob `tasks.md` files is read as having zero tasks, no incomplete work, and is allowed to archive while unfinished.

#### Scenario: Glob-tasks change with unfinished work cannot archive

- **GIVEN** a schema whose tasks artifact `generates` is `**/tasks.md`
- **AND** a change with `backend/tasks.md` containing unchecked tasks and no top-level `tasks.md`
- **WHEN** running `openspec archive` on that change
- **THEN** the incomplete-task gate SHALL detect the unfinished tasks and block (or require explicit override of) the archive
- **AND** SHALL NOT treat the change as having zero tasks

#### Scenario: Archive gate resolves the same tracked files as view

- **GIVEN** any change with a tracked-tasks glob
- **WHEN** the `archive` incomplete-task gate and `openspec view` each compute task progress for that change
- **THEN** they SHALL resolve the same set of `tasks.md` files and count the same checkboxes

#### Scenario: Unresolvable schema falls back without error

- **GIVEN** a change whose configured schema cannot be resolved
- **WHEN** running `openspec archive` on that change
- **THEN** the incomplete-task gate SHALL fall back to a single top-level `tasks.md`
- **AND** SHALL NOT crash

#### Scenario: Single top-level tasks file archiving is unchanged

- **GIVEN** a change with a single top-level `changes/<name>/tasks.md`, or a project with no resolvable schema
- **WHEN** running `openspec archive`
- **THEN** the incomplete-task gate SHALL behave exactly as today

## Why These Decisions

**Interactive selection**: Reduces typing and helps users see available changes
**Task checking**: Prevents accidental archiving of incomplete work
**Date prefixing**: Maintains chronological order and prevents naming conflicts; a name that already carries a date prefix keeps it, so archived names never stack dates
**No overwrite**: Preserves historical archives and prevents data loss
**Spec updates before archiving**: Specs in the main directory represent current reality; when a change is deployed and archived, its future state specs become the new reality and must replace the main specs
**Confirmation for spec updates**: Provides visibility into what will change, prevents accidental overwrites, and ensures users understand the impact before specs are modified
**--yes flag for automation**: Allows CI/CD pipelines to archive without interactive prompts while maintaining safety by default for manual use