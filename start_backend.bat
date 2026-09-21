@echo off
title Cancer Detection System - Neural Backend (Port 8001)
cd /d "%~dp0backend"
echo ================================================================
echo Starting Cancer Detection System Backend on port 8001...
echo ================================================================
"..\venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
pause
