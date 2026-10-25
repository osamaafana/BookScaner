---
module: {{area or module, e.g. auth}}
component: {{file, service or screen, e.g. api/auth/tokens.py}}
problem_type: {{bug | performance | data | deploy | integration | config}}
symptoms: ["{{what people saw, in their words}}", "{{error text, redacted}}"]
root_cause: {{one line}}
severity: {{low | medium | high | critical}}
date: {{YYYY-MM-DD}}
---

# {{Short name of the problem}}

Save as `docs/solutions/<area>/<short-name>.md`. The same problem again: update this note, never add a second one.
Grep before planning: `grep -rliE "<area>|<symptom>" docs/solutions/`.

## Problem
{{One or two plain sentences: what was wrong, for whom, since when.}}

## Symptoms
- {{What was seen: error text (redacted), wrong output, timing, which environment.}}
- {{How it was reproduced: the feedback-loop command.}}

## What didn't work
- {{Attempt 1: what it changed, why it failed.}}
- {{Attempt 2.}}

## Root cause
{{The hypothesis that proved right, with the evidence (file:line, measurement).}}

## Fix
{{What changed, in plain words.}} PR #{{number}}.

## Prevention
- Test: `{{test id}}` (`{{command}}`), fails on the base before the fix.
- {{Lint, grep-lint or check that stops it coming back, or "none: <why>".}}
