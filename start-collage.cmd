@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\.bin\vite.cmd" (
  echo Dependencies are missing. Run pnpm install first.
  pause
  exit /b 1
)

start "Collage Dev Server" cmd /k "node_modules\.bin\vite.cmd --host 127.0.0.1 --port 4173"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:4173/collage/"

