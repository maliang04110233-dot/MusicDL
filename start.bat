@echo off
set NODE_OPTIONS=
set ELECTRON_RUN_AS_NODE=
set ELECTRON_NO_ATTACH_CONSOLE=
set ELECTRON_ENABLE_LOGGING=
"%~dp0node_modules\electron\dist\electron.exe" . %*
