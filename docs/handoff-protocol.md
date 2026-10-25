# Handoff & documentation protocol — zero-context-rot sessions

One-line summary: a fixed set of living documents, each with a defined update moment, lets any fresh session continue prior work without hallucination — because every claim carries evidence, staleness is marked instead of trusted, and exactly one document is "current" at a time.

This is the load-bearing system. Install it at repo-scaffold time and maintain it every
session thereafter. Every other practice in this skill degrades gracefully; this one
does not — skip it and the third session starts inventing facts.

## Goals and exit criteria (Stage: Repo + docs scaffold)

- [ ] The document set below exists (run the scaffold script or create by hand); the project memory file carries the precedence list, the pickup procedure, the doc-touch matrix, and the invariants seed.
- [ ] The repo is initialized (main + staging branches; `.gitignore` covers the env-file family; `.env.example` per the template).
- [ ] This protocol file is copied into the project (`docs/handoff-protocol.md`) so sessions without the skill loaded can still follow it.
- [ ] Verified with fresh eyes: a subagent given only the repo can state the pickup procedure, the precedence list, and where every document lives.

## The document set

| File | Role | Update moment |
|---|---|---|
| Project memory file (`CLAUDE.md` or the harness's auto-loaded equivalent) | Hard invariants, key locations, tools, source-of-truth precedence, pickup procedure, and a rolling dated "Last reviewed" log | Append one dense dated paragraph per significant session; refresh invariants the session they change |
| `CHANGELOG.md` `[Unreleased]` | The working manifest — one dated bullet block per PR/merge, with evidence, newest at TOP | Same session as the merge, no exceptions; everything else is swept from it |
| `todo.md` | Parked items + rolling `> Status (date …)` blockquote log at top | Session close, and whenever an item opens/closes/parks |
| `plan.md` | Ordered roadmap with inline status stamps in the headings | The same PR as any scope change; when an epic ships |
| `apps/<surface>/CONTEXT.md` | Per-surface map: what this surface IS, its contracts, its local invariants | Prepend a dated blockquote on major change; refresh the body on major refactors |
| `docs/handoffs/YYYY-MM-DD-handoff.md` | Session handoff — the full state transfer | Session close (mandatory; no session ends without one) |
| `docs/handoffs/NEXT-SESSION-PROMPT.md` | Paste-in starter for the next session | Rewritten (not appended) at EVERY session close — it is on the sweep checklist by name |
| `docs/adr/NNN-title.md` | Architecture decisions: context + consequences + alternatives | When a structural decision is made; append dated Update sections when reality changes |
| `RUNBOOK.md` | Operational procedures: triage, alert reference, escape hatches, rotation checklists | The same session an operational lesson is learned |
| `docs/CODEMAP.md` | Where things live: modules, entry points, request-to-database flow | Written in codebase research; updated in the SAME change as any structural change (module added, moved or removed) |
| `docs/solutions/<area>/<name>.md` | One note per hard problem solved: Problem, Symptoms, What didn't work, Root cause, Fix PR #, Prevention test | Session end, when a hard problem was solved; the same problem later updates the old note instead of adding a new one |
| `GLOSSARY.md` | Product words, one line each, no implementation detail | The same change that settles or renames a term |
| `todo.md` `## AWAITING OPERATOR` | The operator-pending ledger: every ask waiting on the operator, as `AO-<n>` items (§Operator-pending ledger) | Whenever a human-gated ask opens or lands |
| `docs/archive/` | Overflow for history (changelog archive, retired plans, superseded handoffs) | When a living file nears the ~200KB tool read-size cap, or a plan is fully shipped |
| `PRD.md` / `TRD.md` | Product + technical requirements | At their stages; dated Update appendices after |

Templates for all of these live in the make-it-done skill's `assets/` directory. (If you
are reading this file INSIDE a scaffolded project — it is copied to
`docs/handoff-protocol.md` — the templates were already instantiated as the live files
beside it; the normative handoff shape is §"Handoff internal structure" below, no
template file needed.) Doc-role clarity rule: the README carries a table mapping each
document to its ONE role ("CHANGELOG = ground truth for what is done") so no two docs
compete for the same job.

## Source-of-truth precedence (resolve conflicts mechanically)

When two sources disagree, trust the one higher up — and record the correction:

1. **The live system** (production DB, deployed service versions, the real UI) — query it, never assume it
2. `CHANGELOG.md [Unreleased]`
3. `todo.md`
4. Per-surface `CONTEXT.md` and `docs/CODEMAP.md`
5. `plan.md`
6. README / design docs / everything else
7. Archived docs — historical only, never current-state

Why this order: docs decay top-down by update frequency. A precedence list turns "the
docs contradict each other" from a hallucination risk into a lookup. The documented
failure mode it prevents: trusting plan/handoff prose for "what is done".

## Session start ritual (the pickup procedure)

Copy into the new project's memory file verbatim, adapted to its names:

1. Read the project memory file (auto-loaded or first).
2. Read the single current handoff in `docs/handoffs/` (NEXT-SESSION-PROMPT points at it), including its
   "Dead ends tried" and "Suggested skills"; call the Skill tool for each suggested skill when its step comes.
3. Grep `docs/solutions/` and the RUNBOOK for the area you will touch (prior problems).
4. Read the OPEN TODOS block at the top of `todo.md`.
5. Read `CHANGELOG.md [Unreleased]` — what just shipped (newest headings only).
6. Read the `CONTEXT.md` (and `docs/CODEMAP.md` section) for whichever surface you are about to touch.
7. Check whether operator-pending credentials/decisions have landed (cheap env-file NAME check).
8. **Verify against the live system before assuming any state** — run the actual query,
   list the actual deployed versions, open the actual page. Docs describe what was true
   when written; the live system is what is true now.
9. If no task was given yet, report "ready" in a few short lines (what is true, what changed, next step) and
   wait. If the first message already gives the task, start it after step 8.

Touch nothing before step 8. After an auto-compaction mid-task, re-run steps 1–2 and re-read the task's plan
before the next edit.

**Light ritual** (the commands quick, debug, handoff and check, and a session whose first message is a small
task): steps 2, 4, 6 and 8 only — the handoff, the todo open block, the touched area's CONTEXT/CODEMAP, and live
state for what you touch.

## Session end ritual (mandatory — the sweep)

The sweep is its own atomic commit (`chore(handoff): …`) that names EVERY file — files
no checklist names are exactly the ones that go stale:

1. Verify every merge this session has its `CHANGELOG.md [Unreleased]` bullet.
2. Close/park/open `todo.md` items in place with status stamps + evidence; prepend the
   session's `> Status` line at the top.
3. Prepend a dated blockquote to any `CONTEXT.md` whose surface materially changed.
4. Update `plan.md` status stamps for anything that shipped or re-scoped.
5. Write `docs/handoffs/YYYY-MM-DD-handoff.md` following §"Handoff internal structure"
   below (the skill's `assets/handoff-template.md` is the same shape with guidance
   comments; the previous handoff also works as the structural reference).
6. **Single-current-handoff rule**: delete (or archive) the superseded mainline handoff
   in the SAME commit, and update every "single current handoff" pointer. History lives
   in git, not on disk. Same-day sessions: the newest supersedes and lists earlier ones
   in a one-line "Prior sessions (same day, superseded)" trailer.
7. **Rewrite `NEXT-SESSION-PROMPT.md`** (by name on this checklist — it is the file the
   source repo's protocol forgot twice).
8. **Memory-file check.** Compare the project memory file (`CLAUDE.md`) with what this session
   learned (new invariant, key location, command, trap). Propose the change as a diff in chat;
   apply it only after the operator's yes. The dated "Last reviewed" paragraph goes in the same
   approved edit.
9. If the project keeps editor-rules mirrors (create them only if the team's editors
   use them; otherwise skip this step), update them on any invariant change — they are
   on this list because unswept rules files accumulate stale credentials and dead lists.
10. **Solution note.** If this session solved a hard problem (root cause found after real
    digging, or a fix that took more than one try), write `docs/solutions/<area>/<name>.md`
    (template: `assets/solution-note-template.md`). Grep first: the same problem updates
    the existing note instead of adding a second one.
11. **Code map.** If the structure changed (module added, moved or removed; new entry point;
    changed request-to-database flow), `docs/CODEMAP.md` was updated in that same change —
    check it, fix it now if not. A settled or renamed product term is in `GLOSSARY.md`.
12. Remove this session's merged worktrees and branches, delete scratch files, and list in the
    handoff anything still kept and why.

If a session must end abnormally, do steps 5–7 FIRST with whatever is known — a partial
honest handoff beats a complete stale one.

**Bootstrap sessions** (before the scaffold/repo exists — ideally only the first): the
start ritual's steps that read missing documents skip vacuously; "verify live state"
means verifying tool/credential availability; the sweep degrades to its non-negotiable
core — write the handoff and NEXT-SESSION-PROMPT (creating `docs/handoffs/` if needed)
and record decisions — and becomes an atomic commit once git exists. Running the docs
scaffold at Stage 0 (see SKILL.md) makes the bootstrap window one session long.

## Context rotation (at about 85% context)

- At about **85%** context use, and only at a step boundary, the session rotates: it runs the §Session
  end ritual (handoff in `docs/handoffs/YYYY-MM-DD-handoff.md`, rewritten `NEXT-SESSION-PROMPT.md`), prints
  the full next-session prompt in chat in one code block (§Handoff command step 6) and
  `handoff ready: <absolute path>`, and stops.
- **Finish the current step first.** A session that notices 85% mid-step finishes that step, then rotates. If it
  was compacted before that, it re-reads (§Session start ritual, last paragraph), finishes, then rotates.
- The operator starts a NEW session in the same working folder and pastes that prompt
  (or the one line `Read <absolute path>/docs/handoffs/NEXT-SESSION-PROMPT.md and follow it`). The new session
  runs the start ritual, replies "Ready" with the filled summary and waits.
- A finished task is not rotated: it ends with the normal sweep. Rotation exists so no session works on a
  nearly full context, where it starts forgetting the plan.

## Handoff command (on request, with an optional next focus)

A session runs a handoff when the operator types `/make-it-done handoff`, "hand off", or a sentence such as
"update all mds and documentation, do a proper handoff and give me a prompt for the new session" (optionally
followed by the next focus), and at rotation. One request always does three things, in this order: update all
docs (step 0), write the handoff (the §Session end ritual plus steps 1-5), and print the full next-session prompt
in chat (step 6).

0. **Update all docs first.** Check every living doc against what this session did and update it now:
   CHANGELOG, todo.md, CONTEXT.md files, `docs/CODEMAP.md`, `GLOSSARY.md`, RUNBOOK, ADRs (dated Update
   sections), `docs/solutions/`, README, plan.md, TRD.md, and any other `.md` the work touched. The project
   memory file (CLAUDE.md) is the one exception: show the proposed change as a diff and apply it only after the
   operator's yes. The chat answer lists every doc checked as `updated: <what>` or `no change needed: <why>`.

1. **Focus.** The next focus is the text after the command, else "continue the ranked Next builds". Write it
   as the handoff's `Next session focus` line (top of the file) and tailor to it: "Next builds" leads with
   it; "Live state", "Durable facts" and "Suggested skills" put what the focus needs first; facts unrelated to
   the focus shrink to one-line links (never drop an open id, an operator-pending item or an owned worktree —
   the next session inherits ALL state, not just the focus). The starter prompt repeats the focus in one line.
2. **Link, don't copy.** Anything already in a spec, plan, TRD, ADR, todo id, CHANGELOG entry, issue, PR,
   commit or diff is referenced by path, URL, id or sha — never pasted. The handoff carries only state no
   other artifact holds.
3. **Suggested skills.** A `## Suggested skills` section names each skill the next agent should call with the
   Skill tool, and at which step (e.g. `make-it-done` for the pipeline, a review skill before the check,
   `impeccable` for visual work); "none needed" is a valid answer.
4. **Redact before saving.** A handoff is read by every future session and lands in git. Never write:
   - API keys, tokens, webhook/signing secrets, private keys, session cookies, one-time codes;
   - passwords, including test-account passwords (point at the seed or example-config file instead);
   - connection strings or URLs with credentials in them (`scheme://user:pass@host`) — name the env var;
   - personal data of customers or end users: names, emails, phone numbers, addresses, payment details,
     message content;
   - internal ids of private persons (user/account/customer ids, device ids) — describe the case
     ("a no-plan test account") or point at the ticket.
   Secret NAMES, env-var NAMES and store paths are fine. Last step before saving, grep the file and resolve
   every hit (a name stays; a value is removed and replaced by where it lives):
   `grep -nEi 'api.?key|secret|token|passw|bearer|authorization|BEGIN [A-Z ]*PRIVATE|://[^/ ]+:[^@ ]+@|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\+[0-9][0-9 ()-]{7,}[0-9]' <handoff>`
   (local phone numbers without `+` and person ids are not caught — check those by eye).
   Then fill the template's closing redaction line. A value already pasted into a committed file is a leak to
   report to the operator (rotation is the operator's), not something to silently edit away.
5. **Never only a temp folder.** The handoff is written to `docs/handoffs/` in the project. A draft in the OS
   temp folder is not a handoff: temp folders are wiped on restart, and pointers in docs never target temp
   paths.

6. **Full next-session prompt, in chat.** Rewrite `docs/handoffs/NEXT-SESSION-PROMPT.md` from
   [assets/next-session-prompt-template.md](../assets/next-session-prompt-template.md) and print the SAME text in
   the chat inside one code block, ready to paste. It names, in reading order, every file the next session needs
   (the handoff first, then todo's open block, CHANGELOG headings, the CONTEXT/CODEMAP of the focus area, the
   plans/TRDs/ADRs the open work points at), the live-state checks to run, and the skills to load. Unless the
   operator asked for autonomous work, it ends by telling the new session to do NO work: reply with the filled
   "Ready" summary from the template and wait for the operator's next instruction.

The reply ends with: the doc list from step 0, the absolute path of the handoff file, the CLAUDE.md diff waiting
for a yes (if any), and the step 6 prompt in its code block.

## Handoff internal structure (fixed section order)

1. `# Handoff — YYYY-MM-DD — <headline: what shipped>`
2. `**Next session focus:**` — the argument after `/handoff`, else "continue Next builds".
3. Reading-order header: "**This is the single current-state handoff.** A fresh session
   reads: <memory file> → this file → todo.md OPEN TODOS → CHANGELOG [Unreleased].
   Verify live state via <exact tool> before assuming anything."
4. `## Live state` — `main == stage == <sha>` (+ the command that re-proves it),
   environment lock-step, migrations-or-not, deployed versions, PR range, open PRs.
5. `## What shipped` — per item: PR#, migration id, service version, root cause → fix,
   and its verification stamp.
6. `## Open (todo ids only)` — ids with one line each; detail lives in todo.md.
7. `## Deferred, with rationale (NOT chased — genuinely gated)` — every deferral names
   the concrete blocker AND the concrete build plan when unblocked.
8. `## Dead ends tried (what did not work, why)` — each approach that failed, the evidence, and
   the condition under which it would be worth retrying.
9. `## Durable operational facts / traps learned (new this session)` — transferable lessons, not narrative.
10. `## Operator-pending (do NOT chase)` — ledger ids only, kept OUT of the work queue.
11. `## Next builds` — the ranked queue.
12. `## How to work here (mechanics unchanged)` — PR/merge/deploy/test mechanics restated.
13. `## Owned worktrees, branches, files` — path · state · kept because / delete after.
14. `## Suggested skills` — which skills the next agent calls with the Skill tool, and when.
15. Optional trailer: prior same-day sessions superseded.
16. Closing line: the redaction grep, its time and its result.

Auxiliary documents (branch-scoped build handoffs, verification-only gap analyses) are
named with a suffix (`YYYY-MM-DD-<track>-handoff.md`, `-gap-analysis.md`) and NEVER
carry the "single current-state" header — only the mainline file does. A
verification-only session ("no code shipped; here is the verified gap map, with stale
doc claims corrected") is a first-class handoff genre, not a wasted session.

## What makes a handoff hallucination-proof

Each rule earned by a real failure:

- **Evidence with every claim.** Deployed versions, migration ids, real test counts ("1154 passed"), PR
  numbers, short SHAs. "Done (v9 deployed, smoke-verified)" is checkable in seconds; a bare "done" is not.
  A test run with no "N passed" line is not a result.
- **Verification status stamped per item**: live-verified / staging-verified / code-verified (read in code
  at a named sha, not seen running) / tests-only / built-NOT-verified / doc-only
  ([thinking-discipline.md](thinking-discipline.md) Part F). "[unverified]" marks a claim not checked: never stated
  as fact, it goes to open questions. Never let the reader assume the strongest. Track live-proof debt
  explicitly — "shipped-but-never-proven" items have repeatedly turned out broken in the wild. Merged is not
  deployed: stamp a deploy only after the run conclusion + deployed version are read.
- **Corrections are recorded, never silently edited.** A dated `CORRECTION (…; trust this note over the
  stale text below)` banner outranks stale text; closed items keep their original context beneath the
  verdict stamp. The audit trail of what was believed when is the value.
- **Staleness self-markers.** Counts/versions in long-lived docs carry their verification date +
  "re-verify against live state before relying on this".
- **Stable ids** (`TODO-<PREFIX><n>`, `YYYY-MM-DD<letter>`, E5.6, U3) so cross-references survive
  rewording. Grep todo, CHANGELOG, `docs/archive/` and open docs PRs before minting one; cite CHANGELOG
  entries by their text, not only the label (labels have collided).
- **"Verified facts (don't re-research)" sections** cache expensive research conclusions by name, so future
  sessions don't re-burn effort re-verifying stable facts. Distinguish *state* (changes every session →
  handoff) from *facts* (stable until falsified → CLAUDE.md, CONTEXT.md or a solution note).
- **Dense, factual, path-cited tone.** Exact paths, exact commands, exact names. Every rolling status line
  ends with a pointer to the full handoff (log → handoff, one direction only).
- **No copied prose.** The handoff links CHANGELOG entries, todo ids, RUNBOOK sections and TRDs; a copy
  goes stale the day its home changes.

## Rolling-log mechanics (todo.md / plan.md / CONTEXT.md / memory file)

- New state is PREPENDED as a dated blockquote at the top; older entries stay below as
  explicit historical snapshots. Never delete old stamps.
- **Use stacked SEPARATE dated blockquotes, not one ever-growing paragraph with "Prior —"
  demotions** — the single-paragraph variant degenerated into a 7,000-word line in the
  source repo. Each newer blockquote explicitly demotes what below it is stale.
- The memory file's "Last reviewed" log is append-only newest-LAST (it auto-loads whole);
  give it the same archive rule as the changelog: when it dominates the file, move the
  oldest entries to `docs/archive/` and keep the most recent N inline.
- Archive trigger for any living file: approaching ~200KB (tool read caps). Move oldest
  entries to `docs/archive/<file>-archive.md` (same format), leave a pointer line.
- When a plan fully ships: stamp it COMPLETE at top, archive it with a banner saying
  exactly what is stale and where ground truth now lives, and write the next plan as a
  new file. An archived plan without a staleness banner is a trap.

## Track-scoped live trackers

A long-running autonomous workstream (a mobile app track, a migration) gets its own
live tracker file beside its plan — sections: Current (with a CORRECTION-banner slot at
the very top) / Done (newest-first, one dated entry per merged slice) / Next
(prioritized to the north star) / Blockers / **Verified facts (don't re-research)**.
It declares itself the first read for that track. The mainline handoff points at it
rather than duplicating it.

## Operator-pending ledger (don't-chase discipline)

This section is the ONE definition; every other file links here. Anything requiring the human's
signature, payment, identity, credentials, sign-off, activation or judgment is an operator-pending item:

- **The ledger is one block at the top of `todo.md`: `## AWAITING OPERATOR`**, one per project. Each item has:
  id (`AO-<n>`) · severity ([HARD] block · [OPT] optional accelerator) · why · the exact ask (what to give or
  decide; a decision keeps its options and evidence, recommended option first) · ≈ minutes of the operator's
  effort · the test run when it lands · what it unlocks · when it was asked (once). A landed item is stamped in
  place (`DONE <date>: <evidence>`) and moved to the archive at the sweep.
- **Handoffs** list pending `AO-` ids under `## Operator-pending (do NOT chase)`; they cite the ids and never
  restate the items.
- **Don't chase:** sessions never list these as their own remaining work, never chase them, check at session
  start whether they landed (start ritual step 7), and interrupt the human ONLY for [HARD] blocks — [OPT] asks
  surface in status updates, never as stop-the-world questions.
- **OPERATOR ACTIVATIONS:** code-complete-awaiting-human items live under that heading with exact 30-second
  steps — each is ONE short command that runs a self-contained script (shows current → new, asks "yes", one
  guarded transaction, prints after) or a paste-ready message file ([safety.md](safety.md)).
- **Live-proof debt:** built-but-not-live-proven items waiting on a ledger item keep the same visibility.
- A ledger nobody updates goes stale while the real queue moves into handoffs — refresh its "Last updated" at
  every session end.

## Enforcement honesty

This protocol is enforced by convention, not CI. The observed failure classes are (a) files no sweep
checklist names, (b) rules-file mirrors nobody updates, (c) handoffs that live only in a temp folder or an
uncommitted worktree, (d) starter prompts stacked instead of rewritten, (e) living files grown far past the
read cap — which is why the sweep checklist above names every file explicitly. If the harness supports
hooks, a session-end hook that checks for a same-day handoff file is a cheap backstop; it narrows mistakes and
replaces neither this protocol nor branch protection.
