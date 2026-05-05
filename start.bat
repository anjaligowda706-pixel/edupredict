@echo off
echo ════════════════════════════════════
echo   EduPredict AI v2 - Aurora Edition
echo ════════════════════════════════════
cd /d "%~dp0backend"
npm install --silent
echo.
echo   URL: http://localhost:5000
echo   admin@school.edu  / admin123
echo   sarah@school.edu  / teacher123
echo   alice@school.edu  / student123
echo.
node server.js
pause
