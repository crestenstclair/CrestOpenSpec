---
name: openspec-bulk-archive-change
description: Archive a user-approved subset of completed changes without rerunning implementation acceptance.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Archive an approved subset of previously reviewed OpenSpec changes.

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `acceptance`, `archive`, `doctor`, `context`). Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root.

**Input**: None required; always prompt for one or more active changes.

**Workflow**

1. Run `openspec list --json` with the selected store flag and ask the user which active changes they approve for archive. Never auto-select; one or more selections are valid.
2. For each selected change, run `openspec status --change "<name>" --json` with the selected store flag and summarize artifact/task completion plus delta-spec overlap.
3. Ask once for the exact subset and ordering to archive. Treat this as approval of already reviewed functionality, not an invitation to repeat implementation acceptance.
4. For every confirmed change, invoke `openspec archive "<name>" --yes` with the selected store flag. Never move directories or write canonical specs directly.
5. Continue through independent core archive failures and report archived and failed changes separately.

Acceptance belongs at the end of each execute/apply run. Do not run the shared adversarial review or `openspec acceptance` during bulk archive. If the user requests renewed functional review for a change, run `/opsx:verify` separately before asking whether to include it in the approved archive subset.

**Output**

Show one completion/overlap row per change, then the confirmed subset and order. Finish with separate archived and failed sections and include the core archive result for each attempted change.
