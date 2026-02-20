# Production Deployment Guide

This guide walks you through deploying the Tsinghua SEM Business Simulation Platform to production.

## Prerequisites

- Docker and Docker Compose installed
- Access to a production server
- PostgreSQL database (or use the included Docker PostgreSQL)
- Domain name configured (optional, for HTTPS)

## Step 1: Generate Secure Secrets

**CRITICAL**: Generate strong secrets before deployment!

```bash
# Option 1: Use the provided script
node generate-secrets.js

# Option 2: Generate manually
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

You'll need:
- `JWT_SECRET` - For user authentication tokens
- `ADMIN_SECRET` - For admin endpoint authentication

## Step 2: Create Environment File

Create a `.env` file in the project root with the following variables:

```bash
# Database Configuration
POSTGRES_USER=sim_user
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=simulation_db
POSTGRES_PORT=5432
DATABASE_URL=postgresql://sim_user:<password>@postgres:5432/simulation_db

# Backend Configuration
NODE_ENV=production
PORT=3001
BACKEND_PORT=3001

# Security - Use generated secrets!
JWT_SECRET=<generated-jwt-secret>
ADMIN_SECRET=<generated-admin-secret>
JWT_EXPIRES_IN=7d

# CORS Configuration - Set to your production frontend URL
CORS_ORIGIN=https://yourdomain.com

# Frontend Configuration
FRONTEND_PORT=3000
REACT_APP_API_URL=https://api.yourdomain.com

# DeepSeek API (only if using C1 mode)
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_MAX_TOKENS=300
```

**Important**: 
- Replace `<strong-password>` with a strong database password
- Replace `<generated-jwt-secret>` and `<generated-admin-secret>` with secrets from Step 1
- Replace `https://yourdomain.com` with your actual production URLs
- Never commit `.env` to version control!

## Step 3: Build and Start Services

```bash
# Build all images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

## Step 4: Run Database Migrations

```bash
# Run migrations inside the backend container
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

## Step 5: Verify Deployment

1. **Health Check**:
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

2. **Frontend**:
   ```bash
   curl http://localhost:3000
   # Should return HTML
   ```

3. **Backend API**:
   ```bash
   curl http://localhost:3001/api/health
   ```

## Step 6: Run Load Tests (Recommended)

Before going live with 100 participants, run load tests:

```bash
# Make sure backend is running
# Then run the load test
npm test -- tests/load/100-participants.test.ts
```

**Success Criteria**:
- Error rate < 5%
- P95 response time < 5 seconds
- Success rate > 95%

## Step 7: Configure Reverse Proxy (Optional but Recommended)

For production, use nginx or another reverse proxy with HTTPS:

### Example nginx configuration:

```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring

### Check Memory Usage
```bash
# Requires admin authentication
curl -H "Authorization: Bearer <admin-token>" http://localhost:3001/api/admin/memory
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Database Connection Pool Stats
Check backend logs for connection pool statistics.

## Troubleshooting

### Backend won't start
1. Check logs: `docker-compose -f docker-compose.prod.yml logs backend`
2. Verify DATABASE_URL is correct
3. Ensure PostgreSQL is healthy: `docker-compose -f docker-compose.prod.yml ps postgres`
4. Check JWT_SECRET is set

### Frontend can't connect to backend
1. Verify REACT_APP_API_URL matches your backend URL
2. Check CORS_ORIGIN matches your frontend URL
3. Ensure backend is running and healthy

### Database connection errors
1. Verify DATABASE_URL format: `postgresql://user:password@host:port/database`
2. Check PostgreSQL is running: `docker-compose -f docker-compose.prod.yml ps postgres`
3. Verify credentials match POSTGRES_USER and POSTGRES_PASSWORD

## Rollback Plan

If issues occur:

```bash
# Stop services
docker-compose -f docker-compose.prod.yml down

# Check logs
docker-compose -f docker-compose.prod.yml logs > deployment-logs.txt

# Restore previous version (if using version control)
git checkout <previous-version>

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

## Security Checklist

Before going live, verify:

- [ ] `JWT_SECRET` is a strong random secret (not default)
- [ ] `ADMIN_SECRET` is a strong random secret (not default)
- [ ] Database password is strong
- [ ] `CORS_ORIGIN` is set to production frontend URL
- [ ] `REACT_APP_API_URL` is set to production backend URL
- [ ] `.env` file is NOT committed to version control
- [ ] HTTPS is configured (if using reverse proxy)
- [ ] Database is not exposed to public internet
- [ ] Load tests passed successfully

## Post-Deployment

1. Monitor memory usage via `/api/admin/memory`
2. Monitor database connection pool usage
3. Check error logs regularly
4. Monitor response times
5. Track participant completion rates
