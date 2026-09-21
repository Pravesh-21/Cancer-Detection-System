@echo off
title Cancer Detection System Launcher
echo Launching Cancer Detection System Backend and Frontend in separate windows...
start "Cancer Detection Backend" "%~dp0start_backend.bat"
powershell -Command "Start-Sleep -Seconds 3"
start "Cancer Detection Frontend" "%~dp0start_frontend.bat"
echo Done! Both services are starting in their own dedicated windows.
