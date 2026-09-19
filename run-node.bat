@echo off
REM run-node.bat — launch the lab under Node (zero dependencies, no npm install).
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
    echo [run-node] Node.js not found on PATH. Install it from https://nodejs.org
    exit /b 1
)
echo [run-node] Starting lab on http://localhost:5000  (Ctrl+C to stop)
node server.js
endlocal
