# Quick Production Deployment Reference

## 🚀 Fastest Path to Production

### Option 1: DigitalOcean (Recommended for Beginners)

1. **Create Droplet** (5 min)
   - Ubuntu 22.04 LTS
   - 4GB RAM / 2 vCPU (~$24/month)
   - Add SSH key

2. **SSH and Install Docker** (5 min)
   ```bash
   ssh root@your-server-ip
   curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
   apt install docker-compose-plugin -y
   ```

3. **Deploy Application** (10 min)
   ```bash
   git clone <your-repo> simulation-platform
   cd simulation-platform
   # Create .env with production values
   docker compose -f docker-compose.prod.yml build
   docker compose -f docker-compose.prod.yml up -d
   docker compose -f docker-compose.prod.yml exec backend npm run migrate
   ```

4. **Set Up SSL** (5 min)
   ```bash
   apt install nginx certbot python3-certbot-nginx -y
   # Configure Nginx (see PRODUCTION_DEPLOYMENT.md)
   certbot --nginx -d your-domain.com -d api.your-domain.com
   ```

**Total Time: ~25 minutes**

---

### Option 2: Railway.app (Easiest, No Server Management)

1. Sign up at railway.app
2. Connect GitHub repository
3. Add environment variables in dashboard
4. Deploy (automatic SSL included)

**Total Time: ~10 minutes**

---

### Option 3: Render.com (Free Tier Available)

1. Sign up at render.com
2. Create Web Service → Connect GitHub
3. Configure build/start commands
4. Add environment variables
5. Deploy (automatic SSL included)

**Total Time: ~15 minutes**

---

## 📋 Pre-Deployment Checklist

- [ ] Domain name ready (e.g., `simulation.tsinghuamaster.edu`)
- [ ] Secrets generated: `node generate-secrets.js`
- [ ] `.env` file prepared with production values
- [ ] Cloud provider account created
- [ ] SSH access configured (if using VPS)

---

## 🔑 Critical Environment Variables

```bash
# Generate these first:
node generate-secrets.js

# Then set in .env:
JWT_SECRET=<generated-secret>
ADMIN_SECRET=<generated-secret>
POSTGRES_PASSWORD=<strong-password>
CORS_ORIGIN=https://your-domain.com
REACT_APP_API_URL=https://api.your-domain.com
```

---

## 🌐 DNS Setup

Point your domain to your server IP:

```
A Record: simulation.tsinghuamaster.edu → YOUR_SERVER_IP
A Record: api.simulation.tsinghuamaster.edu → YOUR_SERVER_IP
```

---

## ✅ Post-Deployment Verification

```bash
# Check services
docker compose -f docker-compose.prod.yml ps

# Test endpoints
curl https://your-domain.com
curl https://api.your-domain.com/health
```

---

## 📚 Full Documentation

- **Detailed Guide**: See `PRODUCTION_DEPLOYMENT.md`
- **Local Testing**: See `DEPLOYMENT_GUIDE.md`
- **Load Testing**: See `LOAD_TEST_GUIDE.md`

---

## 💰 Cost Comparison

| Platform | Monthly Cost | Difficulty | SSL Included |
|----------|-------------|------------|--------------|
| DigitalOcean | $12-24 | Medium | Manual (Let's Encrypt) |
| Railway | $5-20 | Easy | ✅ Yes |
| Render | Free-$7 | Easy | ✅ Yes |
| AWS EC2 | $15-30 | Hard | Manual |
| Fly.io | $2-10 | Medium | ✅ Yes |

---

## 🆘 Quick Troubleshooting

**Services won't start?**
```bash
docker compose -f docker-compose.prod.yml logs
```

**Database connection error?**
- Check `DATABASE_URL` in `.env`
- Verify PostgreSQL container is running: `docker compose ps`

**Frontend can't reach backend?**
- Check `REACT_APP_API_URL` matches backend URL
- Check `CORS_ORIGIN` matches frontend URL

**SSL certificate issues?**
```bash
sudo certbot certificates
sudo certbot renew
```

---

## 🎯 Recommended Path

1. **Start with Railway/Render** for quick deployment
2. **Move to DigitalOcean** if you need more control
3. **Use AWS/Azure** for enterprise requirements

---

**Need help?** See `PRODUCTION_DEPLOYMENT.md` for detailed instructions.
