@echo off
echo.
echo ╔══════════════════════════════════════╗
echo ║     DocuMind – RAG Intelligence      ║
echo ╚══════════════════════════════════════╝
echo.

if not exist backend\.env (
    echo Setting up environment...
    copy backend\.env.example backend\.env
    echo.
    echo IMPORTANT: Open backend\.env and replace "your_groq_api_key_here"
    echo with your actual Groq API key from https://console.groq.com/keys
    echo.
    pause
)

echo Installing backend dependencies...
cd backend
call npm install --silent
cd ..

echo Installing frontend dependencies...
cd frontend
call npm install --silent
cd ..

echo.
echo Starting DocuMind...
echo Backend  -^>  http://localhost:5000
echo Frontend -^>  http://localhost:3000
echo.

start "DocuMind Backend" cmd /k "cd backend && npm start"
timeout /t 3 /nobreak >nul
cd frontend && npm start
