# Changelog

Newest first. Label = date + letter. Verification stamp on each entry.

## [Unreleased]

### 2026-10-26d — deploy: new BookScanner live on the server
- Pushed branch `sync-server-2026-10-25` (operator's `id_rsa` = GitHub `osamaafana`; default key is `Wkeel-Backend`).
- Server `/opt/projects/BookScaner` replaced by this repo (rsync, no git), Mac `.env` copied (mode 600). Built
  images first, then stopped the old `deployment` stack, swapped folders, `docker compose up -d` (project
  `bookscaner`, all on `proxy_network`, no host ports). Old images `deployment-*` and network removed (714 MB).
- NPM unchanged (same container names); `nginx -s reload` needed because NPM cached the gateway's old IP (502).
- Backup of old code: `/root/backups/BookScaner-old-2026-10-26.tgz`.
- Stamp: live-verified: https://book-scanner.net 200, api health ok, live scan 3 books (groq) in 3s, live recs ok,
  other NPM sites 200/302.

### 2026-10-26c — fix(recs): honest to the reader's chosen preferences
- Prompt v`2026-10-26e`: no invented interests; specific genre 8-10, broad Non-Fiction 5-7 (story-driven first),
  no match <=4; one con per book; shelf note from code (`_shelf_note`) shown on For you page.
- Stamp: live-verified through gateway with prefs Non-Fiction/Mystery/Romance: business shelf -> 5.0-7.0, Steve
  Jobs top, note "None of these books is mystery or romance..."; mixed shelf -> Dragon Tattoo 9.0 (Mystery),
  Pride and Prejudice 9.0 (Romance), Steve Jobs 7.0, no note.

### 2026-10-26b — fix(recs): useful picks, fair scoring, no stale answers
- Recommendation text 40-70 words (what the book is about + who it suits); a book needs only one favorite genre;
  label follows score; reused answers must match current preferences and prompt (`PROMPT_VERSION`, Redis
  `recsig:` keys). UI shows "Score based on" line.
- Stamp: live-verified through gateway: 3 books 8s fresh, 2s cached; switching genres Romance -> Non-Fiction gave a
  fresh score (5.5 -> 8.5) instead of the cached one.
- Google Books: new key works intermittently (1 real 200 in ~40 tries); Google returns 503 for most requests.

### 2026-10-26a — fix(lookup): right book or no book; parallel lookups
- Commit on branch `sync-server-2026-10-25`. Not deployed.
- `books_meta.py`: results must match title (`title_matches`) and author (`author_matches`); free-text retry;
  cover from another matching edition or Google Books; Google Books errors no longer log the URL with the key.
- `scan.py`: lookups run in parallel (8 at a time). Cache keys `meta:v2:` and `scan:v2:`.
- Stamp: live-verified on the Mac through gateway: operator's 9-book photo 9/9 correct, all covers, 10s
  (was 8/9, 1 missing cover); 2560.webp 9 correct of 11 entries, 9-14s (was ~31s). Remaining: 2 reader
  inventions ("from 2019", "The National Ballpark Guide") shown without cover; Zero to One year 2001 is Open
  Library's data.

### 2026-10-25e — fix(ai): scanning works again; Groq-first with Groq fallback
- Commits `f11d792` (accept `rediss://` Redis URLs) and `13a81ad` (AI fixes). Not deployed; server untouched.
- Root causes found: Upstash Redis DB gone (operator made a new one); old Groq key invalid (operator replaced);
  Groq retired llama-4-scout and llama-3.1-8b; NVIDIA retired llama-3.1-70b and the NVIDIA key returns 403;
  Groq free tier caps output at 1000 tokens/min, so uncapped requests were refused.
- Reader `qwen/qwen3.8-27b` (thinking off, 1000-token cap, title-by-author prompt). Fallback Google Vision → NVIDIA
  → Groq `GROQ_TEXT_MODEL` grouping. Recommendations `openai/gpt-oss-20b`, JSON mode, rewritten prompt.
- Stamp: live-verified on the Mac through gateway + backend: jungle_book.jpg 3 books in 8s; 2560.webp 15 books in
  31s (some wrong metadata matches, see T-8). Fallback alone: 9 books in 2.3s. Recs: 5 books scored in 0.7s.
- Mac `.env` now holds the server values plus new Redis URL, new Groq key and model names (not committed).

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
