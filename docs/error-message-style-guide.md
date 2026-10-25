# Error-message style guide — bookscanner

The spine of every message: **what happened → why (only when it helps) → what to do next.** Second person,
contractions, no blame, no jargon, no raw codes/statuses, no exclamation marks. Ownership language: "we / our end"
owns platform faults ("not your fault"); "That file / That number" points at the input without blaming the person.
Every hard wall carries an exit: a retry, an exact navigation breadcrumb ("Settings → Billing"), an upgrade path, or a
human email. Reassure about data safety when relevant ("Nothing was lost."). If the product is multilingual, every
message ships all locales in the same PR.

Supported locales: {{locales, e.g. en, ar (RTL), fr}} · source locale: {{source_locale}} · support address:
{{support_email}} · voice owner: designer · last reviewed: {{DATE}}

## Mechanics

- Server returns short stable machine codes; UI maps code → localized copy with a fallback array:
  `t([`feature.errors.${code}`, 'common.error'])`.
- Per-REASON validation keys beat one generic message: "Remove the leading 0 and add the country code (e.g. +44 7700
  900123, not 07700 900123)" fixes the input; "Invalid phone number" doesn't. Show the right AND wrong example inline
  for format errors.
- Rate-limit copy names the scope and the wait: "Too many requests from this network in the last hour. Try again later
  or email <your privacy address>."
- Permission failures name the required role: "Couldn't {{do X}} — you need owner or admin access."
- Health/monitoring error states must never read as good news: "Couldn't load platform health — this does NOT mean the
  platform is healthy. Retry."
- Self-healing "errors" say so: "We already have an open request from this email — we've re-sent the verification
  link."
- **Do not build load-bearing error copy on dynamic i18n keys** (`t(\`errors.${kind}.title\`)`) — template-literal keys
  evade inline-default CI gates and the copy silently ships untranslated. Materialize every kind's keys statically.
- Each new server code is a row in the status-code contract table (code · HTTP status · meaning · copy
  key · which clients react how) before its copy is written; the copy key name matches the code.

## Calibrated examples (verbatim, from production)

What happened + the limit + the fix:
> "That file is too large (4 MB max). Split it into smaller files and import each."

Concrete example inline:
> "We couldn't read any columns. Make sure the file has a header row (e.g. name, phone, email)."

Explains WHY the requirement exists:
> "Add a column the agent can reach people by - a phone or email column is required."

Per-reason validation with right/wrong examples:
> "Remove the leading 0 and add the country code (e.g. +44 7700 900123, not 07700 900123)."
> "That number looks too short. Include the country code (e.g. +15551234567)."

Limit + both exits:
> "You're at your plan's channel limit. Disconnect your current channel, or upgrade to connect more."

429 with cause + wait:
> "You're creating workspaces too quickly — wait a few minutes and try again."

Policy block without accusation:
> "Please sign up with a permanent email — temporary/disposable addresses aren't supported."

Reason-code keyed quota copy with the exact breadcrumb:
> "You're out of credits. Add more on Settings → Billing to keep testing — it only takes a moment."
> "Your free trial has ended. Pick a plan on Settings → Billing to keep your agents replying."

Platform fault, owned:
> "We hit a snag on our end — not your fault. Give it another try in a moment."

Offline, with reassurance:
> "We lost the connection. Check your internet and give it another try in a moment. Nothing was lost."

Escape hatch on a hard wall:
> "Too many requests from this network in the last hour. Try again later or email <your privacy address>."

## Empty-state copy (the error guide's sibling)

Outcome-led, tells the user what WILL happen, one concrete CTA gated on the real prerequisite:
> "No captured leads yet. You're all set. Run a click-to-WhatsApp ad and every person who messages you lands here
> automatically — with how fast your agent answered them."

## bookscanner additions

| Code | Kind | Copy key | {{source_locale}} text | Exit offered | Added (date · task) |
|---|---|---|---|---|---|
| {{code}} | {{offline / quota / permission / upload / generic}} | {{feature.errors.code}} | {{text}} | {{retry / breadcrumb / upgrade / email}} | {{date · T<id>}} |
