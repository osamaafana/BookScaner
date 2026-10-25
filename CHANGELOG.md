# Changelog

Newest first. Label = date + letter. Verification stamp on each entry.

## [Unreleased]

### 2026-10-25c — feat(web-ui): calm, bookish redesign (impeccable pass)
- Commit `c58f583` on branch `sync-server-2026-10-25`. Not deployed.
- New design tokens in `frontend/web-ui/src/styles/globals.css` (bottle-green accent, light + dark), system font,
  serif book titles; see `DESIGN.md`. Product brief in `PRODUCT.md`.
- Every page restyled; same features and API calls. Removed gradients, glow, decorative animation and fake stats.
- Bugs fixed: Settings "Import backup" did nothing; theme could reset on reload; Settings showed Google as the
  scanner when nothing was chosen (backend default is Groq); empty recommendations shown as a red error; History
  had a delete button with no action; toasts were always white and covered the bottom bar.
- Stamp: code-verified (tsc + vite build pass; eslint 20 errors / 2 warnings, all pre-existing in contexts/lib)
  + browser-walked with a faked `/scan` reply (phone 390px and desktop 1440px, light and dark). Real scan with
  the backend NOT run.

### 2026-10-25b — chore(deploy): drop nginx, root docker-compose on proxy_network
- Commit `62d997d`. `docker-compose.yml` now at repo root; backend leaves `network_mode: host`, joins
  `proxy_network`, reached as `bookscaner-backend:8000`. Removed `deployment/nginx/`, `deployment/vercel.json`.
- Container names unchanged, so Nginx Proxy Manager routes keep working. Stamp: built-NOT-verified (not deployed).

### 2026-10-25a — chore(sync): bring newer server files into git
- Commit `404c6d5`. Took 8 files newer on the server (`/opt/projects/BookScaner`) than GitHub: same-origin
  gateway URL, CORS domains, NPM compose, node 20 build, PWA icons, footer, `.env.*` ignore. Backend kept at the
  GitHub version (the 2025-11-02 cleanup is newer than the server copy). Mac's old uncommitted edits in `git stash`.
