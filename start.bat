@echo off
TITLE Media Management System Startup

:: Kill any existing processes on ports 3000 and 5000
echo Killing any existing processes on ports 3000 and 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5000" ^| find "LISTENING"') do taskkill /F /PID %%a 2>nul

:: Create new terminal windows for each server
echo Starting backend server...
cd backend
start "Backend Server" cmd /k "color 0A && echo Starting Backend Server... && npm install && npm start"

:: Wait for backend to start
timeout /t 5 /nobreak > nul

echo Starting frontend server...
cd ../frontend
start "Frontend Server" cmd /k "color 0B && echo Starting Frontend Server... && npm install && npm start"

:: Display status message
echo.
echo Both servers are starting up...
echo Backend server is running on http://localhost:5000
echo Frontend server is running on http://localhost:3000
echo.
echo You can close this window after both servers are running.
echo To stop the servers, close their respective terminal windows.
pause 