@echo off
setlocal
if "%COMET_INSTALL_URL%"=="" set "COMET_INSTALL_URL=https://comet.fraio.cc/install.ps1"
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm '%COMET_INSTALL_URL%' | iex"
endlocal
