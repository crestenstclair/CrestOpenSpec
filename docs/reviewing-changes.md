# Reviewing a Change

OpenSpec's whole promise is that you and your AI **agree on what to build before any code is written.** That agreement only means something if you actually read what the AI drafted. This page is about the two minutes where you do that — what to open, in what order, and what to look for.

The bet is simple: catching a wrong turn in a one-paragraph plan is nearly free. Catching the same wrong turn in 300 lines of code is not. Review is where you collect on that bet.

## The two moments you review

There are exactly two:

```
/opsx:propose ──► REVIEW THE PLAN ──► /opsx:apply ──► REVIEW THE CODE ──► /opsx:archive
                  (before any code)                    (/opsx:verify)
```

1. **After `/opsx:propose`** (or `/opsx:ff`), before `/opsx:apply` — read the plan while it's still just words.
2. **After building**, with `/opsx:verify` — check that the code actually did what the plan said.

The first review is the one that saves you the most, and the one people skip. This page spends most of its time there.

## Read it in this order

A change is a folder of plain Markdown in `openspec/changes/<name>/`. Read the files in the order that lets you quit earliest if something's wrong:

```
openspec/changes/add-dark-mode/
├── proposal.md      1. the intent and scope   ← if this is wrong, stop here
├── specs/…/spec.md  2. the requirements       ← the heart of the review
├── design.md        (only for bigger changes) — the technical approach
└── tasks.md         3. the plan of work
```

You don't need to read every line. You need to answer three questions, one per file.

## The proposal: is this the right problem?

Open `proposal.md` first. It captures the "why" and "what" — the intent, the scope, the approach in a paragraph or two.

**What good looks like:** one clear intent, a scope you recognize, and a reason this is worth doing now.

**Red flags:**

- It solves a slightly *different* problem than the one you asked for.
- The scope has grown — you asked for a theme toggle and the proposal also touches auth "while we're in there."
- It's vague. "Improve the settings page" is not a scope; "add a dark-mode toggle that respects the OS preference" is.

**The question to answer:** *Does this match what I actually asked for, and is anything sneaking in?* If the answer is no, stop — don't read further, fix the proposal (see [Pushing back](#pushing-back-is-cheap)).

## The spec deltas: is "done" defined correctly?

This is the heart of the review. The delta specs under `specs/` say what will be *true* when the change ships — as requirements and the scenarios that prove them:

```markdown
## ADDED Requirements

### Requirement: Dark Mode Toggle
The system SHALL let a user switch between light and dark themes.

#### Scenario: Respects the OS preference on first load
- GIVEN a user who has never set a theme
- WHEN they open the app on a device set to dark mode
- THEN the app renders in dark mode
```

**What a good requirement looks like:** one clear `SHALL`/`MUST` statement you could hand to a tester, and at least one scenario whose GIVEN/WHEN/THEN actually exercises that statement.

**Red flags:**

- **A vague requirement.** "The system SHALL be fast" can't be built or tested. What's fast?
- **A requirement with no scenario**, or a scenario that doesn't test the requirement it sits under.
- **The most valuable catch of all: what's missing.** The AI faithfully writes down what you *said*. Your job is to notice what you *forgot* to say. If you cared most about the OS-preference case and no scenario mentions it, that's the review paying for itself.

Read the deltas asking *would I be happy if the system did exactly — and only — this?* Nothing here is about code yet, so it stays cheap to change.

## The tasks: is the plan of work sane?

Open `tasks.md` last. It's the implementation checklist the AI will work through.

**What good looks like:** ordered steps, each traceable to a requirement, nothing mysterious.

**Red flags:**

- A task with no matching requirement (where did that come from?).
- One giant "implement the feature" task that hides all the real decisions.
- A task that touches something outside the scope you just approved.

You're not estimating or micromanaging here — you're checking that the plan matches the requirements you already accepted.

## Pushing back is cheap

If any of the three questions came back wrong, say so. There are no phases and nothing is locked — you fix it and move on. Two ways, exactly as in [Editing a change](editing-changes.md):

- **Edit the file yourself.** It's plain Markdown; change the scope line, tighten a requirement, delete a task.
- **Tell the AI what's wrong** and let it revise: *"drop the auth changes — out of scope,"* *"add a scenario for when the user has already picked a theme,"* *"split task 3 into schema and UI."*

Then re-read the part you changed. Re-draft until it's a plan you'd sign your name to. That back-and-forth *is* the product working.

## After the code: execution acceptance

Once the work is built, the end of `/opsx:apply` reads evaluated CUE and combines two evidence layers. `/opsx:verify` reruns the same contract only when you deliberately want another review:

| Layer | What it checks |
|-------|----------------|
| **Adversarial semantic review** | Applicable current/evergreen obligations, production composition and behavior, runtime-boundary/lifecycle/interleaving completeness, honest proof roles, required witnesses, and deferred scope |
| **Deterministic acceptance** | CUE evaluation, strict current and future-merged OpenSpec validation, every declared project check and applicable attached test/runtime session, assertions, selector-bound nonzero test evidence, and supervised teardown |

```
You: /opsx:apply

AI:  Verifying add-dark-mode...

     Semantic review: pass
     Deferred preference migration: not applicable to this slice
     Deterministic gates: pass (2/2 validations executed)
     Execution acceptance passed — ready for your review
```

Applicable contradictions and required proof gaps—including an unavailable physical/native capability—keep execute/apply incomplete; deferred roadmap absence does not. Every blocker must cite authority, applicability, production evidence, a falsifiable contradiction or exact proof gap, the exact controlled proof command and production-seam witness, and the observed result. A success marker without bounded exit/cleanup is not completion, and keyword suspicion alone is not a violation. See [Acceptance Gates](acceptance.md) for the full contract.

`/opsx:verify` is an optional expanded-profile command for a fresh review after execute/apply. If you don't have it, the normal end-of-apply acceptance still runs.

## Right-size the review

Not every change earns the full pass. A one-file typo fix deserves a twenty-second skim. A change that touches auth, payments, or data you can't recover deserves every question above. The point was never ceremony — it's spending your attention where a mistake would be expensive, and skimming where it wouldn't.

## The two-minute checklist

- [ ] The proposal's intent matches what I asked for.
- [ ] Nothing extra has crept into the scope.
- [ ] Every requirement is specific enough to test.
- [ ] Every requirement has a scenario that actually exercises it.
- [ ] The case I care about most is covered.
- [ ] Tasks map to requirements; nothing is mysterious or out of scope.
- [ ] I'd be comfortable if the AI built exactly this and nothing more.

If all seven pass, run `/opsx:apply` with confidence. If any fail, that's not a setback — it's the two minutes doing its job.

## Where to go next

- [Writing Good Specs](writing-specs.md) — the flip side: how to draft requirements and scenarios worth approving.
- [Editing & Iterating on a Change](editing-changes.md) — the mechanics of changing a plan after you've started.
- [Workflows](workflows.md) — where review fits in the larger loop.
