# Backend Status Check and Startup Script
# This script checks backend status and helps start it if needed

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend Status Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$backendPath = Join-Path $PSScriptRoot "backend"
$envPath = Join-Path $backendPath ".env"

# Step 1: Check if port 3001 is in use
Write-Host "Step 1: Checking if backend is running on port 3001..." -ForegroundColor Yellow
$portCheck = netstat -ano | findstr ":3001"
if ($portCheck) {
    Write-Host "  ✓ Port 3001 is in use - backend may be running" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Testing health endpoint..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✓ Backend is responding! Status: OK" -ForegroundColor Green
            Write-Host ""
            Write-Host "Backend is running successfully!" -ForegroundColor Green
            Write-Host "You can now click 'Begin Simulation' on the landing page." -ForegroundColor Green
            exit 0
        }
    } catch {
        Write-Host "  ✗ Port 3001 is in use but backend is not responding" -ForegroundColor Red
        Write-Host "  This might be another process. Checking process..." -ForegroundColor Yellow
    }
} else {
    Write-Host "  ✗ Port 3001 is not in use - backend is not running" -ForegroundColor Red
}

Write-Host ""

# Step 2: Check if .env file exists
Write-Host "Step 2: Checking for .env file..." -ForegroundColor Yellow
if (Test-Path $envPath) {
    Write-Host "  ✓ .env file exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ .env file not found" -ForegroundColor Red
    Write-Host "  Creating .env file with default configuration..." -ForegroundColor Yellow
    
    $envContent = @"
DATABASE_URL=postgresql://sim_user:sim_password@localhost:5432/simulation_db
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your-secret-key-change-in-production
"@
    
    Set-Content -Path $envPath -Value $envContent
    Write-Host "  ✓ Created .env file" -ForegroundColor Green
}

Write-Host ""

# Step 3: Check if PostgreSQL is running
Write-Host "Step 3: Checking PostgreSQL status..." -ForegroundColor Yellow
$postgresCheck = netstat -ano | findstr ":5432"
if ($postgresCheck) {
    Write-Host "  ✓ PostgreSQL appears to be running on port 5432" -ForegroundColor Green
} else {
    Write-Host "  ⚠ PostgreSQL may not be running on port 5432" -ForegroundColor Yellow
    Write-Host "  If you're using Docker, start it with: docker-compose up -d postgres" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Check if node_modules exists
Write-Host "Step 4: Checking dependencies..." -ForegroundColor Yellow
if (Test-Path (Join-Path $backendPath "node_modules")) {
    Write-Host "  ✓ Dependencies are installed" -ForegroundColor Green
} else {
    Write-Host "  ✗ Dependencies not found" -ForegroundColor Red
    Write-Host "  Installing dependencies..." -ForegroundColor Yellow
    Set-Location $backendPath
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
}

Write-Host ""

# Step 5: Start the backend
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting server on http://localhost:3001..." -ForegroundColor Green
Write-Host "Look for: '✅ Server running on port 3001'" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

Set-Location $backendPath
npm run dev
