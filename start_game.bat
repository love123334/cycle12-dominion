@echo off
chcp 65001 >nul
echo ========================================================
echo   CYCLE 12: AGE OF DOMINION - 3D UNIVERSE ENGINE
echo ========================================================
start "" "http://localhost:8080"
node "%~dp0server.js"
pause
