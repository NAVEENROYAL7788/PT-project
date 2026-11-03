@echo off
title DocuMind AI Full Stack Launcher
echo ========================================================
echo   DocuMind AI Full Stack Launcher (All 3 Services)
echo ========================================================
echo.

echo [1/3] Starting Python AI Microservice (Port 5001)...
start "DocuMind AI Microservice" cmd /k "cd /d %~dp0ai-service && venv\Scripts\python.exe app.py"

echo [2/3] Starting Express Backend (Port 4000)...
start "DocuMind Backend" cmd /k "cd /d %~dp0backend && npm start"

echo [3/3] Starting React + Vite Frontend (Port 5173)...
start "DocuMind Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Waiting 4 seconds for services to initialize...
timeout /t 4 /nobreak >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173
echo.
echo ========================================================
echo   All 3 services are up and running!
echo   - Frontend:    http://localhost:5173
echo   - Backend API: http://localhost:4000
echo   - AI Service:  http://127.0.0.1:5001
echo ========================================================
pause
