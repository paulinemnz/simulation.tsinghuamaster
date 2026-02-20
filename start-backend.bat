@echo off
echo Starting Backend Server...
echo.

cd backend

if not exist node_modules (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Failed to install dependencies!
        pause
        exit /b 1
    )
)

if not exist .env (
    echo Warning: .env file not found. Using default configuration.
    echo If you need database configuration, create a .env file with DATABASE_URL
)

echo.
echo Starting server on http://localhost:3001...
echo Press Ctrl+C to stop the server
echo.

call npm run dev

pause
