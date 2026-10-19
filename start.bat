@echo off
title BiliClassic Web
cd /d "%~dp0demo"

if exist "%~dp0node.exe" (
  set "NODE_EXE=%~dp0node.exe"
) else (
  set "NODE_EXE=node"
)

if not exist "node_modules\iconv-lite" (
  echo Missing dependencies.
  echo Please use the portable release package.
  pause
  exit /b 1
)

if not defined PORT set PORT=8080
if not defined PUBLIC_ORIGIN set PUBLIC_ORIGIN=http://localhost:%PORT%

echo Starting BiliClassic Web...
start "" cmd /c "timeout /t 2 >nul && start %PUBLIC_ORIGIN%"
"%NODE_EXE%" server.js
pause
