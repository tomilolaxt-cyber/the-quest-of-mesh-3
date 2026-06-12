@echo off
title The Quest of Mesh 3
echo ============================================
echo   THE QUEST OF MESH 3 - Open World
echo ============================================
python --version >nul 2>&1
if %errorlevel% neq 0 (set PY=py) else (set PY=python)
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:6902"
%PY% server.py
pause
