@echo off
chcp 65001 >nul
title AI简历分析师 - 本地预览服务
color 0A

echo ============================================
echo    AI简历分析师 - 本地预览服务启动中...
echo ============================================
echo.

cd /d %~dp0

REM 检查 Python 是否可用
where python >nul 2>nul
if %errorlevel%==0 (
    echo [1/2] 启动本地Web服务器...
    start "AI简历分析师 - 本地服务" cmd /c "python -m http.server 8080"
    timeout /t 2 /nobreak >nul
    
    echo [2/2] 在浏览器中打开页面...
    start http://localhost:8080/index.html
    
    echo.
    echo ============================================
    echo    服务已启动！
    echo    访问地址: http://localhost:8080/index.html
    echo.
    echo    关闭此窗口将停止服务
    echo ============================================
    echo.
    pause
) else (
    echo [错误] 未检测到 Python，请先安装 Python 3
    echo.
    echo 下载地址: https://www.python.org/downloads/
    echo.
    echo 安装后请重新运行此脚本
    pause
)
