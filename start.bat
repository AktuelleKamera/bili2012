@echo off
title BiliClassic Web
cd /d "%~dp0demo"

if not exist "node_modules\iconv-lite" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo.
    echo Failed to install dependencies. Please install Node.js first.
    pause
    exit /b 1
  )
)

if not defined PORT set PORT=8080
if not defined PUBLIC_ORIGIN set PUBLIC_ORIGIN=http://localhost:%PORT%

echo Starting BiliClassic Web...
start "" cmd /c "timeout /t 2 >nul && start %PUBLIC_ORIGIN%"
node server.js
pause
