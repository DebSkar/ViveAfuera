@echo off
title Vive Afuera - Servidor con QR Global (Sin necesidad de mismo WiFi)
cd /d "%~dp0"

echo =======================================================================
echo               VIVE AFUERA - EXPERIENCIA INTERACTIVA
echo =======================================================================
echo.
echo Iniciando servidor con Tunel Publico Seguro...
echo El codigo QR funcionara para cualquier celular (4G/5G o cualquier WiFi).
echo.

start "" "http://localhost:8443/exp"
node server.js --tunnel
pause
