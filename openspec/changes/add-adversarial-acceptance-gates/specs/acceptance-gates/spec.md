## ADDED Requirements

### Requirement: Explicit deterministic acceptance surface

OpenSpec SHALL provide an explicit acceptance operation for a selected change and a project/release operation for all applicable OpenSpec material, using the same canonical repository and store selection behavior as other top-level commands.

#### Scenario: Accept one change

- **WHEN** a user runs `openspec acceptance <change-name>`
- **THEN** OpenSpec evaluates the mandatory gates for that selected change
- **AND** reports the canonical root and selected change

#### Scenario: Accept a project or release

- **WHEN** a user runs acceptance in project or release mode
- **THEN** OpenSpec evaluates all applicable active changes and canonical specifications
- **AND** executes the declared project completion checks once

#### Scenario: Use a registered store

- **WHEN** a user selects a registered store for acceptance
- **THEN** OpenSpec resolves the same canonical store root used by other commands
- **AND** all validation and command working directories derive from that root

#### Scenario: Reject ambiguous scope

- **WHEN** a user supplies both a change name and project/release mode
- **THEN** OpenSpec returns a structured nonzero usage failure
- **AND** executes no project check

### Requirement: CUE architecture gate and applicability

Acceptance SHALL evaluate the complete top-level CUE package in memory and SHALL fail closed when an applicable architecture cannot be resolved concretely. The executable-gate contract SHALL be considered declared when evaluated CUE contains `completion.projectChecks` or any attached validation contains a `proof` field.

#### Scenario: Valid declared architecture

- **WHEN** the top-level CUE package evaluates to a concrete project with `completion.projectChecks`
- **THEN** the architecture gate passes
- **AND** acceptance proceeds to strict OpenSpec validation and every applicable executable validation

#### Scenario: Attached proof declares the contract without project checks

- **WHEN** evaluated CUE has no `completion.projectChecks` field but contains an attached validation with a `proof` field
- **THEN** the executable-gate contract is applicable
- **AND** acceptance validates its inventory and executes every attachment applicable to the selected scope

#### Scenario: CUE evaluation fails

- **WHEN** the bridge reports a package conflict, incomplete value, missing project, invalid JSON, or other evaluation error
- **THEN** acceptance returns a blocking architecture failure
- **AND** executes no project check or attached test validation

#### Scenario: Project has no CUE package

- **WHEN** a project has no top-level CUE package
- **THEN** CUE and executable gates are reported as `not applicable`
- **AND** OpenSpec does not claim that those gates ran

#### Scenario: CUE has no executable gate declaration

- **WHEN** valid evaluated CUE contains neither `completion.projectChecks` nor an attached validation with a `proof` field
- **THEN** executable acceptance is reported as `not applicable`
- **AND** legacy project behavior remains available

#### Scenario: Gate declaration is malformed

- **WHEN** `completion.projectChecks` exists but is not a valid reference list
- **THEN** acceptance fails closed
- **AND** the malformed declaration cannot be treated as an opt-out

### Requirement: Strict OpenSpec validation gate

Applicable acceptance SHALL use the shared strict validator to validate the selected OpenSpec material and SHALL treat warnings and errors as blocking.

#### Scenario: Change scope validates affected material

- **WHEN** acceptance evaluates a selected change
- **THEN** it strictly validates the change and its delta specs
- **AND** strictly validates every existing canonical specification affected by the change
- **AND** strictly validates each resulting post-delta specification in memory

#### Scenario: Project scope validates all material

- **WHEN** acceptance runs in project/release mode
- **THEN** it strictly validates every active change and every canonical specification
- **AND** reports an item result for each validation target

#### Scenario: Strict warning blocks acceptance

- **WHEN** shared validation reports a warning or error for applicable material
- **THEN** the strict OpenSpec gate fails
- **AND** no project check or attached test validation is executed

### Requirement: Exact project-check resolution

Acceptance SHALL resolve every `completion.projectChecks` reference to exactly one top-level project-scope validation before executing any check.

#### Scenario: All references resolve uniquely

- **WHEN** every non-empty reference names exactly one top-level validation with project scope
- **THEN** acceptance executes every resolved validation
- **AND** preserves the declared reference order in its report

#### Scenario: Referenced validation is missing

- **WHEN** a project-check reference matches no project-scope validation
- **THEN** acceptance fails before executing checks
- **AND** identifies the missing reference

#### Scenario: Project-check reference is duplicated

- **WHEN** the completion list repeats a project-check reference
- **THEN** acceptance fails before executing checks
- **AND** identifies the duplicate reference

#### Scenario: Validation identity is ambiguous

- **WHEN** more than one project validation declares the referenced identity
- **THEN** acceptance fails before executing checks
- **AND** identifies every conflicting declaration

#### Scenario: Reference or validation is malformed

- **WHEN** a reference is empty or non-string, or its validation lacks a valid project scope, argument vector, working directory, limits, assertion declaration, or proof declaration
- **THEN** acceptance returns a structured declaration failure
- **AND** executes no check

### Requirement: Applicable validation inventory integrity

Acceptance SHALL inventory project checks plus every test-bearing validation attached to an applicable evaluated CUE resource, relationship, capability, invariant, witness, or acceptance asset, and SHALL bind every execution to one unique identity, owner, declaration location, and selector.

#### Scenario: Attached test is always applicable

- **WHEN** an attached test validation declares `scope: attached` and applicability mode `always`
- **THEN** acceptance includes it independently of broader project checks
- **AND** reports its evaluated owner path and declaration location

#### Scenario: Attached test selects the current change

- **WHEN** an attached test validation declares change applicability containing the selected change
- **THEN** change-scoped acceptance includes and executes that validation
- **AND** preserves its exact declared selector in the evidence request

#### Scenario: Attached test belongs to another explicit change

- **WHEN** valid applicability metadata names changes other than the selected change
- **THEN** change-scoped acceptance excludes that declaration
- **AND** does not infer applicability from roadmap prose

#### Scenario: Attached test applicability is missing or malformed

- **WHEN** an attached test-bearing validation has no deterministically valid applicability declaration
- **THEN** inventory construction fails closed
- **AND** no validation command executes

#### Scenario: Validation identity has multiple owners

- **WHEN** the same validation identity is declared at multiple applicable owner locations
- **THEN** acceptance reports duplicated identity and ambiguous ownership
- **AND** no validation command executes

#### Scenario: Evidence reference is orphaned

- **WHEN** evaluated architecture evidence references a validation identity that has no unique declaration
- **THEN** acceptance reports an orphaned or ambiguous evidence reference
- **AND** fails before execution

#### Scenario: Broad project suite and targeted attached test coexist

- **WHEN** a project completion check runs a broad suite and an applicable attached validation declares a targeted test selector
- **THEN** acceptance executes and evaluates both declarations independently
- **AND** broad-suite success cannot make the targeted declaration pass

#### Scenario: Resource-level selector executes zero tests

- **WHEN** the broad project suite passes with positive evidence but an applicable resource-level validation exits zero and reports zero executed tests for its selector
- **THEN** acceptance fails the resource-level validation
- **AND** preserves the broad suite as a separate passing check

### Requirement: Safe neutral command execution

Acceptance SHALL execute each resolved check directly from its declared argument vector with no shell interpolation, an explicit canonical working directory, and enforced timeout and bounded-output limits.

#### Scenario: Command succeeds

- **WHEN** a declared executable completes with exit code zero within its limits
- **THEN** the process portion of the check passes
- **AND** acceptance records its argument vector, canonical working directory, limits, duration, exit state, stdout, and stderr

#### Scenario: Command exits nonzero

- **WHEN** an executed check exits with a nonzero code
- **THEN** its process result is blocking
- **AND** assertions and diagnostics remain present in the report

#### Scenario: Command receives a signal

- **WHEN** an executed check terminates by signal
- **THEN** its process result is blocking
- **AND** the signal is recorded separately from an exit code

#### Scenario: Command times out

- **WHEN** an executed check exceeds its declared timeout
- **THEN** OpenSpec terminates the process
- **AND** records a blocking timeout result

#### Scenario: Command exceeds an output limit

- **WHEN** stdout or stderr exceeds its declared capture limit
- **THEN** OpenSpec bounds retained diagnostics and terminates the process
- **AND** records which limit was exceeded as a blocking result

#### Scenario: Executable is unavailable

- **WHEN** the argument vector names an unavailable executable
- **THEN** acceptance returns a structured spawn failure
- **AND** never converts the check to passing or skipped

#### Scenario: Arguments contain shell metacharacters

- **WHEN** an argument contains spaces, quotes, substitutions, separators, or other shell syntax
- **THEN** the executable receives that value as one literal argument
- **AND** OpenSpec does not invoke a shell

#### Scenario: Working path contains spaces or aliases

- **WHEN** a project or validation working directory contains spaces or is reached through an alias path
- **THEN** OpenSpec executes with its canonical filesystem identity
- **AND** reports a platform-native canonical path

### Requirement: Assertion evaluation for every executed check

Acceptance SHALL run an assertion phase for every executed check, evaluate every declared assertion against the neutral process result, and treat malformed, unsupported, or false assertions as blocking.

#### Scenario: All assertions pass

- **WHEN** every declared assertion evaluates true against the captured process result
- **THEN** the assertion gate for that check passes
- **AND** each assertion has an individual result

#### Scenario: Assertion fails

- **WHEN** a declared exit, stdout, or stderr assertion evaluates false
- **THEN** acceptance fails that check
- **AND** reports the assertion type, expected condition, and observed result

#### Scenario: Assertion type is unsupported

- **WHEN** no registered evaluator supports a declared assertion type
- **THEN** acceptance returns a failed assertion result
- **AND** does not skip or assume the assertion

#### Scenario: Process fails before assertions

- **WHEN** an executed process exits nonzero, is signaled, times out, or encounters a bounded-output failure
- **THEN** acceptance still returns a result for every declared assertion
- **AND** the process failure remains independently blocking

### Requirement: Mandatory nonzero test evidence

Every validation explicitly declared as a test suite SHALL provide trustworthy provider evidence that its executed count meets `minimumExecuted`, whose default and minimum value is one. Process success alone SHALL NOT satisfy this gate.

#### Scenario: Successful process executed zero tests

- **WHEN** a test-suite command exits zero but its provider reports `executed: 0`
- **THEN** acceptance fails the test-evidence gate
- **AND** preserves the successful process result separately

#### Scenario: Positive executed count meets the minimum

- **WHEN** a provider reports valid evidence with `executed` at least `minimumExecuted` and no failed tests
- **THEN** the test-evidence gate passes
- **AND** the neutral evidence is included in the check result

#### Scenario: Executed count is unknown

- **WHEN** a provider cannot establish an executed test count
- **THEN** acceptance fails closed
- **AND** discovered, enumerated, compiled, filtered, skipped, or ignored tests do not substitute for execution

#### Scenario: Evidence is malformed or inconsistent

- **WHEN** evidence contains negative/non-integer counts, incompatible totals, impossible discovery counts, or positive failed tests
- **THEN** acceptance returns a blocking evidence failure
- **AND** does not accept the provider's success claim

#### Scenario: Test provider is unavailable

- **WHEN** a test-suite declaration selects an unregistered provider
- **THEN** acceptance fails the check with an unsupported-provider diagnostic
- **AND** never treats the proof as skipped

#### Scenario: Evidence selector does not match the declaration

- **WHEN** provider evidence from a broad or related invocation carries a selector different from the exact validation declaration
- **THEN** acceptance rejects that evidence as mismatched
- **AND** does not reuse its executed count for the targeted validation

#### Scenario: Non-test check succeeds without test counts

- **WHEN** an integration check, smoke program, linter, compiler, formatter, or other validation does not declare test-suite proof
- **THEN** acceptance does not impose a test-count rule
- **AND** its process and assertion gates still apply

### Requirement: Extensible evidence providers

Acceptance SHALL select test evidence only by explicit validation metadata through a provider registry whose providers are peers and whose output uses a common neutral evidence contract.

#### Scenario: Register and select a provider

- **WHEN** a provider is registered under an ID and a validation explicitly selects that ID
- **THEN** the provider receives the neutral process result and its opaque options
- **AND** core applies the same selector-binding, evidence consistency, and minimum-execution rules to its result

#### Scenario: Add another test runner

- **WHEN** support for another test runner is added
- **THEN** only a provider implementation and registration are required
- **AND** acceptance orchestration, end-of-execute workflow integration, report models, and CUE/OpenSpec semantics remain unchanged

#### Scenario: Neutral structured evidence provider

- **WHEN** a validation selects the built-in structured JSON provider and names a process stream
- **THEN** the provider requires that entire stream to contain one neutral evidence document
- **AND** runner-specific prose is not parsed by core acceptance code

### Requirement: Structured evidence and enforceable status

Acceptance SHALL produce deterministic human output and exactly one versioned JSON document in JSON mode, and SHALL return nonzero whenever an applicable mandatory gate fails.

#### Scenario: Successful JSON report

- **WHEN** all applicable mandatory gates pass in JSON mode
- **THEN** stdout contains exactly one JSON document with `passed: true`
- **AND** the process exits successfully

#### Scenario: Failed JSON report

- **WHEN** any applicable mandatory gate fails in JSON mode
- **THEN** stdout still contains exactly one parseable JSON document with `passed: false`
- **AND** the process exits nonzero

#### Scenario: Report contains execution provenance

- **WHEN** at least one project check or applicable attached test validation executes
- **THEN** its result includes validation identity, declaration location and owner, exact selector when test-bearing, argument vector, canonical working directory, enforced limits, timing, termination state, assertion results, test evidence when declared, and bounded stdout/stderr diagnostics
- **AND** the report contains no environment keys or values

#### Scenario: Deterministic gates pass

- **WHEN** an acceptance report passes every deterministic gate
- **THEN** it states that semantic conformance still requires adversarial review
- **AND** it does not claim implementation correctness from command success

### Requirement: Transient explicit-execution boundary

Acceptance evidence SHALL remain transient, and repository-declared commands SHALL execute only through explicit command-running workflows.

#### Scenario: Run explicit acceptance

- **WHEN** a user invokes acceptance directly or an execute/apply workflow invokes it at completion
- **THEN** OpenSpec may run declared project checks and applicable attached test validations in the foreground
- **AND** returns evidence for that invocation only

#### Scenario: Perform an ordinary read

- **WHEN** a user invokes context, list, planning, static validation, or ordinary progress without an explicit check action
- **THEN** OpenSpec executes no repository-declared command

#### Scenario: Acceptance completes

- **WHEN** acceptance passes or fails
- **THEN** OpenSpec writes no database, cache, daemon state, generated status manifest, or mutable verification ledger
