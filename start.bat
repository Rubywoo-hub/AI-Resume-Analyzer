@echo off
chcp 65001 >nul
title AI Resume Analyzer
color 0A

echo.
echo  ============================================
echo    AI Resume Analyzer - Starting...
echo  ============================================
echo.

cd /d "%~dp0"

echo  [1/4] Checking Node.js...
where node >nul 2>nul
if %errorlevel%==0 (
    for /f "tokens=*" %%v in ('node --version') do set "NV=%%v"
    echo        Node.js %NV% [OK]
) else (
    echo.
    echo  [ERROR] Node.js not found!
    echo  Please install Node.js: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo.
echo  [2/4] Checking port 3000...
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>nul
if %errorlevel%==0 (
    echo        Port 3000 occupied, releasing...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
        taskkill /PID %%p /F >nul 2>nul
    )
    timeout /t 2 /nobreak >nul
    echo        Port released
) else (
    echo        Port 3000 available [OK]
)

echo.
echo  [3/4] Checking dependencies...
if not exist "node_modules" (
    echo        Installing npm packages...
    call npm install
    if %errorlevel% neq 0 (
        echo        Install failed!
        pause
        exit /b 1
    )
    echo        Dependencies installed [OK]
) else (
    echo        Dependencies ready [OK]
)

echo.
echo  [4/4] Starting server...
echo.
echo  ============================================
echo    Server started!
echo    Open your browser and visit:
echo    http://localhost:3000
echo  ============================================
echo.
echo    Press Ctrl+C to stop the server
echo    Do NOT close this window!
echo.

start http://localhost:3000

node server.js
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Server failed to start!
    echo.
    pause
)
