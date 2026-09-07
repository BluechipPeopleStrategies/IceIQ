@echo off
cd /d "%~dp0..\.."
node tools\daily-tracker\rinkreads-server.mjs
pause
