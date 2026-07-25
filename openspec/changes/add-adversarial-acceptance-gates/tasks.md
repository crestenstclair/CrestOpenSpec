## 1. Neutral Acceptance Contracts

- [x] 1.1 Define versioned acceptance, gate, check, process, assertion, diagnostic, and test-evidence types without ecosystem-specific fields
- [x] 1.2 Implement injectable assertion-evaluator and test-evidence-provider registries with deterministic duplicate/lookup behavior
- [x] 1.3 Add generic process-result assertion evaluators and focused registry/evaluator tests

## 2. CUE Declarations and Strict Validation

- [x] 2.1 Parse `completion.projectChecks` and top-level project validations from evaluated CUE with exact project-scope identity resolution
- [x] 2.2 Fail closed for missing, duplicate, ambiguous, malformed, and local-scope project-check references before execution
- [x] 2.3 Reuse strict shared validators for selected changes, affected canonical specs, and in-memory post-delta specs
- [x] 2.4 Implement project/release strict validation across every active change and canonical specification
- [x] 2.5 Add valid/invalid CUE and declaration-resolution tests, including canonical/store-aware roots
- [x] 2.6 Inventory attached resource/relationship/capability/invariant/witness/acceptance-asset validations with explicit change/release applicability
- [x] 2.7 Reject orphaned evidence references, duplicated identities, ambiguous owners, and missing/malformed attached-test applicability before execution

## 3. Bounded Command and Assertion Execution

- [x] 3.1 Implement a shell-free command runner using declared argument vectors and canonical in-project working directories
- [x] 3.2 Enforce declared timeout and independent stdout/stderr byte limits while retaining bounded diagnostics
- [x] 3.3 Record exit, signal, timeout, output-limit, spawn error, duration, arguments, working directory, and limits without environment data
- [x] 3.4 Evaluate every declared assertion after each executed process and make unsupported/malformed/false assertions blocking
- [x] 3.5 Test success, nonzero exit, signal, timeout, unavailable executable, output limit, assertion failure, literal argument safety, and paths containing spaces

## 4. Test Evidence Providers

- [x] 4.1 Implement the neutral provider interface and explicit provider selection with no inferred default
- [x] 4.2 Implement the runner-neutral `structured-json-v1` provider over an explicitly selected complete stdout/stderr document
- [x] 4.3 Centrally validate nonnegative counts, accounting consistency, failures, and `executed >= minimumExecuted >= 1`
- [x] 4.4 Test positive execution, zero execution after process success, unknown/malformed/inconsistent evidence, and unsupported providers
- [x] 4.5 Prove a custom provider can be registered and selected without changing acceptance orchestration or workflow logic
- [x] 4.6 Prove non-test executable checks are unaffected by test-count enforcement
- [x] 4.7 Bind provider evidence to the exact opaque selector and reject broad-run evidence for a different targeted declaration

## 5. Acceptance Service and CLI

- [x] 5.1 Implement the transient acceptance orchestrator with architecture, strict-validation, resolution, process, assertion, and test-evidence gates
- [x] 5.2 Ensure validation/declaration failures prevent all project command execution while executed checks all produce complete results
- [x] 5.3 Add deterministic human rendering and exactly one versioned JSON result with enforceable nonzero exit status
- [x] 5.4 Register `openspec acceptance <change>` plus mutually exclusive project/release scope and canonical store options
- [x] 5.5 Add command registry/completion metadata and public documentation for the acceptance surface and report contract
- [x] 5.6 Test one-document JSON failures, human output, root/store canonicalization, and explicit scope errors

## 6. End-of-Execute Enforcement

- [x] 6.1 Run semantic and deterministic acceptance after the final execute/apply task and before reporting implementation complete
- [x] 6.2 Route an already-`all_done` apply invocation directly to end-of-execute acceptance instead of suggesting archive prematurely
- [x] 6.3 Keep paused or partial implementation out of final acceptance and preserve exact progress/blocker reporting
- [x] 6.4 Keep a failed gate inside the implementation repair loop and withhold execute-phase completion
- [x] 6.5 Remove acceptance reruns and acceptance report fields from core archive so archive remains an approval and record mutation

## 7. Shared Adversarial Workflow Contract

- [x] 7.1 Create one shared phase-aware execution-acceptance contract for apply and explicit verify templates
- [x] 7.2 Require evaluated CUE first, exact applicability classifications, complete finding evidence, controlled proof, and distinct deterministic results
- [x] 7.3 Expressly forbid blocking on absent deferred scope, keyword suspicion, missing future functionality, or lack of investigation
- [x] 7.4 Refactor apply and verify source templates to use the shared contract and withhold execute completion on blockers
- [x] 7.5 Refactor archive and bulk archive to obtain user approval and invoke core archive without repeating implementation acceptance
- [x] 7.6 Regenerate committed skills/commands and add source/generated/template parity tests
- [x] 7.7 Add the production-composition, negotiation-before-preparation, asynchronous-failure, end-to-end-observability, and validation-integrity guard matrix to the shared contract
- [x] 7.8 Add language-neutral conforming and violating review fixtures for every mandatory drift guard without implementing source-language inference

## 8. Documentation and Compatibility

- [x] 8.1 Document the two acceptance layers and the direct CLI's semantic-review boundary
- [x] 8.2 Document the language-agnostic CUE validation/proof schema, provider extension point, evidence consistency rules, and zero-test failure
- [x] 8.3 Document explicit execution/security limits, transient behavior, canonical paths, and non-executing read workflows
- [x] 8.4 Document end-of-execute enforcement and archive as a non-repeating approval/record phase
- [x] 8.5 Document phase-aware obligation/finding classes and non-blocking deferred observations

## 9. Verification

- [x] 9.1 Build the TypeScript CLI and bundled CUE bridge
- [x] 9.2 Run focused CUE, declaration, runner, assertion, provider, service, CLI, execute/apply, archive, and template tests
- [x] 9.3 Run self-contained passing, failing, unsupported-provider, and successful-zero-test acceptance fixtures
- [x] 9.4 Run linting, TypeScript checking through the repository build, Go tests, and Windows/path-canonicalization regressions
- [x] 9.5 Run the complete repository test suite
- [x] 9.6 Strictly validate `add-adversarial-acceptance-gates` and audit every proposal/spec/design/task requirement against current evidence
- [x] 9.7 Verify a broad project suite cannot hide a zero-selection resource test or supply selector-mismatched evidence
