# Quick Start Guide - Run Your Simulation

## Step 1: Start Backend Server

**Open a PowerShell terminal** and run:

```powershell
cd "C:\Pauline\qinghua\year three\thesis\mid thesis defense\Cursor 2"
.\start-backend.ps1
```

**OR** manually:
```powershell
cd backend
npm run dev
```

**Wait for:** `✅ Server running on port 3001`

**Keep this terminal open!**

---

## Step 2: Start Frontend Server

**Open a NEW PowerShell terminal** (keep backend terminal running) and run:

```powershell
cd "C:\Pauline\qinghua\year three\thesis\mid thesis defense\Cursor 2"
.\start-frontend.ps1
```

**OR** manually:
```powershell
cd frontend
npm start
```

**Wait for:** Browser to automatically open to `http://localhost:3000`

---

## Step 3: Access Your Simulation

1. Browser should open automatically to `http://localhost:3000`
2. If not, manually open: `http://localhost:3000`
3. You should see the landing page with "Terraform Industries"
4. Enter a participant ID
5. Select a mode (C0, C1, or C2)
6. Click **Begin Simulation**

---

## Troubleshooting

### Backend Not Starting?

1. **Check if port 3001 is free:**
   ```powershell
   netstat -ano | findstr ":3001"
   ```
   If something is using it, kill that process.

2. **Check database is running:**
   ```powershell
   netstat -ano | findstr ":5432"
   ```
   If not running, start PostgreSQL or use Docker:
   ```powershell
   docker-compose up -d postgres
   ```

3. **Check backend .env file exists:**
   ```powershell
   Test-Path backend\.env
   ```
   If missing, the startup script will create it automatically.

### Frontend Not Loading?

1. **Check if port 3000 is free:**
   ```powershell
   netstat -ano | findstr ":3000"
   ```

2. **Check backend is running:**
   - Open: `http://localhost:3001/health`
   - Should show: `{"status":"ok","timestamp":"..."}`

3. **Clear browser cache** and refresh

### Connection Refused Error?

This means the **backend is not running**. Follow Step 1 above to start it.

---

## Verify Everything Works

✅ **Backend:** http://localhost:3001/health → Should return JSON  
✅ **Frontend:** http://localhost:3000 → Should show landing page  
✅ **Both terminals running** → Backend on port 3001, Frontend on port 3000

---

## Quick Status Check

Run this script to check and start backend:
```powershell
.\check-backend-status.ps1
```

This will:
- Check if backend is running
- Verify database connection
- Create .env if needed
- Start backend if not running
