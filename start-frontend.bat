@echo off
REM Frontend Server Startup Script
REM Run this script to start the frontend development server

echo Starting Frontend Server...
echo.

REM Navigate to frontend directory
cd frontend

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo Failed to install dependencies!
        exit /b 1
    )
)

REM Start the server
echo.
echo Starting React development server on http://localhost:3000...
echo The page will automatically open in your browser
echo Press Ctrl+C to stop the server
echo.

call npm start
