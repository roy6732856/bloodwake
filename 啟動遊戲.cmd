@echo off
cd /d "%~dp0"
set "BLOODWAKE_NODE=node"
where node >nul 2>nul
if errorlevel 1 (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
    set "BLOODWAKE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  ) else (
    echo Please install Node.js from https://nodejs.org and run this file again.
    pause
    exit /b 1
  )
)
start "" "http://127.0.0.1:4173"
"%BLOODWAKE_NODE%" server.mjs
pause
