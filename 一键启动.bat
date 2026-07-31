@echo off
chcp 65001 >nul
title AI简历分析师 - 一键启动
color 0A

echo ============================================
echo.
echo    AI简历分析师 - 一键启动脚本
echo.
echo ============================================
echo.

cd /d %~dp0

REM 尝试用Edge打开
start "" "msedge" "file:///F:/vibecoding/case1/index.html"

REM 如果Edge不存在，尝试Chrome
if errorlevel 1 (
    start "" "chrome" "file:///F:/vibecoding/case1/index.html"
)

echo 正在打开浏览器...
echo.
echo 如果浏览器没有自动打开，请手动操作：
echo 1. 打开浏览器（Edge 或 Chrome）
echo 2. 按 Ctrl+O 打开文件
echo 3. 选择 f:\vibecoding\case1\index.html
echo.
timeout /t 3 >nul
