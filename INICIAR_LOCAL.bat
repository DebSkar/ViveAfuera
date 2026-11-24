@echo off
title Vive Afuera - Servidor Local (Mismo WiFi)
cd /d "%~dp0"

echo =======================================================================
echo               VIVE AFUERA - MODO RED LOCAL (WIFI)
echo =======================================================================
echo.
echo Iniciando servidor local en puerto 8443...
echo.

start "" "https://localhost:8443/exp"
node server.js
pause
