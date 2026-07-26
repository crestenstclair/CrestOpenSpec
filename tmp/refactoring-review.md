# Refactoring Review: codex/runtime-lifecycle-acceptance-gates

**Date:** 2026-07-26
**Base branch:** codex/adversarial-acceptance-gates (`2a5554c`)
**Files reviewed:** 39

## Critical Issues

None remaining. The review found and corrected one interaction state-machine edge: a provider could previously be invoked after both bounding milestones were already observed, then self-report an earlier delivery time. The supervisor now rejects a closed window without invoking the provider and rejects evidence dated before provider invocation.

## Refactoring Opportunities

- `ProcessLifecycleRuntimeProvider.run` coordinates capture, marker recognition, interaction dispatch, timeout state, teardown, and evidence assembly. If the runtime model grows, extract a marker tracker and interaction coordinator before adding another lifecycle branch. The current single state machine is explicit and covered, so splitting it during this feature would add more transition risk than value.
- Runtime declaration parsing is a cohesive but large section of `validation-inventory.ts`. A future declaration type should trigger extraction to a dedicated runtime-proof parser rather than extending the inventory file again.

## Minor Suggestions

- The runtime-session and interaction-provider registries intentionally repeat a small map-backed registration API. Keep the duplication until a third registry needs identical semantics; a generic registry now would be speculative.
- Keep platform process-tree and PTY behavior behind the existing adapters. Avoid leaking platform conditionals back into the lifecycle state machine.

## Summary

The design has clear provider, launcher, process-tree, parsing, orchestration, and report boundaries. The main state machine is long but cohesive around one supervised session, with direct fixture coverage for every terminal transition and cleanup path. No behavior-preserving refactor is required before handoff; the two extraction points above are appropriate only if those areas grow again.
