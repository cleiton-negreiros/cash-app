@echo off
echo Iniciando auto-restart do CashApp...
cd /d C:\cashApp
:loop
echo [%date% %time%] npm run dev >> .hermes\dev-autorestart.log
call npm run dev
echo [%date% %time%] processo encerrado, reiniciando em 2s... >> .hermes\dev-autorestart.log
timeout /t 2 >nul
goto loop
