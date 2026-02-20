# Production Deployment Guide

This guide covers deploying the Tsinghua SEM Business Simulation Platform to a production cloud environment.

## Table of Contents

1. [Cloud Provider Options](#cloud-provider-options)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Deployment Options](#deployment-options)
   - [Option A: DigitalOcean Droplet](#option-a-digitalocean-droplet)
   - [Option B: AWS EC2](#option-b-aws-ec2)
   - [Option C: Azure VM](#option-c-azure-vm)
   - [Option D: Google Cloud Platform](#option-d-google-cloud-platform)
   - [Option E: Railway/Render/Fly.io](#option-e-managed-platforms)
4. [Domain & SSL Setup](#domain--ssl-setup)
5. [Post-Deployment](#post-deployment)

---

## Cloud Provider Options

### Recommended Platforms

1. **DigitalOcean Droplet** (Easiest)
   - Simple setup, good documentation
   - ~$12-24/month for basic setup
   - Good for small to medium deployments

2. **AWS EC2** (Most Flexible)
   - Industry standard, extensive features
   - Pay-as-you-go pricing
   - More complex setup

3. **Azure VM** (Enterprise)
   - Good integration with Microsoft services
   - Similar to AWS in complexity

4. **Google Cloud Platform** (GCP)
   - Good for containerized deployments
   - Competitive pricing

5. **Managed Platforms** (Easiest, but less control)
   - Railway.app
   - Render.com
   - Fly.io
   - Heroku (if available)

---

## Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Domain name registered (e.g., `simulation.tsinghuamaster.edu`)
- [ ] Cloud provider account created
- [ ] SSH access configured
- [ ] Strong secrets generated (`JWT_SECRET`, `ADMIN_SECRET`, database password)
- [ ] Production environment variables prepared
- [ ] SSL certificate plan (Let's Encrypt recommended)

---

## Deployment Options

### Option A: DigitalOcean Droplet

#### Step 1: Create Droplet

1. Log in to DigitalOcean
2. Create a new Droplet:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic plan, 2GB RAM / 1 vCPU minimum (4GB recommended for 100 participants)
   - **Region**: Choose closest to your users
   - **Authentication**: SSH keys (recommended) or password
   - **Hostname**: `simulation-server` (or your domain)

#### Step 2: Initial Server Setup

```bash
# SSH into your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Create non-root user (optional but recommended)
adduser deploy
usermod -aG docker deploy
usermod -aG sudo deploy

# Switch to deploy user
su - deploy
```

#### Step 3: Clone Repository

```bash
# Install Git if not present
sudo apt install git -y

# Clone your repository
git clone <your-repo-url> simulation-platform
cd simulation-platform

# Or upload files via SCP from your local machine:
# scp -r . deploy@your-server-ip:/home/deploy/simulation-platform
```

#### Step 4: Configure Environment

```bash
# Create .env file
nano .env
```

Add production environment variables:

```bash
# Database Configuration
POSTGRES_USER=sim_user
POSTGRES_PASSWORD=<strong-random-password>
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

# CORS Configuration - Your production domain
CORS_ORIGIN=https://simulation.tsinghuamaster.edu

# Frontend Configuration
FRONTEND_PORT=3000
REACT_APP_API_URL=https://api.simulation.tsinghuamaster.edu

# DeepSeek API (if using C1 mode)
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_MAX_TOKENS=300
```

**Generate secrets locally first:**
```bash
node generate-secrets.js
```

#### Step 5: Build and Deploy

```bash
# Build images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Run migrations
docker compose -f docker-compose.prod.yml exec backend npm run migrate

# Check status
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

#### Step 6: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

#### Step 7: Set Up Reverse Proxy with SSL

Install Nginx and Certbot:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Configure Nginx:

```bash
sudo nano /etc/nginx/sites-available/simulation
```

Add configuration:

```nginx
# Frontend
server {
    listen 80;
    server_name simulation.tsinghuamaster.edu;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API
server {
    listen 80;
    server_name api.simulation.tsinghuamaster.edu;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and get SSL certificate:

```bash
sudo ln -s /etc/nginx/sites-available/simulation /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d simulation.tsinghuamaster.edu -d api.simulation.tsinghuamaster.edu
```

Certbot will automatically configure HTTPS and redirect HTTP to HTTPS.

---

### Option B: AWS EC2

#### Step 1: Launch EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. Choose:
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance Type**: t3.medium (2 vCPU, 4GB RAM) minimum
   - **Key Pair**: Create or select existing SSH key
   - **Security Group**: Allow SSH (22), HTTP (80), HTTPS (443)
   - **Storage**: 20GB minimum

#### Step 2: Connect and Setup

```bash
# Connect via SSH
ssh -i your-key.pem ubuntu@your-ec2-ip

# Follow steps 2-7 from DigitalOcean guide above
# (Install Docker, clone repo, configure, deploy)
```

#### Step 3: Configure Security Group

In AWS Console:
1. EC2 → Security Groups → Select your instance's security group
2. Edit inbound rules:
   - SSH (22) from your IP
   - HTTP (80) from anywhere (0.0.0.0/0)
   - HTTPS (443) from anywhere (0.0.0.0/0)

#### Step 4: Optional - Use AWS RDS for Database

Instead of Docker PostgreSQL, use managed RDS:

1. Create RDS PostgreSQL instance
2. Update `DATABASE_URL` in `.env`:
   ```
   DATABASE_URL=postgresql://user:password@your-rds-endpoint:5432/simulation_db
   ```
3. Remove `postgres` service from `docker-compose.prod.yml`

---

### Option C: Azure VM

#### Step 1: Create VM

1. Azure Portal → Create Resource → Virtual Machine
2. Configure:
   - **Image**: Ubuntu Server 22.04 LTS
   - **Size**: Standard_B2s (2 vCPU, 4GB RAM)
   - **Authentication**: SSH public key
   - **Networking**: Allow SSH, HTTP, HTTPS ports

#### Step 2: Connect and Deploy

```bash
# Connect via SSH
ssh azureuser@your-vm-ip

# Follow steps 2-7 from DigitalOcean guide
```

---

### Option D: Google Cloud Platform

#### Step 1: Create VM Instance

1. GCP Console → Compute Engine → VM Instances → Create
2. Configure:
   - **Machine type**: e2-medium (2 vCPU, 4GB RAM)
   - **Boot disk**: Ubuntu 22.04 LTS
   - **Firewall**: Allow HTTP and HTTPS traffic
   - **SSH Keys**: Add your public key

#### Step 2: Connect and Deploy

```bash
# Connect via SSH (GCP provides web SSH or use gcloud)
gcloud compute ssh your-instance-name --zone=your-zone

# Follow steps 2-7 from DigitalOcean guide
```

---

### Option E: Managed Platforms

#### Railway.app

1. Sign up at railway.app
2. Create new project → Deploy from GitHub
3. Add environment variables in Railway dashboard
4. Railway handles SSL automatically

#### Render.com

1. Sign up at render.com
2. Create new Web Service → Connect GitHub repo
3. Configure:
   - **Build Command**: `docker compose -f docker-compose.prod.yml build`
   - **Start Command**: `docker compose -f docker-compose.prod.yml up`
4. Add environment variables
5. Render provides SSL automatically

#### Fly.io

1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Launch: `fly launch`
4. Configure secrets: `fly secrets set JWT_SECRET=...`
5. Deploy: `fly deploy`

---

## Domain & SSL Setup

### DNS Configuration

Point your domain to your server:

1. **A Record** (Frontend):
   ```
   simulation.tsinghuamaster.edu → YOUR_SERVER_IP
   ```

2. **A Record** (Backend API):
   ```
   api.simulation.tsinghuamaster.edu → YOUR_SERVER_IP
   ```

   Or use CNAME if using a subdomain:
   ```
   api.simulation.tsinghuamaster.edu → simulation.tsinghuamaster.edu
   ```

### SSL Certificate (Let's Encrypt)

If using Nginx (as in DigitalOcean guide):

```bash
# Certbot will handle everything automatically
sudo certbot --nginx -d simulation.tsinghuamaster.edu -d api.simulation.tsinghuamaster.edu

# Auto-renewal is set up automatically
sudo certbot renew --dry-run  # Test renewal
```

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Test endpoints
curl https://simulation.tsinghuamaster.edu
curl https://api.simulation.tsinghuamaster.edu/health
```

### 2. Set Up Monitoring

#### Basic Monitoring Script

Create `/home/deploy/check-health.sh`:

```bash
#!/bin/bash
BACKEND_URL="https://api.simulation.tsinghuamaster.edu/health"
FRONTEND_URL="https://simulation.tsinghuamaster.edu"

# Check backend
if curl -f -s "$BACKEND_URL" > /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend is down!"
    # Send alert (email, Slack, etc.)
fi

# Check frontend
if curl -f -s "$FRONTEND_URL" > /dev/null; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend is down!"
fi
```

Make executable and add to crontab:

```bash
chmod +x check-health.sh
crontab -e
# Add: */5 * * * * /home/deploy/check-health.sh >> /var/log/health-check.log 2>&1
```

### 3. Set Up Log Rotation

```bash
# Configure Docker log rotation
sudo nano /etc/docker/daemon.json
```

Add:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

### 4. Backup Strategy

#### Database Backups

Create `/home/deploy/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/home/deploy/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql"

mkdir -p $BACKUP_DIR

docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U sim_user simulation_db > $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete

echo "Backup created: $BACKUP_FILE"
```

Schedule daily backups:

```bash
chmod +x backup-db.sh
crontab -e
# Add: 0 2 * * * /home/deploy/backup-db.sh >> /var/log/backup.log 2>&1
```

### 5. Update Deployment

When you need to update:

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Run migrations if needed
docker compose -f docker-compose.prod.yml exec backend npm run migrate

# Check logs
docker compose -f docker-compose.prod.yml logs -f
```

---

## Security Checklist

Before going live:

- [ ] Strong passwords/secrets (not defaults)
- [ ] Firewall configured (only necessary ports open)
- [ ] SSL/TLS enabled (HTTPS only)
- [ ] Database not exposed to public internet
- [ ] `.env` file secured (600 permissions: `chmod 600 .env`)
- [ ] Regular backups configured
- [ ] Monitoring/alerting set up
- [ ] SSH key authentication (disable password auth)
- [ ] Fail2ban installed (optional but recommended)
- [ ] Regular security updates enabled

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check specific service
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
docker compose -f docker-compose.prod.yml logs postgres
```

### Database Connection Issues

```bash
# Test database connection
docker compose -f docker-compose.prod.yml exec backend node -e "require('./dist/src/database/connection').pool.query('SELECT 1').then(() => console.log('Connected')).catch(e => console.error(e))"
```

### High Memory Usage

```bash
# Check memory usage
docker stats

# Check backend memory endpoint (requires admin auth)
curl -H "Authorization: Bearer <admin-token>" https://api.simulation.tsinghuamaster.edu/api/admin/memory
```

### SSL Certificate Issues

```bash
# Check certificate expiration
sudo certbot certificates

# Renew manually if needed
sudo certbot renew
```

---

## Cost Estimates

### DigitalOcean Droplet
- Basic (2GB RAM): ~$12/month
- Standard (4GB RAM): ~$24/month
- **Recommended**: 4GB for 100 participants

### AWS EC2
- t3.medium (4GB RAM): ~$30/month
- t3.small (2GB RAM): ~$15/month

### Azure VM
- Standard_B2s (4GB RAM): ~$30/month

### Managed Platforms
- Railway: ~$5-20/month (pay-as-you-go)
- Render: Free tier available, then ~$7/month per service
- Fly.io: ~$2-10/month

---

## Support

For issues:
1. Check logs: `docker compose -f docker-compose.prod.yml logs -f`
2. Review this guide's troubleshooting section
3. Check `DEPLOYMENT_GUIDE.md` for local deployment issues
4. Review `LOAD_TEST_GUIDE.md` for performance issues

---

## Next Steps

1. Choose your cloud provider
2. Follow the appropriate deployment option above
3. Set up domain and SSL
4. Configure monitoring and backups
5. Run load tests (see `LOAD_TEST_GUIDE.md`)
6. Go live! 🚀
