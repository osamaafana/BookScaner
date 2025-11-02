![BookScanner meme](frontend/web-ui/public/static/img/meme.jpeg)

# BookScanner

## Never leave a bookstore empty-handed again!

Have you ever been at a book sale, library, or friend's house looking at shelves of books but didn't recognize any titles or authors? ShelfScanner solves the problem of figuring out what to read by using AI to help you discover what you'll enjoy.

**Site:** https://book-scanner.net

---

## Cloud Architecture 

BookScanner is built on a modern, scalable cloud architecture that ensures high performance and reliability:

### **PostgreSQL Database on Neon**
- **Production Database**: Fully deployed on [Neon](https://neon.tech) - a serverless PostgreSQL platform
- **Purpose**: Stores all persistent data including:
  - Book metadata and enriched information
  - User preferences and reading lists
  - Scan history and recommendations
  - Device-based session data
- **Benefits**: 
  - Automatic scaling and backups
  - Serverless architecture - no database management overhead
  - Fast, global connections
  - Zero-downtime maintenance

### **Redis Cache on Upstash**
- **Caching Layer**: Deployed on [Upstash](https://upstash.com) - serverless Redis for global edge caching
- **Purpose**: High-performance caching for:
  - Book scan results (30-day TTL)
  - Book metadata (180-day TTL)
  - Recommendation cache (7-day TTL)
  - Rate limiting and session data
- **Benefits**:
  - Reduces API costs by 90%+ through intelligent caching
  - Sub-millisecond response times
  - Global edge distribution
  - Automatic scaling and backup

### **How They Work Together**

```
User Request
    ↓
React Frontend (Port 3000)
    ↓
Node.js API Gateway (Port 3001) → Rate Limiting & Security
    ↓
FastAPI Backend (Port 8000)
    ↓
├─→ Redis Cache (Upstash) → Fast cache hits for repeated requests
│   └─→ If miss, continue ↓
│
└─→ PostgreSQL (Neon) → Persistent storage
    └─→ If new data, cache in Redis for future requests
```

This architecture ensures:
- ⚡ **Fast Response Times**: Redis provides instant cache hits
- 💰 **Cost Efficiency**: Caching dramatically reduces expensive AI API calls
- 🔄 **Reliability**: Neon provides automatic backups and failover
- 📈 **Scalability**: Both services scale automatically with traffic
- 🌍 **Global Performance**: Edge caching brings data closer to users

---

## 🤖 AI Engine & Fallback Mechanism

### **Vision Model**
- **Primary**: LLaMA 4 Scout via Groq (`meta-llama/llama-4-scout-17b-16e-instruct`)
- **Fallback**: Google Vision API → NVIDIA NIM (`meta/llama-3.1-70b-instruct`)
  - Google Vision extracts OCR text
  - NVIDIA NIM structures text into book spines
- **Flow**: Try Groq → if fails → Google Vision + NVIDIA NIM → cache result

### **Recommendations**
- **LLaMA 3.1 8B Instant via Groq** (`llama-3.1-8b-instant`)


---

## 🛠️ Technology Stack

**Frontend**: React 18 + TypeScript, TailwindCSS, Vite, PWA

**Backend**: FastAPI + Python 3.11+, SQLAlchemy, Alembic

**Database**: PostgreSQL (Neon), Redis (Upstash)

**Infrastructure**: Docker, Docker Compose, Nginx, Node.js API Gateway

---

## What It Does ?

---


📸 Scan Shelves → Take a photo of an entire bookshelf.

🤖 AI Analysis → Get book recommendations based on your reading preferences.

📖 Rich Details → View AI-generated Recommendation, ratings, and match reasoning.

📚 Build Lists → Save interesting books to your reading list.




---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Clone](#clone)
  - [Configure Environment](#configure-environment)
  - [Local Development](#local-development)
  - [Full Docker](#full-docker)
- [Production Deployment](#production-deployment)
- [Configuration Reference](#configuration-reference)
- [Monitoring & Admin](#monitoring--admin)
- [Security & Privacy](#security--privacy)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [License](#license)
- [Contact](#contact)

---

## Overview

BookScanner helps you decide what to read when facing shelves you do not recognize. Photograph a shelf, extract titles, enrich with metadata, and receive ranked recommendations with reasons.

---

## Features

### Discovery
- Shelf scanning: detect many books from one photo.
- Title/author OCR with Groq Vision and Google Vision fallback.
- Enhanced metadata: covers, ISBNs, summaries, ratings.

### Personalization
- Preference capture by genres, authors, languages.
- Match scores with explanation for each suggestion.
- Reading list builder and device-scoped history.

### UX
- Mobile-first PWA. Installable and offline-tolerant.
- Device-based sessions. No account required.
- Responsive across phone, tablet, and desktop.

### Performance & Reliability
- Multi-layer caching (Redis + PostgreSQL).
- Request batching and lazy loading.
- Rate limiting and graceful fallbacks.

---

## Architecture

- **Frontend:** React 18 + TypeScript, TailwindCSS, Vite, PWA features.
- **API Gateway:** Node.js (edge/adapter), routes traffic, applies CORS and rate limits.
- **Backend:** FastAPI (Python), SQLAlchemy ORM, Alembic migrations.
- **Data:** PostgreSQL (Neon), Redis (Upstash).
- **AI Services:** Groq Vision, Google Cloud Vision, Google Books; optional NVIDIA NIM.
- **Infra:** Docker, Docker Compose, Nginx reverse proxy.

_Placeholder for diagram:_ `docs/architecture.png`

---

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js ≥ 18 (for local dev)
- Python ≥ 3.11 (for local dev)
- API keys:
  - Groq
  - Google Cloud Vision
  - Google Books (optional)
  - NVIDIA (optional)

### Clone
```bash
git clone <your-repo-url>
cd BookScanner
```

### Configure Environment
Create `.env` at repo root from the template:
```bash
cp env.production.template .env
```
Edit `.env` with your values. See [Configuration Reference](#configuration-reference).

### Local Development

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**API Gateway**
```bash
cd frontend/web-gateway
npm install
npm run dev   # http://localhost:3001
```

**Frontend**
```bash
cd frontend/web-ui
npm install
npm run dev   # http://localhost:3000
```

### Full Docker
```bash
cd deployment
docker compose -f docker-compose-full.yml up --build
# After first start:
docker compose -f docker-compose-full.yml ps
docker compose -f docker-compose-full.yml logs -f
```

Default endpoints:
- Frontend: http://localhost:3000
- API Gateway: http://localhost:3001
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Production Deployment

1. Copy project to server:
```bash
scp -r BookScanner/ user@server:/home/user/
```

2. SSH and set env:
```bash
ssh user@server
cd /home/user/BookScanner
nano .env   # set production values
```

3. Deploy:
```bash
cd deployment
docker compose -f docker-compose-full.yml up -d --build
docker compose -f docker-compose-full.yml ps
docker compose -f docker-compose-full.yml logs -f
```

4. Reverse proxy and TLS:
- Point your domain DNS to the server.
- Terminate TLS at Nginx or a managed proxy.
- Forward 443 → frontend:3000. Expose the backend only to the gateway.

---

## Configuration Reference

Set in `.env` at repo root.

### Core
| Variable | Required | Example | Description |
|---|---|---|---|
| `POSTGRES_URL` | Yes | `postgresql://user:pass@host:5432/db?sslmode=require` | Main database DSN |
| `REDIS_URL` | Yes | `redis://default:token@host:6379` | Cache store DSN |

### AI Providers
| Variable | Required | Example | Description |
|---|---|---|---|
| `GROQ_API_KEY` | Yes | `gsk_...` | Primary OCR/vision |
| `GOOGLE_VISION_API_KEY` | Yes | `AIza...` | OCR fallback |
| `GOOGLEBOOKS_API_KEY` | Optional | `AIza...` | Metadata enrichment |
| `NVIDIA_API_KEY` | Optional | `nvapi_...` | Advanced recs |

### Security
| Variable | Required | Example | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | 64+ chars | Token signing key |
| `ADMIN_TOKEN` | Yes | random string | Required by admin routes |
| `ALLOWED_ORIGINS` | Optional | `https://book-scanner.net` | Comma-separated CORS origins |

### Operational
| Variable | Required | Example | Description |
|---|---|---|---|
| `BACKEND_URL` | Optional | `http://backend:8000` | Internal service URL |
| `GATEWAY_PORT` | Optional | `3001` | Node gateway port |
| `FRONTEND_PORT` | Optional | `3000` | Web UI port |
| `RATE_LIMIT_RPM` | Optional | `60` | Requests per minute per device/IP |

---

## Monitoring & Admin

Admin endpoints under `/v1/admin`:
- Health check
- Prometheus metrics
- API usage stats
- Device management
- Cache/database maintenance

Send header: `X-Admin-Token: <ADMIN_TOKEN>`

---

## Security & Privacy

- Device-scoped sessions. No user accounts by default.
- API keys stored in server environment variables only.
- Input validation on uploads with magic-byte checks.
- EXIF stripping before processing images.
- Per-device and per-IP rate limiting.
- CORS restricted to allowed origins.
- Minimal data retention. Remove raw images after processing.

---

## Troubleshooting

- **OCR misses titles:** Use good lighting. Fill frame with spines. Avoid extreme angles.
- **Empty results:** Validate `GROQ_API_KEY` and `GOOGLE_VISION_API_KEY`. Check Redis/Postgres connectivity.
- **CORS errors:** Set `ALLOWED_ORIGINS` and restart gateway.
- **Migrations fail:** Confirm `POSTGRES_URL`. Verify alembic head before retry.
- **Rate limited:** Adjust `RATE_LIMIT_RPM` in trusted environments.

---

## Roadmap

- On-device prefiltering to reduce API calls.
- In-app camera guides for better spine capture.
- Collections export (CSV/JSON).
- Optional user accounts with cross-device sync.
- More metadata sources and deduping heuristics.

---

## License

**All Rights Reserved.** Source is viewable for educational purposes. Commercial use, redistribution, modification, and public deployment are prohibited without prior written permission.

For licensing inquiries, email **osamaafana4@gmail.com**.

---

## Contact

- Website: https://book-scanner.net
- Email: osamaafana4@gmail.com
