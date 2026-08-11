@echo off
chcp 65001 > nul
echo.
echo  ╔══════════════════════════════════════╗
echo  ║        音乐下载器 - 启动脚本         ║
echo  ╚══════════════════════════════════════╝
echo.

:: 彻底清除冲突环境变量，避免 Electron 启动失败
set NODE_OPTIONS=
set ELECTRON_RUN_AS_NODE=
set ELECTRON_NO_ATTACH_CONSOLE=
set ELECTRON_ENABLE_LOGGING=

cd /d "%~dp0"

:: 使用 start 命令启动，避免控制台窗口阻塞
start "" "node_modules\electron\dist\electron.exe" "."
