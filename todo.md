# todo

## OPEN
- T-1 Run one real scan locally against the backend (photo → results → recommendations) before deploy.
- T-2 Deploy branch to the server: replace `/opt/projects/BookScaner` code, `docker compose up -d --build` from
  repo root, confirm NPM routes and `/health`. Old `deployment/docker-compose-full.yml` stack must be stopped first
  (`docker compose -f deployment/docker-compose-full.yml down` in the old folder). See RUNBOOK.
- T-3 Push branch to GitHub and open a PR into `main` (after operator review).
- T-4 Stale Cloudflare tunnel config on the server points at 127.0.0.1:3000/3001 (nothing listens). Decide: fix or
  remove the tunnel entries.
- T-5 Pre-existing lint debt: 20 eslint errors (`any`, fast-refresh exports) in contexts/, lib/, HomePage.
- T-6 `HomePage.tsx` is ~1,400 lines; split scan logic into a hook (`useScan`) and keep the page as layout.
- T-7 Server `.env` is world-readable (644) and an old `.env.old` sits next to it; tighten to 600, remove old file.

- T-8 DONE 2026-10-26 (see CHANGELOG 2026-10-26a). Left: reader sometimes invents a title (shown without cover);
  Open Library years can be wrong (Zero to One = 2001). Was: Book lookup picks wrong matches for fragments ("Julian" → Gore Vidal, "from 2019"); tighten matching in
  `books_meta_service.py` (require title similarity) and drop entries without a real title. Scans of big shelves take
  ~30s because lookups run one by one; run them in parallel.
- T-9 Server `.env` still has the dead Redis URL, old Groq key and retired models: copy the Mac values when deploying.

## AWAITING OPERATOR
- AO-3 Google Books returns 503 with the key (429 without): check the key's project/quota in Google Cloud Console.
  The key was printed in local backend logs before 2026-10-26a; consider restricting or rotating it.
- AO-2 New NVIDIA API key (current one returns 403). Optional: Groq covers the fallback without it.
- AO-1 Review the redesign locally (`npm run dev` in `frontend/web-ui`) and say deploy / change.

## DONE
- 2026-10-25 server code synced to git; nginx removed; UI redesign (see CHANGELOG 2026-10-25a-c).
