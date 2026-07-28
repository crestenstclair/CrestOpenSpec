## ADDED Requirements

### Requirement: Runtime-session non-execution during archive
Archive and bulk archive SHALL consume reviewed completion state and user approval without starting deterministic runtime sessions, process supervisors, or interaction drivers.

#### Scenario: Archive a change with runtime declarations
- **WHEN** a user approves archive for a change whose evaluated architecture declares runtime-session proofs
- **THEN** archive performs its normal validation, spec update, and record operation without invoking acceptance or any runtime provider
