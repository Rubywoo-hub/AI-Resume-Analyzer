@echo off
chcp 65001 >nul
title AI简历分析师 - 完整启动指南
color 0A

echo ============================================
echo.
echo    AI简历分析师 - 完整启动指南
echo.
echo ============================================
echo.

cd /d %~dp0

echo [步骤1] 验证 Node.js 安装...
where node >nul 2>nul
if %errorlevel%==0 (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VER=%%i
    echo        Node.js 版本: %NODE_VER%
    echo        npm 版本: %NPM_VER%
    echo.
    echo [✓] Node.js 环境正常！
    echo.
    
    echo [步骤2] 安装项目依赖（首次运行可能需要几分钟）...
    echo        正在执行 npm install ...
    call npm install
    if %errorlevel%==0 (
        echo.
        echo [✓] 依赖安装成功！
        echo.
        
        echo [步骤3] 启动服务器...
        echo        服务器将运行在 http://localhost:3000
        echo.
        echo        按 Ctrl+C 可停止服务器
        echo.
        echo ============================================
        echo    服务启动后，请在浏览器访问：
        echo    http://localhost:3000
        echo ============================================
        echo.
        
        timeout /t 3 >nul
        start http://localhost:3000
        call node server.js
    ) else (
        echo.
        echo [✗] 依赖安装失败，请检查网络连接后重试
        echo.
        pause
    )
) else (
    echo.
    echo [✗] 未检测到 Node.js！
    echo.
    echo  请按以下步骤操作：
    echo  1. 重启电脑（重要！新安装的Node.js需要重启终端才能识别）
    echo  2. 重新双击运行此脚本
    echo.
    echo  如果仍然失败，请手动验证：
    echo  - 打开 cmd 或 PowerShell
    echo  - 输入: node --version
    echo  - 如果显示版本号则说明安装成功
    echo  - 如果没有，请重新安装 Node.js
    echo.
    echo  下载地址: https://nodejs.org/zh-cn
    echo  推荐版本: LTS 长期支持版
    echo.
    pause
)
