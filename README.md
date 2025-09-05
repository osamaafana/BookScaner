
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
