# ADR {{NNNN}}: {{Decision title — the choice, not the topic}}

<!-- Write this ADR only if ALL THREE hold; otherwise it is a line in the TRD or the plan's locked decisions:
     1. Hard to undo (data shape, public API, vendor lock-in, money flow).
     2. Surprising to a reader without context (they would ask "why on earth…?").
     3. A real trade-off: at least two workable options, each with a real cost. -->

**Date**: {{DATE}}
**Status**: {{Proposed | Accepted | Superseded by ADR-NNNN}}
**Reviewer**: {{the independent checker}}
**Decided by**: {{operator, in their words | delegated — by whom, date}}
**Number**: grep `docs/adr/` right before taking the next number (parallel sessions collide)

---

## Context

{{What forces this decision: the product surfaces involved, the constraint that
makes the default answer wrong, what the system must do. 2–6 sentences, concrete.}}

## Decision

{{The decision in one bold sentence, then the shape of it. Include the explicit
negative ("Do not use X") when the rejected option is the industry default.}}

## Consequences

**Positive:**

- {{what this buys, concretely}}

**Negative:**

- {{the real costs accepted, and the trigger that would force a revisit}}

**Neutral:**

- {{migration paths kept open}}

**Invariants this creates** (each also in the project memory file): {{rule — enforced by <lint/test/registry> , or "none"}}

## Alternatives Considered

**{{Alternative A}}**: {{what it offers}}. Rejected because {{the reason tied to
THIS product's constraints, not a generic con}}.

---

<!--
When reality changes, APPEND an Update section — never rewrite the original decision.
The history of why is the value. The PR that invalidates a claim here appends the
Update in that same PR; the operator does not accept the PR without it.
-->
## Update ({{date}}, {{trigger}}, {{PR / sha}}, by {{session or person}})

{{What changed, whether the core decision still holds, and what was layered on top.}}
