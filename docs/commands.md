# Commands

This is the reference for OpenSpec's slash commands. These commands are invoked in your AI coding assistant's chat interface (e.g., Claude Code, Cursor, Windsurf).

For workflow patterns and when to use each command, see [Workflows](workflows.md). For CLI commands, see [CLI](cli.md).

## Quick Reference

### Default Quick Path (`core` profile)

| Command | Purpose |
|---------|---------|
| `/opsx:propose` | Create a change and generate planning artifacts in one step |
| `/opsx:explore` | Think through ideas before committing to a change |
| `/opsx:apply` | Implement tasks from the change |
| `/opsx:update` | Revise a change's planning artifacts and keep them coherent |
| `/opsx:sync` | Merge delta specs into main specs |
| `/opsx:archive` | Archive a completed change |

### Expanded Workflow Commands (custom workflow selection)

| Command | Purpose |
|---------|---------|
| `/opsx:new` | Start a new change scaffold |
| `/opsx:continue` | Create the next artifact based on dependencies |
| `/opsx:ff` | Fast-forward: create all planning artifacts at once |
| `/opsx:verify` | Validate implementation matches artifacts |
| `/opsx:bulk-archive` | Archive multiple changes at once |
| `/opsx:onboard` | Guided tutorial through the complete workflow |

The default global profile is `core`. To enable expanded workflow commands, run `openspec config profile`, select workflows, then run `openspec update` in your project.

---

## Command Reference

### `/opsx:propose`

Create a new change and generate planning artifacts in one step. This is the default start command in the `core` profile.

**Syntax:**
```text
/opsx:propose [change-name-or-description]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name-or-description` | No | Kebab-case name or plain-language change description |

**What it does:**
- Creates `openspec/changes/<change-name>/`
- Generates artifacts needed before implementation (for `spec-driven`: proposal, specs, design, tasks)
- Stops when the change is ready for `/opsx:apply`

**Example:**
```text
You: /opsx:propose add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md
     ✓ specs/ui/spec.md
     ✓ design.md
     ✓ tasks.md
     Ready for implementation. Run /opsx:apply.
```

**Tips:**
- Use this for the fastest end-to-end path
- If you want step-by-step artifact control, enable expanded workflows and use `/opsx:new` + `/opsx:continue`

---

### `/opsx:explore`

> **Start here when you're unsure.** Explore is a no-stakes thinking partner: it reads your codebase, compares options, and sharpens a fuzzy idea into a concrete plan before any change exists. It ships in the default profile. For the full case and more examples, see the [Explore First](explore.md) guide.

Think through ideas, investigate problems, and clarify requirements before committing to a change.

**Syntax:**
```
/opsx:explore [topic]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `topic` | No | What you want to explore or investigate |

**What it does:**
- Opens an exploratory conversation with no structure required
- Investigates the codebase to answer questions
- Compares options and approaches
- Creates visual diagrams to clarify thinking
- Can transition to `/opsx:propose` (default) or `/opsx:new` (expanded workflow) when insights crystallize

**Example:**
```text
You: /opsx:explore

AI:  What would you like to explore?

You: How should we handle authentication for the mobile app?

AI:  Let me investigate your current auth setup...
     [Analyzes codebase]

     I see you're using session-based auth for the web app.
     For mobile, we have three main options:

     1. JWT tokens (stateless, works offline)
     2. OAuth2 (if you need third-party login)
     3. Extend current sessions (simpler, but requires connectivity)

     Your API already has CORS configured. Which direction interests you?

You: Let's go with JWT. Can we start a change for that?

AI:  Ready when you are. Run /opsx:propose add-jwt-auth to begin.
```

**Tips:**
- Use when requirements are unclear or you need to investigate
- No artifacts are created during exploration
- Good for comparing multiple approaches before deciding
- Can read files and search the codebase

---

### `/opsx:new`

Start a new change scaffold. Creates the change folder and waits for you to generate artifacts with `/opsx:continue` or `/opsx:ff`.

This command is part of the expanded workflow set (not included in the default `core` profile).

**Syntax:**
```
/opsx:new [change-name] [--schema <schema-name>]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Name for the change folder (prompted if not provided) |
| `--schema` | No | Workflow schema to use (default: from config or `spec-driven`) |

**What it does:**
- Creates `openspec/changes/<change-name>/` directory
- Creates `.openspec.yaml` metadata file in the change folder
- Shows the first artifact template ready for creation
- Prompts for change name and schema if not provided

**What it creates:**
```
openspec/changes/<change-name>/
└── .openspec.yaml    # Change metadata (schema, created date)
```

**Example:**
```
You: /opsx:new add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     Schema: spec-driven

     Ready to create: proposal
     Use /opsx:continue to create it, or /opsx:ff to create all artifacts.
```

**Tips:**
- Use descriptive names: `add-feature`, `fix-bug`, `refactor-module`
- Avoid generic names like `update`, `changes`, `wip`
- Schema can also be set in project config (`openspec/config.yaml`)

---

### `/opsx:continue`

Create the next artifact in the dependency chain. Creates one artifact at a time for incremental progress.

**Syntax:**
```
/opsx:continue [change-name]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Which change to continue (inferred from context if not provided) |

**What it does:**
- Queries the artifact dependency graph
- Shows which artifacts are ready vs blocked
- Creates the first ready artifact
- Reads dependency files for context
- Shows what becomes available after creation

**Example:**
```
You: /opsx:continue

AI:  Change: add-dark-mode

     Artifact status:
     ✓ proposal    (done)
     ◆ specs       (ready)
     ◆ design      (ready)
     ○ tasks       (blocked - needs: specs)

     Creating specs...

     [Reads proposal.md, creates specs based on requirements]

     ✓ Created openspec/changes/add-dark-mode/specs/ui/spec.md

     Now available: tasks
     Run /opsx:continue to create the next artifact.
```

**Tips:**
- Use when you want to review each artifact before proceeding
- Good for complex changes where you want control
- Multiple artifacts may become ready simultaneously
- You can edit created artifacts before continuing

---

### `/opsx:ff`

Fast-forward through artifact creation. Creates all planning artifacts at once.

**Syntax:**
```
/opsx:ff [change-name]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Which change to fast-forward (inferred from context if not provided) |

**What it does:**
- Creates all artifacts in dependency order
- Tracks progress via todo list
- Stops when all `apply-required` artifacts are complete
- Reads each dependency before creating the next artifact

**Example:**
```
You: /opsx:ff add-dark-mode

AI:  Fast-forwarding add-dark-mode...

     ✓ Creating proposal.md
     ✓ Creating specs/ui/spec.md
     ✓ Creating design.md
     ✓ Creating tasks.md

     All planning artifacts complete!
     Ready for implementation. Run /opsx:apply to begin.
```

**Tips:**
- Use when you have a clear picture of what you're building
- Faster than `/opsx:continue` for straightforward changes
- You can still edit artifacts afterward
- Good for small to medium features

---

### `/opsx:apply`

Implement tasks from the change. Works through the task list, writing code and checking off items.

**Syntax:**
```
/opsx:apply [change-name]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Which change to implement (inferred from context if not provided) |

**What it does:**
- Reads `tasks.md` and identifies incomplete tasks
- Works through tasks one by one
- Writes code, creates files, runs tests as needed
- Marks tasks complete with checkboxes `[x]`
- After every task is complete, rebuilds final authority/architecture ledgers, runs final strict validation, and runs the shared semantic review plus deterministic `openspec acceptance` report (including applicable runtime sessions)
- Keeps execute/apply incomplete when acceptance finds a blocker, so repairs happen in the active implementation loop

**Example:**
```
You: /opsx:apply

AI:  Implementing add-dark-mode...

     Reading tasks.md:
     - [ ] 1.1 Create ThemeContext
     - [ ] 1.2 Add CSS custom properties
     - [ ] 1.3 Implement localStorage persistence

     Working on 1.1: Create ThemeContext...
     [Creates src/context/ThemeContext.tsx]

     ✓ 1.1 Complete

     Working on 1.2: Add CSS custom properties...
     [Updates src/styles/globals.css]

     ✓ 1.2 Complete
     ...

     End-of-execute acceptance:
     ✓ Semantic conformance
     ✓ Deterministic gates
     Implementation complete — ready for your review
```

**Tips:**
- Can resume where you left off if interrupted
- Use for parallel changes by specifying the change name
- Completion state is tracked in `tasks.md` checkboxes
- Starting apply with all tasks already complete still runs end-of-execute acceptance
- Archive does not rerun this acceptance work

---

### `/opsx:update`

Revise a change's existing planning artifacts and keep them coherent with one another. Planning artifacts only - it never edits code.

**Syntax:**

```text
/opsx:update [change-name]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Which change to update (inferred from context if not provided) |

**What it does:**

- Reads the change's artifacts via `openspec status --change <name> --json`
- Applies your requested revision, or reviews the artifacts for contradictions if you didn't name one
- Reconciles the other existing artifacts in any direction (a design edit may ripple back to the proposal)
- Confirms every edit with you before writing, one artifact at a time
- Ends by recommending the next step: `/opsx:continue` (artifacts missing), `/opsx:apply` (carry a revised plan into code), or `/opsx:archive` (all done)

**Example:**

```text
You: /opsx:update add-dark-mode - we're storing the theme in a cookie now, not localStorage

AI:  Reading add-dark-mode artifacts...

     The design references localStorage in two places; tasks 1.3 covers
     localStorage persistence; the proposal doesn't mention storage.

     Proposed revisions:
     1. design.md - swap localStorage decision for cookie storage
     2. tasks.md - reword task 1.3 to cookie persistence

     Apply revision 1? (design.md)
```

**Tips:**

- It won't create missing artifacts - that's `/opsx:continue`
- If the change was already implemented, follow up with `/opsx:apply` so the code matches the revised plan
- If your revision changes the *intent* of the change, start fresh with a new change instead (see [When to Update vs. Start Fresh](opsx.md#when-to-update-vs-start-fresh))

---

### `/opsx:verify`

Run both acceptance layers for a change: evidence-backed semantic conformance review and the deterministic `openspec acceptance` report.

**Syntax:**
```
/opsx:verify [change-name]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Which change to verify (inferred from context if not provided) |

**What it does:**
- Reads evaluated CUE before artifacts or implementation
- Classifies obligations as `CURRENT_SLICE`, `EVERGREEN_INVARIANT`, `DEFERRED_SCOPE`, or `UNAUTHORIZED_EARLY_SCOPE`
- Builds an architecture-conformance matrix across production composition, runtime preparation, asynchronous failure, end-to-end observability, and validation declarations
- Requires evidence-complete findings; keyword suspicion and missing deferred scope are not violations
- Runs final strict validation and `openspec acceptance <change-name> --json`, including applicable runtime lifecycle and controlled-interaction proofs, and keeps the result separate from semantic findings
- Reports `execution acceptance passed; ready for user review` only when both layers pass

**Blocking classes:**

| Class | Meaning |
|-------|---------|
| `BLOCKING_CURRENT_VIOLATION` | A production path contradicts the selected slice |
| `BLOCKING_EVERGREEN_VIOLATION` | A production path contradicts an always-applicable architecture rule |
| `BLOCKING_REQUIRED_PROOF_GAP` | Explicitly required current proof is missing or invalid |
| `DEFERRED_NOT_APPLICABLE` | Later roadmap scope, reported separately and non-blocking |
| `INFORMATIONAL_FUTURE_RISK` | Unproven future concern, reported separately and non-blocking |

**Example:**
```
You: /opsx:verify

AI:  Evaluated CUE first and classified current obligations.
     Semantic blockers: none
     Deferred: preference migration (not applicable to this slice)

     Deterministic acceptance:
     ✓ CUE architecture
     ✓ strict OpenSpec validation
     ✓ validation.all (12 tests executed)
     ✓ validation.theme-resource (2 targeted tests executed)

     Execution acceptance passed — ready for user review.
```

**Tips:**
- A passing command does not prove semantic conformance; both sections matter
- A broad suite cannot hide an applicable attached test that selects zero tests
- A success marker cannot hide a resident parent/child/resource, and a dry run cannot satisfy runtime lifecycle
- Applicable physical/native or interaction capability gaps block instead of passing or skipping
- Deferred roadmap absence is never a blocker
- See [Acceptance Gates](acceptance.md) for the declaration and evidence contracts

---

### `/opsx:sync`

**Optional command.** Merge delta specs from a change into main specs. Archive will prompt to sync if needed, so you typically don't need to run this manually.

**Syntax:**
```
/opsx:sync [change-name]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Which change to sync (inferred from context if not provided) |

**What it does:**
- Reads delta specs from change folder
- Parses ADDED/MODIFIED/REMOVED/RENAMED sections
- Merges changes into main `openspec/specs/` directory
- Preserves existing content not mentioned in delta
- Does not archive the change (remains active)

**Example:**
```text
You: /opsx:sync

AI:  Syncing add-dark-mode delta specs...

     Reading: openspec/changes/add-dark-mode/specs/ui/spec.md
     Target:  openspec/specs/ui/spec.md

     Changes to apply:
     ✓ ADDED: Theme Selection requirement (2 scenarios)
     ✓ ADDED: Accessibility requirement (1 scenario)

     Merging...
     ✓ openspec/specs/ui/spec.md updated

     Change remains active. Run /opsx:archive when ready to complete.
```

**When to use manually:**

| Scenario | Use sync? |
|----------|-----------|
| Long-running change, want specs in main before archiving | Yes |
| Multiple parallel changes need the updated base specs | Yes |
| Want to preview/review the merge separately | Yes |
| Quick change, going straight to archive | No (archive handles it) |

**Tips:**
- Sync is intelligent, not copy-paste
- Can add scenarios to existing requirements without duplicating
- Change stays active after sync (not archived)
- Most users will never need to call this directly—archive prompts if needed

---

### `/opsx:archive`

Archive a completed, reviewed change after user approval without repeating implementation acceptance.

**Syntax:**
```
/opsx:archive [change-name]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-name` | No | Which change to archive (inferred from context if not provided) |

**What it does:**
- Resolves the exact change and summarizes artifact/task completion
- Shows the intended delta-spec and archive effect
- Treats archive as user approval of already reviewed functionality
- Invokes core `openspec archive` after approval
- Does not rerun semantic or deterministic acceptance

**Example:**
```text
You: /opsx:archive

AI:  Change complete: 7/7 tasks
     Planned spec update: ui/theme requirement added
     Archive this reviewed change?

You: Yes

AI:  ✓ Specs updated
     ✓ Archived to openspec/changes/archive/2025-01-24-add-dark-mode/
```

**Tips:**
- Archived changes are preserved for history
- End-of-execute `/opsx:apply` owns normal functional acceptance
- Use `/opsx:verify` only when you deliberately want another full review before deciding whether to approve archive
- Archive flags retain their normal validation, confirmation, and spec-update meanings

---

### `/opsx:bulk-archive`

Archive an explicitly approved subset of completed changes.

**Syntax:**
```
/opsx:bulk-archive [change-names...]
```

**Arguments:**
| Argument | Required | Description |
|----------|----------|-------------|
| `change-names` | No | Specific changes to archive (prompts to select if not provided) |

**What it does:**
- Summarizes artifact/task completion and delta-spec overlap for each selected change
- Asks once for the exact approved subset and ordering
- Does not rerun implementation acceptance
- Invokes core archive separately for each approved change and continues through independent failures

**Example:**
```
You: /opsx:bulk-archive

AI:  Change             Tasks   Spec overlap
     add-dark-mode      7/7     specs/ui
     fix-login-bug      4/4     none
     update-footer      3/3     specs/ui

     Which exact subset and ordering do you approve for archive?

You: Archive add-dark-mode, then update-footer. Leave fix-login-bug active.

AI:  ✓ Archived add-dark-mode
     ✓ Archived update-footer
     Not selected: fix-login-bug
```

**Tips:**
- Good for parallel work streams
- Spec overlap helps choose a safe archive ordering
- A core failure for one approved change does not stop independent later attempts
- Use explicit `/opsx:verify` before approval when another functional review is wanted

---

### `/opsx:onboard`

Guided onboarding through the complete OpenSpec workflow. An interactive tutorial using your actual codebase.

**Syntax:**
```
/opsx:onboard
```

**What it does:**
- Walks through a complete workflow cycle with narration
- Scans your codebase for real improvement opportunities
- Creates an actual change with real artifacts
- Implements actual work (small, safe changes)
- Archives the completed change
- Explains each step as it happens

**Phases:**
1. Welcome and codebase analysis
2. Finding an improvement opportunity
3. Creating a change (`/opsx:new`)
4. Writing the proposal
5. Creating specs
6. Writing the design
7. Creating tasks
8. Implementing tasks (`/opsx:apply`)
9. Verifying implementation
10. Archiving the change
11. Summary and next steps

**Example:**
```
You: /opsx:onboard

AI:  Welcome to OpenSpec!

     I'll walk you through the complete workflow using your actual codebase.
     We'll find something small to improve, create a proper change for it,
     implement it, and archive it.

     Let me scan your codebase for opportunities...

     [Analyzes codebase]

     I found a few things we could work on:
     1. Add input validation to the contact form
     2. Improve error messages in the auth flow
     3. Add loading states to async buttons

     Which interests you? (or suggest something else)
```

**Tips:**
- Best for new users learning the workflow
- Uses real code, not toy examples
- Creates a real change you can keep or discard
- Takes 15-30 minutes to complete

---

## Command Syntax by AI Tool

Different AI tools use slightly different command syntax. Use the format that matches your tool:

| Tool | Syntax Example |
|------|----------------|
| Claude Code | `/opsx:propose`, `/opsx:apply` |
| Cursor | `/opsx-propose`, `/opsx-apply` |
| Windsurf | `/opsx-propose`, `/opsx-apply` |
| Copilot (IDE) | `/opsx-propose`, `/opsx-apply` |
| CodeArts | Skill-based invocations such as `/openspec-propose`, `/openspec-apply-change` (no generated `opsx-*` command files) |
| Codex | Skill-based invocations from `.agents/skills/openspec-*` (no generated `opsx-*` prompt files) |
| Oh My Pi | `/opsx-propose`, `/opsx-apply` |
| Kimi Code | Skill-based invocations such as `/skill:openspec-propose`, `/skill:openspec-apply-change` (no generated `opsx-*` command files) |
| Trae | `/opsx-propose`, `/opsx-apply` |

The intent is the same across tools, but how commands are surfaced can differ by integration.

> **Note:** GitHub Copilot commands (`.github/prompts/*.prompt.md`) are only available in IDE extensions (VS Code, JetBrains, Visual Studio). GitHub Copilot CLI does not currently support custom prompt files — see [Supported Tools](supported-tools.md) for details and workarounds.

---

## Legacy Commands

These commands use the older "all-at-once" workflow. They still work but OPSX commands are recommended.

| Command | What it does |
|---------|--------------|
| `/openspec:proposal` | Create all artifacts at once (proposal, specs, design, tasks) |
| `/openspec:apply` | Implement the change |
| `/openspec:archive` | Archive the change |

**When to use legacy commands:**
- Existing projects using the old workflow
- Simple changes where you don't need incremental artifact creation
- Preference for the all-or-nothing approach

**Migrating to OPSX:**
Legacy changes can be continued with OPSX commands. The artifact structure is compatible.

---

## Troubleshooting

### "Change not found"

The command couldn't identify which change to work on.

**Solutions:**
- Specify the change name explicitly: `/opsx:apply add-dark-mode`
- Check that the change folder exists: `openspec list`
- Verify you're in the right project directory

### "No artifacts ready"

All artifacts are either complete or blocked by missing dependencies.

**Solutions:**
- Run `openspec status --change <name>` to see what's blocking
- Check if required artifacts exist
- Create missing dependency artifacts first

### "Schema not found"

The specified schema doesn't exist.

**Solutions:**
- List available schemas: `openspec schemas`
- Check spelling of schema name
- Create the schema if it's custom: `openspec schema init <name>`

### Commands not recognized

The AI tool doesn't recognize OpenSpec commands.

**Solutions:**
- Ensure OpenSpec is initialized: `openspec init`
- Regenerate skills: `openspec update`
- Check that `.claude/skills/` directory exists (for Claude Code)
- Restart your AI tool to pick up new skills

### Artifacts not generating properly

The AI creates incomplete or incorrect artifacts.

**Solutions:**
- Add project context in `openspec/config.yaml`
- Add per-artifact rules for specific guidance
- Provide more detail in your change description
- Use `/opsx:continue` instead of `/opsx:ff` for more control

---

## Next Steps

- [Workflows](workflows.md) - Common patterns and when to use each command
- [CLI](cli.md) - Terminal commands for management and validation
- [Customization](customization.md) - Create custom schemas and workflows
