@echo off
chcp 65001 > nul
echo.
echo  ╔══════════════════════════════════════╗
echo  ║    音乐下载器 - 调试模式（带日志）   ║
echo  ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: 清除旧日志
del /Q debug.log 2>nul

echo [*] 正在启动，错误信息会保存到 debug.log...
echo [*] 请等待程序退出后，把 debug.log 的内容复制发给我
echo.

:: 用 PowerShell 启动，并把所有输出重定向到日志
powershell -ExecutionPolicy Bypass -Command "$env:NODE_OPTIONS=''; $env:ELECTRON_RUN_AS_NODE=''; & 'node_modules\electron\dist\electron.exe' '.' 2>&1" > debug.log 2>&1

echo.
echo [*] 程序已退出
echo [*] 请打开 debug.log 文件，把内容复制发给我
echo.
pause
