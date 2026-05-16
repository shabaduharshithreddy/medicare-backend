@echo off
echo.
echo ================================
echo   MediCare - Starting Server
echo ================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
  echo Installing dependencies (npm install)...
  call npm install
  echo.
)

echo Starting MediCare desktop app...
echo.
echo Web app URL: http://https://medicare-clinic-al61.onrender.com
echo.
echo Keep this window open while using the app!
echo Press Ctrl+C to stop the app
echo.

npm run desktop

pause
