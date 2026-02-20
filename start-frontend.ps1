# Frontend Server Startup Script
# Run this script to start the frontend development server

Write-Host "Starting Frontend Server..." -ForegroundColor Green
Write-Host ""

# Navigate to frontend directory
$frontendPath = Join-Path $PSScriptRoot "frontend"
Set-Location $frontendPath

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    & npm.cmd install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
}

# Start the server
Write-Host ""
Write-Host "Starting React development server on http://localhost:3000..." -ForegroundColor Green
Write-Host "The page will automatically open in your browser" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

& npm.cmd start
