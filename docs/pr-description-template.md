## What and why
{{One or two plain sentences: what changes for whom, and why.}} Ticket: {{KEY-123 link, or "none"}}.

## How it was tested
```
{{the exact command, runnable from the repo root}}
{{its summary line, e.g. "1,204 passed, 3 skipped in 81.2s"}}
```
- Quality lines: lint {{ok}} · types {{ok}} · build {{ok}} · {{other CI run: lines}}
- Failure-path test: `{{test id}}`. Bug fix: `{{test id}}` fails on the base, passes here.
- Red on base too (not caused by this change): {{names, or "none"}}

## Evidence
{{live-verified | staging-verified | code-verified | tests-only | built-NOT-verified | doc-only}}: {{what was observed,
where, when}}. After deploy, check: `{{the probe: curl, query or click path}}`.

## Rollback
{{How to undo: revert this PR / flag off / the migration's downgrade / the undo file.}}
Data written by it: {{none, or how it is restored}}.

## Risks
- {{What could break, and the test or check that watches it.}}

Hotfix only. Port-back twin: {{branches that need the same logic, and how}}.
