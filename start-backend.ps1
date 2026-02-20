# Backend Server Startup Script
# Run this script to start the backend server

Write-Host "Starting Backend Server..." -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
$backendPath = Join-Path $PSScriptRoot "backend"
Set-Location $backendPath

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found. Using default configuration." -ForegroundColor Yellow
    Write-Host "If you need database configuration, create a .env file with DATABASE_URL" -ForegroundColor Yellow
}

# Start the server
Write-Host ""
Write-Host "Starting server on http://localhost:3002..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

& npm.cmd run dev
