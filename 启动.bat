@echo off
chcp 65001 >nul
title AI简历分析师 - 启动器
color 0A

echo.
echo  ============================================
echo    AI简历分析师 - 一键启动
echo  ============================================
echo.

cd /d "%~dp0"

echo  [1/4] 检查 Node.js 环境...
where node >nul 2>nul
if %errorlevel%==0 (
    for /f "tokens=*" %%v in ('node --version') do set "NV=%%v"
    echo        Node.js %NV%
) else (
    echo.
    echo  [错误] 未检测到 Node.js
    echo  请先安装 Node.js: https://nodejs.org/zh-cn
    echo.
    pause
    exit /b 1
)

echo.
echo  [2/4] 检查端口占用...
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>nul
if %errorlevel%==0 (
    echo        端口3000已被占用，正在释放...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
        taskkill /PID %%p /F >nul 2>nul
    )
    timeout /t 2 /nobreak >nul
    echo        端口已释放
) else (
    echo        端口3000可用
)

echo.
echo  [3/4] 检查依赖包...
if not exist "node_modules" (
    echo        首次运行，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo        依赖安装失败，请检查网络
        pause
        exit /b 1
    )
    echo        依赖安装完成！
) else (
    echo        依赖已就绪
)

echo.
echo  [4/4] 启动服务器...
echo.
echo  ============================================
echo    服务已启动！
echo    请在浏览器访问:
echo    http://localhost:3000
echo  ============================================
echo.
echo  按 Ctrl+C 可停止服务器
echo  关闭此窗口也会停止服务器
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

node server.js
if %errorlevel% neq 0 (
    echo.
    echo  [错误] 服务器启动失败
    echo.
    pause
)
