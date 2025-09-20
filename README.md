
cahnge the alembic.ini
#sqlalchemy.url = postgresql+psycopg2://bookscanner:bookscanner@postgres:5432/bookscanner

change the .env

How to run locally next time:
1) Start infra:
docker compose -f deployment/docker-compose.yml up -d postgres redis
2) Alembic from backend directory:
POSTGRES_URL=postgresql://bookscanner:bookscanner@127.0.0.1:5433/bookscanner alembic revision --autogenerate -m "init"
POSTGRES_URL=postgresql://bookscanner:bookscanner@127.0.0.1:5433/bookscanner alembic upgrade head
3) Run API locally:
Ensure .env exists at repo root (values can still use postgres host for Compose, but for local runs override POSTGRES_URL env var as above).
uvicorn app.main:app --reload


python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload


Production check list :

# CRITICAL: Set these in your production environment (Vercel/Railway/etc.)
SECURE_COOKIES=true              # ✅ MUST be true for HTTPS
BACKEND_URL=https://your-api.com # ✅ Your production backend URL
NODE_ENV=production              # ✅ Standard production setting

# Optional: Stricter limits for production
RL_MAX=30                        # Stricter: 30 requests per 5-min window
BURST_PER_SEC=10                 # Stricter: 10 tokens/sec
MAX_UPLOAD_MB=5                  # Stricter: 5MB max uploads


cd /Users/osamavalit/Documents/Projects/BookScaner/frontend/web-gateway && npm run dev

cd /Users/osamavalit/Documents/Projects/BookScaner/frontend/web-ui && npm run dev

cd /Users/osamavalit/Documents/Projects/BookScaner/deployment && docker-compose up --build

cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
