@echo off
chcp 65001 >nul
title AI简历分析师 - 查找并启动
color 0B

echo ============================================
echo.
echo    正在查找 Node.js 安装位置...
echo.
echo ============================================
echo.

REM 尝试在常见位置查找Node.js
set NODE_PATH=

if exist "C:\Program Files\nodejs\node.exe" set NODE_PATH=C:\Program Files\nodejs\node.exe
if exist "C:\Program Files (x86)\nodejs\node.exe" set NODE_PATH=C:\Program Files (x86)\nodejs\node.exe

REM 查找用户目录下的nodejs
for /d %%d in ("%USERPROFILE%\AppData\Local\nodejs*") do (
    if exist "%%d\node.exe" set NODE_PATH=%%d\node.exe
)

REM 查找nvm安装的node
for /d %%d in ("%USERPROFILE%\AppData\Roaming\nvm\v*") do (
    if exist "%%d\node.exe" set NODE_PATH=%%d\node.exe
)

if exist "%ProgramFiles%\nodejs\node.exe" set NODE_PATH=%ProgramFiles%\nodejs\node.exe

if "%NODE_PATH%"=="" (
    echo [提示] 未自动找到 Node.js，但可能是已安装在其他位置。
    echo.
    echo [解决方案]
    echo.
    echo 方案1: 重启电脑
    echo   很多情况下，安装Node.js后需要重启才能在终端识别
    echo   重启后重新双击此脚本
    echo.
    echo 方案2: 添加环境变量
    echo   1. 右键"此电脑" - 属性
    echo   2. 高级系统设置 - 环境变量
    echo   3. 在 Path 中添加 Node.js 安装目录
    echo   4. 重启电脑后重新运行
    echo.
    echo 方案3: 重新安装 Node.js
    echo   访问 https://nodejs.org/zh-cn 下载安装
    echo   安装时确保勾选"Add to PATH"选项
    echo.
    echo ============================================
    echo.
    echo   如果不想折腾，可以先用"演示模式"体验：
    echo   直接双击 index.html 即可在浏览器打开
    echo.
    echo ============================================
    echo.
    pause
    exit /b
)

echo [✓] 找到 Node.js: %NODE_PATH%
echo.

for /f "tokens=*" %%i in ('"%NODE_PATH%" --version') do set NODE_VER=%%i
echo     Node.js 版本: %NODE_VER%
echo.

cd /d %~dp0

echo [步骤1] 检查/安装依赖...
if not exist "node_modules" (
    echo     首次运行，正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [✗] 依赖安装失败，请检查网络后重试
        pause
        exit /b
    )
) else (
    echo     依赖已安装，跳过...
)

echo.
echo [步骤2] 启动服务器...
echo.
echo     ============================================
echo     服务已启动！
echo     请在浏览器访问:
echo     http://localhost:3000
echo     ============================================
echo.
echo     按 Ctrl+C 可停止服务器
echo.

start http://localhost:3000
call node server.js
