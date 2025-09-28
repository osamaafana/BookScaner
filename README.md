# BookScanner 📚

A comprehensive book scanning and recommendation system that uses AI to detect books from photos and provide personalized recommendations.

## 🚀 Features

- **📸 Photo Book Scanning**: Upload photos of bookshelves to automatically detect and identify books
- **🤖 AI-Powered OCR**: Uses Groq and Google Vision APIs for text recognition
- **📖 Book Metadata**: Automatically enriches book data with covers, publication info, and ISBNs
- **🎯 Personalized Recommendations**: AI-powered book recommendations based on your preferences
- **📱 Progressive Web App**: Works on desktop and mobile devices
- **🔒 Secure**: Rate limiting, image validation, and admin controls
- **☁️ Cloud-Ready**: Deploy with Docker and external databases

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Backend       │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (FastAPI)     │
│   Port: 3000    │    │   Port: 3001    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx         │    │   Security      │    │   PostgreSQL    │
│   (Static)      │    │   Middleware    │    │   (Neon DB)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       ▼
                                               ┌─────────────────┐
                                               │   Redis Cache   │
                                               │   (Upstash)     │
                                               └─────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Database ORM
- **Alembic** - Database migrations
- **PostgreSQL** - Primary database (Neon DB)
- **Redis** - Caching and rate limiting (Upstash)
- **Groq API** - AI vision processing
- **Google Vision API** - Fallback OCR service
- **NVIDIA NIM** - Advanced AI recommendations

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **PWA** - Progressive Web App features

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Orchestration
- **Nginx** - Reverse proxy
- **Node.js** - API Gateway

## 📋 Prerequisites

- **Docker** and **Docker Compose**
- **Node.js** 18+ (for local development)
- **Python** 3.11+ (for local development)
- **API Keys** for:
  - Groq API
  - Google Cloud Vision
  - NVIDIA API (optional)
  - Google Books API (optional)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd BookScaner
```

### 2. Environment Setup

Copy the example environment file and fill in your API keys:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# App Configuration
APP_ENV=dev
API_BASE_URL=http://localhost:8000
LOG_LEVEL=INFO
METRICS_ENABLED=true
MAX_UPLOAD_MB=10

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Database (Neon PostgreSQL)
POSTGRES_URL=postgresql://username:password@host:port/database?sslmode=require

# Cache (Upstash Redis)
REDIS_URL=redis://default:token@host:port

# AI Providers
GROQ_API_KEY=your_groq_api_key
GROQ_MONTHLY_CAP_USD=10
GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct

# Google Cloud Vision
GCV_CREDENTIALS_JSON_PATH=/path/to/gcp.json
GOOGLE_VISION_API_KEY=your_google_vision_api_key
GOOGLEBOOKS_API_KEY=your_google_books_api_key

# NVIDIA API (Optional)
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com
NVIDIA_MODEL_NAME=meta/llama-3.1-70b-instruct

# Security
JWT_SECRET=your_jwt_secret_64_chars_long
ADMIN_TOKEN=your_admin_token

# Rate Limiting
RATE_LIMIT_PER_DEVICE_HOURLY=100
RATE_LIMIT_PER_DEVICE_DAILY=500
RATE_LIMIT_PER_IP_PER_MIN=50
RATE_LIMIT_PER_IP_DAILY=1000

# Gateway Configuration
PORT=3001
BACKEND_URL=http://localhost:8000
RL_WINDOW_MS=300000
RL_MAX=120
BURST_PER_SEC=20
SECURE_COOKIES=false
```

### 3. Development Setup

#### Option A: Full Docker Deployment (Recommended)

```bash
# Build and start all services
cd deployment
docker compose -f docker-compose-full.yml up --build

# Access the application
# Frontend: http://localhost:3000
# API Gateway: http://localhost:3001
# Backend: http://localhost:8000
```

#### Option B: Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**API Gateway:**
```bash
cd frontend/web-gateway
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend/web-ui
npm install
npm run dev
```

### 4. Production Deployment

#### Server Deployment

1. **Upload your project to the server:**
```bash
# Upload the entire BookScaner directory to your server
scp -r BookScaner/ user@your-server:/home/user/
```

2. **SSH into your server:**
```bash
ssh user@your-server
cd BookScaner
```

3. **Set up environment variables:**
```bash
# Edit the .env file with your production values
nano .env
```

4. **Deploy with Docker:**
```bash
cd deployment
docker compose -f docker-compose-full.yml up -d --build
```

5. **Check status:**
```bash
docker compose -f docker-compose-full.yml ps
docker compose -f docker-compose-full.yml logs -f
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `GROQ_API_KEY` | Groq API key for AI processing | Required |
| `GOOGLE_VISION_API_KEY` | Google Vision API key | Required |
| `JWT_SECRET` | JWT signing secret (64 chars) | Required |
| `ADMIN_TOKEN` | Admin panel access token | Required |
| `MAX_UPLOAD_MB` | Maximum upload size in MB | 10 |
| `CORS_ORIGINS` | Allowed CORS origins | localhost |

### API Endpoints

#### Public Endpoints
- `POST /api/scan` - Upload and scan book images
- `GET /api/preferences` - Get user preferences
- `PUT /api/preferences` - Update user preferences
- `POST /api/recommend` - Get book recommendations
- `GET /api/history` - Get scan history

#### Admin Endpoints
- `GET /api/admin/metrics` - System metrics
- `POST /api/admin/flush-device` - Clear device data
- `POST /api/admin/flush-db` - Clear all database data
- `POST /api/admin/rotate-admin-token` - Rotate admin token

## 🐳 Docker Services

### docker-compose-full.yml

- **backend**: FastAPI application
- **backend-nginx**: Nginx reverse proxy for backend
- **web-ui**: React frontend
- **web-gateway**: Node.js API gateway

### Ports

- **3000**: Frontend (React)
- **3001**: API Gateway (Node.js)
- **8000**: Backend (FastAPI)
- **80**: Nginx (Backend proxy)

## 🔒 Security Features

- **Rate Limiting**: Per-device and per-IP limits
- **Image Validation**: Magic byte verification and EXIF stripping
- **CORS Protection**: Configured origins and headers
- **Admin Authentication**: Token-based admin access
- **Input Sanitization**: All inputs validated and sanitized

## 📊 Monitoring

### Health Checks
- Backend: `GET /health`
- Gateway: `GET /health`
- Database and Redis connectivity checks

### Metrics
- Prometheus metrics at `/metrics`
- Vision processing statistics
- Cache hit rates
- Image processing metrics

## 🧪 Testing

### Manual Testing

1. **Photo Upload Test:**
```bash
curl -X POST -F "image=@test-image.jpg" \
  -H "User-Agent: Mozilla/5.0" \
  http://localhost:3001/api/scan
```

2. **Admin Endpoint Test:**
```bash
curl -X POST http://localhost:3001/api/admin/flush-device \
  -H "Content-Type: application/json" \
  -H "X-Admin-Token: your_admin_token" \
  -H "User-Agent: Mozilla/5.0"
```

### Health Check
```bash
curl http://localhost:8000/health
curl http://localhost:3001/health
```

## 🚨 Troubleshooting

### Common Issues

1. **CORS Errors**: Check `CORS_ORIGINS` in environment variables
2. **Database Connection**: Verify `POSTGRES_URL` format
3. **Redis Connection**: Verify `REDIS_URL` format
4. **API Key Issues**: Check all required API keys are set
5. **Port Conflicts**: Ensure ports 3000, 3001, 8000, 80 are available

### Logs

```bash
# View all logs
docker compose -f docker-compose-full.yml logs -f

# View specific service logs
docker compose -f docker-compose-full.yml logs -f backend
docker compose -f docker-compose-full.yml logs -f web-gateway
```

### Reset Everything

```bash
# Stop and remove all containers
docker compose -f docker-compose-full.yml down

# Remove all images (optional)
docker compose -f docker-compose-full.yml down --rmi all

# Rebuild from scratch
docker compose -f docker-compose-full.yml up --build
```

## 📝 API Documentation

Once running, visit:
- **Backend API Docs**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs
3. Open an issue on GitHub

---

**Happy Book Scanning! 📚✨**