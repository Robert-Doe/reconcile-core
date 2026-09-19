@echo off
REM run.bat — one-command launcher for the XSS lab on Windows.
REM Creates a venv on first run, installs Flask, then starts the server.

setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [run] Creating virtual environment...
    py -3 -m venv .venv || python -m venv .venv
    echo [run] Installing dependencies...
    ".venv\Scripts\python.exe" -m pip install --quiet --upgrade pip
    ".venv\Scripts\python.exe" -m pip install --quiet -r requirements.txt
)

echo [run] Starting lab on http://localhost:5000  (Ctrl+C to stop)
".venv\Scripts\python.exe" lab_server.py
endlocal
