## ADDED Requirements

### Requirement: Runtime lifecycle and interleaving review
The verify workflow SHALL use the shared end-of-execute contract to map applicable external runtime claims to matching production-boundary proofs and to audit terminal lifecycle and material concurrent interleavings.

#### Scenario: Verify finds an unproved external lifecycle
- **WHEN** the current change claims an external process, native environment, device, service, worker, or callback runtime without an applicable same-boundary proof
- **THEN** verify reports `BLOCKING_REQUIRED_PROOF_GAP` with the exact authority, entry point, missing witness, and repair direction

#### Scenario: Verify finds a complete runtime proof
- **WHEN** the matching runtime proof establishes declared success, bounded teardown, parent exit, descendant cleanup, and every required interaction
- **THEN** verify reports the semantic result separately from the deterministic acceptance report
