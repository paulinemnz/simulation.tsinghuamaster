# Fix Backend Startup Issue

## The Problem
The backend server at `http://localhost:3001/health` is not responding because the backend process is not running.

## Solution: Start Backend Manually

### Step 1: Open a New PowerShell Terminal

**Important:** Open a **NEW** PowerShell terminal window (don't use the one running frontend).

### Step 2: Navigate to Backend Directory

```powershell
cd "C:\Pauline\qinghua\year three\thesis\mid thesis defense\Cursor 2\backend"
```

### Step 3: Start the Backend Server

```powershell
npm run dev
```

### Step 4: Wait for Success Message

You should see:
```
✅ Server running on port 3001
   Environment: development
   Health check: http://localhost:3001/health
```

**Keep this terminal window open!** The backend must keep running.

---

## Alternative: Use the Startup Script

In a **NEW** PowerShell terminal:

```powershell
cd "C:\Pauline\qinghua\year three\thesis\mid thesis defense\Cursor 2"
.\start-backend.ps1
```

---

## Verify It's Working

Once you see the "Server running" message:

1. **Open your browser** and go to: `http://localhost:3001/health`
2. **You should see:** `{"status":"ok","timestamp":"..."}`
3. **Then go to:** `http://localhost:3000` (your frontend)
4. **The simulation should now work!**

---

## If Backend Still Won't Start

### Check for Errors

Look at the terminal output. Common issues:

1. **Port 3001 already in use:**
   - Find and kill the process: `netstat -ano | findstr ":3001"`
   - Or change port in `backend/.env`: `PORT=3002`

2. **Database connection error:**
   - Make sure PostgreSQL is running: `netstat -ano | findstr ":5432"`
   - If not, start it: `docker-compose up -d postgres`

3. **Missing dependencies:**
   - Run: `cd backend && npm install`

4. **TypeScript compilation errors:**
   - The server should still start with `npm run dev` (uses ts-node-dev)
   - Check terminal for specific error messages

---

## Quick Checklist

- [ ] Backend terminal is open and running `npm run dev`
- [ ] You see "✅ Server running on port 3001"
- [ ] `http://localhost:3001/health` returns JSON
- [ ] Frontend terminal is also running (port 3000)
- [ ] Browser can access `http://localhost:3000`

Once all checked, your simulation should work!
