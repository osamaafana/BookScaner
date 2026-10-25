# BookScanner — project memory for the coding agent

## What this is
- Web app: photograph a bookshelf, read every spine with a vision model, match books (Open Library / Google
  Books), rank them against the reader's taste. Users: readers on phones at a shelf. Site: https://book-scanner.net
- Stack: FastAPI + Postgres (Neon) + Redis (Upstash) backend; Express gateway; React 19 + Vite + Tailwind 3 PWA.
  Docker on a Hetzner server behind Nginx Proxy Manager.

## Working directory
- Mac: `~/Documents/Projects/BookScaner` (GitHub `osamaafana/BookScaner`). Server copy: `/opt/projects/BookScaner`
  on `91.98.136.8` (no git there; deploy by rsync, see RUNBOOK.md).

## Source-of-truth precedence
1. Live system (server containers, the site) 2. CHANGELOG.md [Unreleased] 3. todo.md 4. current handoff in
`docs/handoffs/` 5. docs/CODEMAP.md 6. PRODUCT.md / DESIGN.md 7. README.

## Hard invariants
- No nginx container: routing and TLS belong to Nginx Proxy Manager; services only `expose` ports on `proxy_network`.
- Keep container names `bookscaner-backend`, `bookscaner-web-ui`, `bookscaner-web-gateway` (NPM routes use them).
- UI colors come from tokens in `globals.css`; no raw Tailwind palette colors, no gradient text (`DESIGN.md`).
  Check: `node <impeccable>/scripts/detect.mjs frontend/web-ui/src` finds 0 issues.
- `.env` is never committed or copied into the repo.

## Tools
- Web UI: `cd frontend/web-ui && npm run dev` (5173), `npx tsc -b`, `npm run build`, `npx eslint .`
- Gateway: `cd frontend/web-gateway && npm run dev`. Backend: `cd backend && uvicorn app.main:app --reload`.
- Design work uses the `impeccable` skill with `PRODUCT.md` and `DESIGN.md`.

## What NOT to do
- Don't change the server without the operator's go (deploy is an explicit step).
- Don't push or merge without the operator's go.

## Pickup procedure
1. Read this file 2. read `docs/handoffs/NEXT-SESSION-PROMPT.md` and the handoff it names 3. todo.md OPEN block
4. newest CHANGELOG headings 5. CODEMAP for the area 6. verify live state (branch, `git status`, site) before acting
7. report ready in at most 6 lines and wait.
