@echo off
title DocuMind AI Studio - Offline Runner
echo ========================================================
echo   DocuMind AI Studio - Running Locally Without Internet
echo ========================================================
echo.
echo [1/2] Starting Frontend Studio (Vite on http://localhost:5173)...
cd /d "%~dp0frontend"
start "DocuMind Studio" cmd /k "npm run dev"

echo [2/2] Waiting for local server to spin up...
timeout /t 3 /nobreak >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173
echo.
echo ========================================================
echo   DocuMind AI Studio is running!
echo   - URL: http://localhost:5173
echo   - 100%% Offline RAG Vector Search: ACTIVE
echo   - Offline 1-on-1 Voice Lessons: ACTIVE (WebSpeech API)
echo   - Offline Interactive Practice Quizzes: ACTIVE
echo   - Offline PDF Document Ingestion: ACTIVE
echo ========================================================
echo You can minimize this window. Close the Vite window to stop.
pause
