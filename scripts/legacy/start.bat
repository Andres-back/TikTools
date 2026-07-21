@echo off
title TikToolStream
set NODE_ENV=development
set JWT_SECRET=dev-secret-2026
set PORT=8081
set CORS_ORIGIN=http://localhost:8081
echo ========================================
echo  TikToolStream - Servidor
echo ========================================
echo.
echo  Puerto: %PORT%
echo  Login:  admin / Admin123!
echo.
echo  http://localhost:%PORT%
echo  http://localhost:%PORT%/app/dashboard
echo.
echo ========================================
node server-new.js
pause
