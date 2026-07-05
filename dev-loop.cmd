@echo off
cd /d "%~dp0"
title CashApp Dev Server
:loop
echo [%date% %time%] Iniciando npm run dev...
npm run dev
echo [%date% %time%] Servidor caiu. Reiniciando em 3 segundos...
timeout /t 3 /nobreak >nul
goto loop
