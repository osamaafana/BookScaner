# Runbook

## Where it runs
- Server `91.98.136.8` (Hetzner, Ubuntu 24.04), folder `/opt/projects/BookScaner`, like the other projects in
  `/opt/projects`. Nginx Proxy Manager (`/opt/npm`) owns TLS and routing on the shared `proxy_network`:
  `book-scanner.net`, `www` → `bookscaner-web-ui:80`; `api.book-scanner.net` → `bookscaner-web-gateway:3001`.
- Database: Neon Postgres. Cache: Upstash Redis. Both in `.env` (never committed).

## Deploy (from the Mac)
1. `rsync -a --exclude node_modules --exclude .git --exclude .env ./ root@91.98.136.8:/opt/projects/BookScaner/`
2. Copy the Mac `.env` separately: `scp .env root@91.98.136.8:/opt/projects/BookScaner/.env` then `chmod 600` it.
3. `cd /opt/projects/BookScaner && docker compose up -d --build`
4. `docker exec nginx-proxy-manager nginx -s reload` (NPM caches old container IPs; without it /api gives 502).
5. Check: `docker ps | grep bookscaner`, `curl -s https://api.book-scanner.net/health`, open https://book-scanner.net.

## Rollback
Backup of the pre-2026-10-26 server code: `/root/backups/BookScaner-old-2026-10-26.tgz`. Keep a copy before step 1: `cp -a /opt/projects/BookScaner /opt/projects/BookScaner.bak-YYYY-MM-DD`. To roll back,
`docker compose down`, restore the copy, and start the old stack with `deployment/docker-compose-full.yml`.

## Env vars (names only)
`POSTGRES_URL`, `REDIS_URL`, `GROQ_API_KEY`, `GOOGLE_VISION_API_KEY`, `GOOGLEBOOKS_API_KEY`, `NVIDIA_API_KEY`,
`JWT_SECRET`, `ADMIN_TOKEN`, `CORS_ORIGINS`, rate-limit settings. Full list: README "Configuration Reference".
