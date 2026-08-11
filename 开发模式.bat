@echo off
chcp 65001 > nul
echo [开发模式] 启动音乐下载器（含 DevTools）
set NODE_OPTIONS=
cd /d "%~dp0"
if not exist "%~dp0node_modules\electron\dist\electron.exe" (
    echo 安装依赖中...
    npm install
)
"%~dp0node_modules\electron\dist\electron.exe" . --dev
