# Code map

| Area | Path | Notes |
|---|---|---|
| Backend API (FastAPI) | `backend/app/main.py`, `backend/app/routers/` | `/v1/scan`, `/v1/books/*`, `/v1/history`, `/v1/preferences`, `/v1/recommend`, `/admin/*`, `/health` |
| Vision + metadata | `backend/app/services/vision.py`, `books_meta_service.py`, `backend/app/adapters/` | Groq / Google Vision → Open Library → Google Books |
| DB models + migrations | `backend/app/db/models.py`, `backend/migrations/` | Alembic runs on container start |
| Gateway (Express) | `frontend/web-gateway/src/server.ts` | device cookie, rate limits, bot block, proxies `/api/*` to backend |
| Web UI (React + Vite) | `frontend/web-ui/src/` | `App.tsx` routes; pages in `pages/`; shared UI in `components/ui/` |
| Design tokens | `frontend/web-ui/src/styles/globals.css`, `tailwind.config.ts` | see `DESIGN.md` |
| Navigation list | `frontend/web-ui/src/lib/nav.ts` | used by `TopBar` (desktop) and `Navigation` (phone) |
| Local data | `frontend/web-ui/src/contexts/StorageContext.tsx` | books, scans, preferences in IndexedDB + backend sync |
| API client | `frontend/web-ui/src/api/client.ts` | same-origin `/api` when `VITE_GATEWAY_URL` is empty |
| Deploy | `docker-compose.yml` (root) | all services on external `proxy_network`, no host ports |

Scan flow: `HomePage` → downscale in `downscale.worker.ts` → `api.scan()` → gateway `/api/scan` → backend
`/v1/scan` → vision → metadata → `CollectionGrid` → save (`StorageContext`) or recommend (`/v1/recommend`).
