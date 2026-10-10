@echo off
setlocal
cd /d "%~dp0"
title Totally Working - Local Demo
echo Totally Working: http://localhost:8000
echo Keep this window open while using the demo.
where py >nul 2>nul
if not errorlevel 1 (
  py -3 scripts\serve.py --open
) else (
  where python >nul 2>nul
  if errorlevel 1 (
    echo Python 3 was not found. Install Python 3, then try again.
  ) else (
    python scripts\serve.py --open
  )
)
pause
