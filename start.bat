@echo off
cd /d "%~dp0"

netstat -ano | findstr ":5173" | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo Planner server is already running.
) else (
    echo Starting CFA Planner server...
    start "CFA Planner Server" cmd /k npm run dev
    timeout /t 6 /nobreak >nul
)

start "" "http://localhost:5173"
