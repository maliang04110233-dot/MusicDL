@echo off
cd /d "C:\Users\59443\WorkBuddy\2026-06-06-19-21-10\music-downloader"
powershell -ExecutionPolicy Bypass -Command "$env:NODE_OPTIONS=''; $env:ELECTRON_RUN_AS_NODE=''; & 'node_modules\electron\dist\electron.exe' '.'"
