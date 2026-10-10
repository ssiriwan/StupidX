@echo off
title BossGuard 3000 - Starting AI Slack-off Server...
echo ========================================================
echo   BossGuard 3000 - Stupid Hackathon Edition
echo   Starting local server at http://localhost:8000
echo ========================================================
echo.
start "" http://localhost:8000
python server.py
pause
