# Backend Connection Issue - Fixed

## Problem Identified

The frontend was showing "Backend server appears to be offline" even when the backend was running. This was caused by:

1. **Hardcoded localhost URL**: The frontend health check was hardcoded to `http://localhost:3001/health` instead of using the configured `REACT_APP_API_URL` environment variable.

2. **Production incompatibility**: In production, `localhost` won't work because:
   - The frontend runs in the user's browser
   - The backend runs on a remote server
   - `localhost` from the browser refers to the user's computer, not the server

## Fixes Applied

### 1. Dynamic API URL in Health Check
**File**: `frontend/src/components/LandingPage/LandingPage.tsx`

**Before:**
```typescript
const response = await fetch('http://localhost:3001/health', {
```

**After:**
```typescript
const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const healthUrl = apiBaseUrl.replace(/\/api\/?$/, '') + '/health';
const response = await fetch(healthUrl, {
```

### 2. Dynamic Error Messages
**Files**: 
- `frontend/src/components/LandingPage/LandingPage.tsx`
- `frontend/src/services/api.ts`

**Before:**
```typescript
errorMessage = 'Cannot connect to the server. Please ensure the backend server is running on http://localhost:3001';
```

**After:**
```typescript
const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const backendUrl = apiBaseUrl.replace(/\/api\/?$/, '');
errorMessage = `Cannot connect to the server. Please ensure the backend server is running on ${backendUrl}`;
```

### 3. Updated Docker Compose Default
**File**: `docker-compose.prod.yml`

**Before:**
```yaml
REACT_APP_API_URL: ${REACT_APP_API_URL:-http://localhost:3001}
```

**After:**
```yaml
REACT_APP_API_URL: ${REACT_APP_API_URL:-http://localhost:3001/api}
```

## How It Works Now

1. **Development**: Uses `http://localhost:3001/api` (default)
2. **Production**: Uses the `REACT_APP_API_URL` from `.env` file (e.g., `https://api.simulation.tsinghuamaster.edu/api`)

The frontend now:
- Checks backend health using the correct URL
- Shows the correct backend URL in error messages
- Works in both development and production environments

## Testing

### Local Testing
```bash
# Backend should be accessible
curl http://localhost:3001/health

# Frontend should show backend as online
# Open http://localhost:3000 in browser
```

### Production Testing
1. Set `REACT_APP_API_URL` in `.env`:
   ```
   REACT_APP_API_URL=https://api.your-domain.com/api
   ```

2. Rebuild frontend:
   ```bash
   docker-compose -f docker-compose.prod.yml build frontend
   docker-compose -f docker-compose.prod.yml up -d frontend
   ```

3. Verify:
   - Frontend should connect to production backend
   - No "backend offline" warnings
   - Error messages show correct production URL

## Prevention for Production Deployment

### ✅ Checklist Before Production

- [ ] **Set `REACT_APP_API_URL` in `.env`**:
  ```
  REACT_APP_API_URL=https://api.your-production-domain.com/api
  ```

- [ ] **Set `CORS_ORIGIN` in `.env`**:
  ```
  CORS_ORIGIN=https://your-production-domain.com
  ```

- [ ] **Rebuild frontend** after changing `REACT_APP_API_URL`:
  ```bash
  docker-compose -f docker-compose.prod.yml build frontend
  ```

- [ ] **Test connection** before going live:
  ```bash
  # From your local machine, test production backend
  curl https://api.your-production-domain.com/health
  ```

- [ ] **Verify in browser**:
  - Open production frontend URL
  - Check browser console for any connection errors
  - Verify backend health check passes

### Common Issues

#### Issue: Frontend still shows "backend offline" in production

**Causes:**
1. `REACT_APP_API_URL` not set correctly
2. Frontend not rebuilt after changing environment variable
3. CORS not configured correctly
4. Backend not accessible from internet

**Solutions:**
1. Check `.env` file has correct `REACT_APP_API_URL`
2. Rebuild frontend: `docker-compose build frontend`
3. Check `CORS_ORIGIN` matches frontend domain
4. Verify backend is accessible: `curl https://api.your-domain.com/health`

#### Issue: CORS errors in browser console

**Solution:**
- Ensure `CORS_ORIGIN` in backend `.env` matches frontend domain exactly
- Include protocol: `https://your-domain.com` (not just `your-domain.com`)
- Rebuild backend if changed: `docker-compose build backend`

## Summary

✅ **Fixed**: Frontend now uses dynamic API URL instead of hardcoded localhost
✅ **Fixed**: Error messages show correct backend URL
✅ **Fixed**: Works in both development and production
✅ **Prevented**: This issue won't occur in production if `REACT_APP_API_URL` is set correctly

The application is now ready for production deployment without backend connection issues!
