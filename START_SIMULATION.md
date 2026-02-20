# 🚀 Start Your Simulation - Simple Guide

## The Problem
You're seeing **ERR_CONNECTION_REFUSED** because the **backend server is not running**.

The frontend (port 3000) is trying to connect to the backend (port 3001), but nothing is listening there.

## Solution: Start Both Servers

### Method 1: Use the Scripts (Recommended)

**Terminal 1 - Backend:**
```powershell
cd "C:\Pauline\qinghua\year three\thesis\mid thesis defense\Cursor 2"
.\start-backend.ps1
```

Wait until you see: `✅ Server running on port 3001`

**Terminal 2 - Frontend (NEW terminal, keep Terminal 1 open):**
```powershell
cd "C:\Pauline\qinghua\year three\thesis\mid thesis defense\Cursor 2"
.\start-frontend.ps1
```

Browser will open automatically to `http://localhost:3000`

---

### Method 2: Manual Commands

**Terminal 1 - Backend:**
```powershell
cd "C:\Pauline\qinghua\year three\thesis\mid thesis defense\Cursor 2\backend"
npm run dev
```

**Terminal 2 - Frontend (NEW terminal):**
```powershell
cd "C:\Pauline\qinghua\year three\thesis\mid thesis defense\Cursor 2\frontend"
npm start
```

---

## Verify It's Working

1. **Backend Health Check:**
   - Open: http://localhost:3001/health
   - Should show: `{"status":"ok","timestamp":"..."}`

2. **Frontend:**
   - Open: http://localhost:3000
   - Should show landing page with "Terraform Industries"

3. **Both terminals should be running:**
   - Terminal 1: Backend on port 3001
   - Terminal 2: Frontend on port 3000

---

## If Backend Won't Start

Run the diagnostic script:
```powershell
.\check-backend-status.ps1
```

This will:
- Check if backend is already running
- Verify database connection
- Check dependencies
- Start backend if everything is OK

---

## Important Notes

- **Keep both terminals open** while using the simulation
- **Backend must start first** before frontend
- **Don't close the terminals** - they need to keep running
- Press `Ctrl+C` in a terminal to stop that server

---

## Quick Status Check

**Check if servers are running:**
```powershell
# Check backend (port 3001)
netstat -ano | findstr ":3001"

# Check frontend (port 3000)  
netstat -ano | findstr ":3000"
```

If you see output, the server is running. If not, start it using the methods above.
