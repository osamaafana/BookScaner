# .env.example pattern — bookscanner

Three committed files, one gitignored family. Names only — never values.

## 1. `.env.example` (committed — the full key surface, documented)

```bash
# ── Required (fail-closed: the app refuses to boot/build without these) ─────────
# Public runtime config. The build guard parses the REQUIRED list from the config
# module — keep that module authoritative, this file illustrative.
VITE_API_URL=            # e.g. https://<project>.example.co
VITE_API_PUBLIC_KEY=     # the publishable/anon key (public by design)

# ── Recommended (warn-only: missing = silent feature degradation, not an outage) ─
VITE_ANALYTICS_KEY=      # analytics off without it
SENTRY_DSN=              # error reporting off without it

# ── Feature flags (default OFF; absent = off; the operator arms per environment) ─
{{FEATURE}}_ENABLED=     # <what it turns on>; off in prod until <condition>; parity ledger row: <env: on/off>

# ── Operator credentials (local CLI use only; NEVER shipped to any runtime) ─────
PLATFORM_ACCESS_TOKEN=   # management-API token: deploys, migration parity, secrets push
GITHUB_TOKEN=            # PR automation PAT
PROVIDER_X_API_KEY=      # <which features it powers; which runtime store it must ALSO be pushed to>
```

Rules:
- Every key gets a comment: what it powers, where to get it, which runtime store(s) it must be pushed to (edge functions vs worker vs CI — a key in only one store silently no-ops the feature).
- Group by the REQUIRED / RECOMMENDED / operator-local taxonomy — the blast radius of each missing key is explicit.
- If runtimes use different NAMES for the same credential (e.g. `ELEVEN_API_KEY` on the worker vs `ELEVENLABS_API_KEY` on functions), document the dialect here and at the push site.
- When values live in a cloud secret manager, the env var holds the secret's NAME (`{{NAME}}_SECRET_NAME=<product>/<env>/<name>`), one per environment; never point a lower environment at a store production reads.

## 2. `.env.test` (committed — secret-free placeholders for CI)

```bash
# Test-only env (mode=test). Committed — NO secrets, just localhost placeholders —
# so CI (which has no gitignored .env.local) satisfies the config loader's
# fail-closed check for eager imports. Loaded only in test mode; builds unaffected.
VITE_API_URL=http://localhost:54321
VITE_API_PUBLIC_KEY=test-anon-key
```

The local CI-equivalent runner uses these placeholders (or generates throwaway dummies at run time, e.g. a random signing key) and runs with the real `.env` moved aside — a loader with override semantics would otherwise point tests at a real database.

## 3. `.gitignore` entries

```
.env
.env.local
.env.*.local
.env.local.*
.env*.bak*
```

## Loading locally (POSIX shell, CRLF-safe)

```bash
set -a && source <(grep -aE '^[A-Z_]+=' .env.local | sed 's/\r$//') && set +a
```
(The grep filter matters: one malformed non-KEY=VAL line breaks naive sourcing.)

Agents never `cat`, `grep` or echo an env file. When a script needs values, it loads them through a library (e.g. `python-dotenv`, `dotenv`) and prints key NAMES only:

```python
from dotenv import dotenv_values
print(sorted(dotenv_values(".env").keys()))   # names only, never values
```

## 4. Store map (runbook section)

| Name | Required? | Stores it must reach (per env) | Push command | Consumers to redeploy on rotation | Verify |
|---|---|---|---|---|---|
| `{{NAME}}` | required / recommended / operator-local | {{store-a}}, {{store-b}} | `{{push command}}` (prints names only) | {{services}} | {{probe}} |
