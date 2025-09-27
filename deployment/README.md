# BookScanner Production Deployment

This guide will help you deploy the BookScanner application on an Ubuntu server with Nginx as a reverse proxy.

## Prerequisites

- Ubuntu 20.04+ server
- Docker and Docker Compose installed
- Domain name (optional, can use IP address)
- API keys for external services

## Quick Deployment

1. **Upload the project to your server:**
   ```bash
   scp -r /path/to/BookScaner user@your-server:/srv/
   ```

2. **SSH into your server:**
   ```bash
   ssh user@your-server
   ```

3. **Run the deployment script:**
   ```bash
   cd /srv/bookscanner/deployment
   chmod +x deploy.sh
   ./deploy.sh
   ```

## Manual Deployment

### 1. Install Docker and Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Set up the project

```bash
# Create project directory
sudo mkdir -p /srv/bookscanner
sudo chown $USER:$USER /srv/bookscanner

# Copy project files
cp -r /path/to/BookScaner/* /srv/bookscanner/
cd /srv/bookscanner/deployment
```

### 3. Configure environment

```bash
# Copy the environment template
cp env.production.template .env

# Edit the environment file with your actual values
nano .env
```

**Required environment variables:**
- `POSTGRES_URL`: Your Neon database connection string
- `REDIS_URL`: Your Upstash Redis connection string
- `GROQ_API_KEY`: Your Groq API key
- `GOOGLE_VISION_API_KEY`: Your Google Vision API key
- `GOOGLEBOOKS_API_KEY`: Your Google Books API key
- `NVIDIA_API_KEY`: Your NVIDIA API key
- `ADMIN_TOKEN`: A secure random token for admin access
- `JWT_SECRET`: A secure random secret for JWT tokens

### 4. Deploy the application

```bash
# Build and start all services
docker-compose up -d --build

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

## Architecture

The deployment consists of:

- **Nginx**: Reverse proxy on port 80
- **Backend**: FastAPI application on port 8000 (internal)
- **PostgreSQL**: Database (optional, using Neon in production)
- **Redis**: Cache and rate limiting (optional, using Upstash in production)

## Nginx Configuration

The Nginx configuration is located at `/srv/bookscanner/deployment/nginx/default.conf`:

```nginx
server {
  listen 80;
  server_name _;  # use IP for now

  client_max_body_size 20m;

  location / {
    proxy_pass http://backend:8000/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## SSL/HTTPS Setup (Optional)

To enable HTTPS, you can use Let's Encrypt with Certbot:

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Monitoring and Maintenance

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f nginx
```

### Update the application
```bash
cd /srv/bookscanner
git pull
cd deployment
docker-compose up -d --build
```

### Backup data
```bash
# Backup database (if using local PostgreSQL)
docker-compose exec postgres pg_dump -U bookscanner bookscanner > backup.sql

# Backup Redis data (if using local Redis)
docker-compose exec redis redis-cli BGSAVE
```

### Health checks
```bash
# Check application health
curl http://localhost/health

# Check metrics
curl http://localhost/metrics
```

## Troubleshooting

### Common issues:

1. **Port 80 already in use:**
   ```bash
   sudo netstat -tulpn | grep :80
   sudo systemctl stop apache2  # or nginx
   ```

2. **Permission denied:**
   ```bash
   sudo chown -R $USER:$USER /srv/bookscanner
   ```

3. **Environment variables not loaded:**
   - Check `.env` file exists and has correct format
   - Restart services: `docker-compose restart`

4. **Database connection issues:**
   - Verify `POSTGRES_URL` is correct
   - Check if database allows connections from your server IP

### Useful commands:

```bash
# Restart all services
docker-compose restart

# Stop all services
docker-compose down

# Remove all containers and volumes
docker-compose down -v

# View resource usage
docker stats

# Access container shell
docker-compose exec backend bash
```

## Security Considerations

1. **Change default secrets** in `.env` file
2. **Use strong passwords** for admin tokens
3. **Enable firewall** and only allow necessary ports
4. **Regular updates** of Docker images and system packages
5. **Monitor logs** for suspicious activity
6. **Use HTTPS** in production

## Performance Optimization

1. **Enable gzip compression** in Nginx
2. **Set up Redis caching** for better performance
3. **Monitor resource usage** with `docker stats`
4. **Scale services** if needed with multiple replicas

## Support

For issues and questions:
1. Check the logs: `docker-compose logs -f`
2. Verify environment variables
3. Test individual services
4. Check network connectivity
