# BookScanner 📚

**Never leave a bookstore empty-handed again!**

Have you ever been at a book sale, library, or friend's house looking at shelves of books but didn't recognize any titles or authors? BookScanner solves the problem of figuring out what to read by using AI to help you discover what you'll enjoy.

**[book-scanner.net](https://book-scanner.net)**

## What It Does

📸 **Scan Shelves** → Take a photo of an entire bookshelf

🤖 **AI Analysis** → Get book recommendations based on your reading preferences

📖 **Rich Details** → View AI-generated summaries, ratings, and match reasoning

📚 **Build Lists** → Save interesting books to your reading list

🛒 **Easy Purchase** → Direct links to buy books on Amazon if you're not at a store

## Key Features

### Smart Book Discovery

- **Shelf Scanning**: Photograph entire bookshelves to identify multiple books at once
- **AI Recommendations**: Personalized suggestions based on your reading preferences
- **Match Reasoning**: Understand exactly why each book is recommended for you
- **Enhanced Metadata**: Rich book information with AI-generated summaries and ratings

### User Experience

- **Mobile-First Design**: Optimized for smartphones and tablets
- **Device-Based Sessions**: No account required - preferences stored per device
- **Progressive Web App**: Works offline and can be installed on your device
- **Responsive Design**: Works well on all screen sizes

### Performance & Reliability

- **Intelligent Caching**: Multi-layer caching reduces API costs and improves speed
- **Rate Limiting**: Built-in protection against API abuse
- **Error Handling**: Graceful fallbacks when services are unavailable
- **Database Monitoring**: PostgreSQL connection and performance tracking

## 🛠 Technology Stack

**Frontend**: React 18 + TypeScript, TailwindCSS, Vite, PWA features

**Backend**: FastAPI (Python), PostgreSQL, SQLAlchemy ORM, Alembic migrations

**AI Services**: Groq Vision API, Google Cloud Vision API, NVIDIA NIM, Google Books API

**Infrastructure**: Docker, Docker Compose, Redis (Upstash), PostgreSQL (Neon), Node.js API Gateway

**Deployment**: Docker containers, Nginx reverse proxy

## 🚀 Quick Setup

### Prerequisites

- **Docker** and **Docker Compose**
- **Node.js** 18+ (for local development)
- **Python** 3.11+ (for local development)
- **API Keys** for:
  - Groq API
  - Google Cloud Vision
  - Google Books API (optional)
  - NVIDIA API (optional)

### Local Development

#### Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd BookScaner
```

#### Set Up Environment Variables

Create a `.env` file in the root directory using `env.production.template` as reference:

```bash
cp env.production.template .env
```

Edit `.env` with your configuration:

```bash
# Database (Required)
POSTGRES_URL=postgresql://username:password@host:port/database?sslmode=require

# Cache (Required)
REDIS_URL=redis://default:token@host:port

# AI Providers (Required)
GROQ_API_KEY=your_groq_api_key
GOOGLE_VISION_API_KEY=your_google_vision_api_key
GOOGLEBOOKS_API_KEY=your_google_books_api_key

# NVIDIA API (Optional)
NVIDIA_API_KEY=your_nvidia_api_key

# Security (Required)
JWT_SECRET=your_jwt_secret_64_chars_long
ADMIN_TOKEN=your_admin_token
```

#### Database Setup

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
```

#### Start Development Server

**Option A: Full Docker Deployment (Recommended)**

```bash
cd deployment
docker compose -f docker-compose-full.yml up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- API Gateway: http://localhost:3001
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Option B: Local Development**

**Backend:**
```bash
cd backend
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

## Production Deployment

### Docker Deployment (Recommended)

1. **Upload your project to the server:**
```bash
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

## 🔐 Environment Configuration

### Required Variables

Create a `.env` file with these required variables:

**Database (Required)**
```
POSTGRES_URL=postgresql://user:password@host:port/database?sslmode=require
```

**Cache (Required)**
```
REDIS_URL=redis://default:token@host:port
```

**AI Providers (Required)**
```
GROQ_API_KEY=your_groq_api_key
GOOGLE_VISION_API_KEY=your_google_vision_api_key
GOOGLEBOOKS_API_KEY=your_google_books_api_key
```

**Security (Required)**
```
JWT_SECRET=your_jwt_secret_64_chars_long
ADMIN_TOKEN=your_admin_token
```

### API Key Setup

**Groq API** (Required - for book spine detection):
- Visit [Groq Console](https://console.groq.com/)
- Create an account and get your API key

**Google Vision API** (Required - fallback OCR service):
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Enable the Vision API
- Create credentials and get your API key

**Google Books API** (Optional - for book metadata):
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Enable the Books API
- Get your API key

**NVIDIA API** (Optional - for advanced recommendations):
- Visit [NVIDIA API](https://build.nvidia.com/)
- Create an account and get your API key


## 🔍 How It Works

### 1. Book Detection

- Users photograph bookshelves using their device camera
- Image is processed using Groq or Google Vision API to extract text from book spines
- AI models identify book titles and authors from spine text
- Custom parsing algorithms handle various formatting styles

### 2. Data Enhancement

- Basic book metadata fetched from Google Books API and OpenLibrary
- AI-generated summaries and enhanced ratings
- Cover images and ISBNs retrieved automatically
- All data cached in PostgreSQL and Redis for performance

### 3. Personalized Recommendations

- Users input reading preferences (genres, authors, languages)
- AI analyzes user's preferences against detected books
- Generates personalized match scores with detailed reasoning
- Recommendations stored in database for fast retrieval

### 4. Smart Caching

- **Database Layer**: Stores enhanced book data permanently
- **Redis Cache**: Fast access to scan results and metadata
- **Rate Limiting**: Prevents expensive API overuse
- **Device Identification**: Preferences linked to device cookies

## 📊 Performance Features

- **Lazy Loading**: Images and data load as needed
- **Request Batching**: Efficient API usage
- **Progressive Enhancement**: App works even if AI services are down
- **Multi-Level Caching**: Database + Redis reduces API costs
- **Image Downscaling**: Automatic image optimization for API limits

## 🛡 Security & Privacy

- **Device-Based Storage**: Reading preferences stored per device, no accounts required
- **API Key Protection**: All sensitive keys in environment variables
- **Input Validation**: Image validation with magic byte verification
- **EXIF Stripping**: Privacy-focused image processing
- **Rate Limiting**: Per-device and per-IP limits prevent abuse
- **CORS Protection**: Configured origins and headers
- **Admin Authentication**: Token-based admin access

## 🧪 Development Scripts

### Development
```bash
npm run dev              # Start development servers
npm run lint             # Run ESLint
npm run fmt              # Format code with Prettier
```

### Database
```bash
cd backend
alembic upgrade head     # Apply database migrations
alembic revision --autogenerate -m "description"  # Create new migration
```

### Docker
```bash
docker compose -f deployment/docker-compose-full.yml up --build
docker compose -f deployment/docker-compose-full.yml down
docker compose -f deployment/docker-compose-full.yml logs -f
```

## 📈 Admin Features

Admin functionality is available at `/v1/admin` for monitoring:

- API usage statistics
- System metrics (Prometheus format)
- Device data management
- Database flush operations
- Health checks

Access requires `X-Admin-Token` header with valid admin token.

## 📄 License

**All Rights Reserved** - This project is proprietary software owned by the author.

✅ **Viewing**: You may view the source code for educational purposes

✅ **Learning**: You may study the implementation and techniques used

❌ **Commercial Use**: Commercial use is strictly prohibited

❌ **Distribution**: You may not distribute, modify, or create derivative works

❌ **Deployment**: You may not deploy this application for public or commercial use

For any licensing inquiries or permission requests, please contact **osamaafana4@gmail.com**

## 🆘 Support

- **Website**: [book-scanner.net](https://book-scanner.net)
- **Email**: osamaafana4@gmail.com
- **Issues**: Create a GitHub issue for bugs or feature requests


---

**Built with ❤️ for book lovers who want to discover their next great read!**
