@echo off
title Cancer Detection System - Frontend (Port 3002)
cd /d "%~dp0frontend"
echo ================================================================
echo Starting Cancer Detection System Frontend on port 3002...
echo ================================================================
npm run dev -- -p 3002
pause
