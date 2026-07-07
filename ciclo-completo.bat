@echo off
chcp 65001 >nul
cd /d "%~dp0"
title CashApp - Ciclo Completo (Ollama + Qwen + Aider + Opencode + Hermes)

set ROOT=C:\cashApp
set VENV=%ROOT%\.venv
set HERMES=%ROOT%\.hermes
set OLLAMA_HOST=http://127.0.0.1:11434

:menu
cls
echo =============================================
echo   CashApp - Ciclo Completo de Agentes
echo =============================================
echo   Ollama + Qwen 2.5-coder:32b
echo   Aider + Opencode + Hermes
echo =============================================
echo.
echo  1. Iniciar tudo (Ciclo Completo Automatico)
echo  2. Apenas Opencode (modo manual)
echo  3. Apenas Aider + Qwen (pair programming)
echo  4. Monitorar Hermes (revisao automatica)
echo  5. Dev server (npm run dev)
echo  6. Status do ciclo
echo  7. Sair
echo.
set /p opcao="Escolha: "

if "%opcao%"=="1" goto fullcycle
if "%opcao%"=="2" goto opencode
if "%opcao%"=="3" goto aider
if "%opcao%"=="4" goto monitor
if "%opcao%"=="5" goto dev
if "%opcao%"=="6" goto status
if "%opcao%"=="7" exit /b
goto menu

:: ─── Verifica/Ollama serve ────────────────────────
:check-ollama
echo [%time%] Verificando Ollama...
curl -s -o nul http://127.0.0.1:11434/api/tags
if %errorlevel% neq 0 (
  echo [%time%] Ollama parado. Iniciando servidor...
  start /B "" "ollama" serve >nul 2>&1
  timeout /t 5 /nobreak >nul
  echo [%time%] Ollama server iniciado em %OLLAMA_HOST%
) else (
  echo [%time%] Ollama ja rodando em %OLLAMA_HOST%
)
exit /b

:: ─── Verifica modelo Qwen ──────────────────────────
:check-model
echo [%time%] Verificando modelo qwen2.5-coder:32b...
ollama list 2>nul | findstr "qwen2.5-coder:32b" >nul
if %errorlevel% neq 0 (
  echo [%time%] Modelo nao encontrado. Baixando (19 GB)...
  ollama pull qwen2.5-coder:32b
) else (
  echo [%time%] Modelo qwen2.5-coder:32b ja disponivel.
)
exit /b

:: ─── CICLO COMPLETO ───────────────────────────────
:fullcycle
cls
echo =============================================
echo   Ciclo Completo Automatico
echo =============================================
echo.
call :check-ollama
call :check-model
echo.
echo [%time%] ========== CICLO COMPLETO ==========
echo [%time%] Etapa 1: opencode executa tarefas
echo [%time%] Etapa 2: opencode sinaliza .hermes/ready.md
echo [%time%] Etapa 3: Hermes revisa e escreve .hermes/review.md
echo [%time%] Etapa 4: opencode ajusta conforme review
echo [%time%] Etapa 5: Ciclo se repete ate aprovacao
echo.
echo [%time%] Iniciando opencode...
echo [%time%] Use opencode para planejar e executar tarefas.
echo [%time%] Quando precisar de codigo pesado, peca para usar Aider.
echo [%time%] Ao concluir, diga: "sinalizar para revisao do Hermes"
echo.

:: Remove sinalizacoes antigas
if exist "%HERMES%\ready.md" del "%HERMES%\ready.md"
if exist "%HERMES%\review.md" del "%HERMES%\review.md"

:: Inicia monitor Hermes em background
start /B "" "%~f0" --monitor-hermes

:: Inicia opencode interativo
opencode

echo.
echo [%time%] opencode encerrado.
echo [%time%] Verificando se Hermes deixou review pendente...
if exist "%HERMES%\review.md" (
  echo [%time%] REVIEW PENDENTE em .hermes\review.md
  echo [%time%] Reabra opencode e peca: "leia o review do Hermes e ajuste"
)
if exist "%HERMES%\ready.md" (
  echo [%time%] ready.md ainda existe - Hermes pode nao ter revisado
)
pause
goto menu

:: ─── OPENCODE ─────────────────────────────────────
:opencode
cls
echo =============================================
echo   Abrindo Opencode (modo manual)
echo =============================================
echo   Lembre-se: voce pode pedir para usar Aider+Qwen
echo   para implementar codigo pesado localmente.
echo.
echo   Quando concluir uma tarefa, diga:
echo     "sinalizar .hermes/ready.md para revisao do Hermes"
echo.
call :check-ollama
echo.
opencode
echo.
pause
goto menu

:: ─── AIDER ────────────────────────────────────────
:aider
cls
echo =============================================
echo   Aider + Qwen 2.5-coder:32b
echo =============================================
echo   Pair programming com IA local.
echo   Use para edicoes diretas no codigo.
echo.
echo   Dica: peca ao opencode para planejar,
echo   depois use aider para implementar.
echo.
call :check-ollama
call :check-model
echo.
echo Iniciando Aider...
call "%VENV%\Scripts\activate.bat"
aider --model ollama_chat/qwen2.5-coder:32b --no-show-model-warnings
echo.
pause
goto menu

:: ─── MONITOR HERMES ──────────────────────────────
:monitor
cls
echo =============================================
echo   Monitor Hermes - Revisao Automatica
echo =============================================
echo   Aguardando .hermes/ready.md...
echo   Quando opencode sinalizar, Hermes revisa.
echo   Pressione Ctrl+C para parar.
echo.
:monitor-loop
if exist "%HERMES%\ready.md" (
  echo [%time%] ready.md DETECTADO!
  echo [%time%] Conteudo:
  type "%HERMES%\ready.md"
  echo.
  echo [%time%] Hermes esta revisando...
  echo [%time%] Quando .hermes\review.md aparecer, reabra opencode
  echo     para ler e aplicar correcoes.
)
if exist "%HERMES%\review.md" (
  echo [%time%] review.md DETECTADO!
  echo [%time%] Review disponivel. Reabra opencode para processar.
)
timeout /t 10 /nobreak >nul
goto monitor-loop

:: ─── DEV SERVER ──────────────────────────────────
:dev
cls
echo =============================================
echo   Dev Server - CashApp
echo =============================================
npm run dev
echo.
pause
goto menu

:: ─── STATUS ──────────────────────────────────────
:status
cls
echo =============================================
echo   Status do Ciclo
echo =============================================
echo.
echo Ollama server:
curl -s http://127.0.0.1:11434/api/tags 2>nul | findstr "models" >nul && (
  echo   Status: RODANDO
  ollama list
) || (
  echo   Status: PARADO
)
echo.
echo Modelos baixados:
ollama list 2>nul || echo   Nenhum modelo encontrado
echo.
echo Sinalizacoes Hermes:
if exist "%HERMES%\ready.md" (
  echo   ready.md: SIM
  echo   ---
  type "%HERMES%\ready.md"
  echo   ---
) else ( echo   ready.md: NAO )
if exist "%HERMES%\review.md" (
  echo   review.md: SIM
  echo   ---
  type "%HERMES%\review.md"
  echo   ---
) else ( echo   review.md: NAO )
echo.
echo Status atual:
if exist "%HERMES%\status.md" ( type "%HERMES%\status.md" ) else ( echo   Nenhum status encontrado )
echo.
pause
goto menu

:: ─── MODO HERMES BACKGROUND ─────────────────────
:--monitor-hermes
echo [%time%] [Hermes-Monitor] Iniciando monitoramento em background...
:hermes-loop
if exist "%HERMES%\ready.md" (
  echo [%time%] [Hermes-Monitor] ready.md detectado - Hermes precisa revisar
)
if exist "%HERMES%\review.md" (
  echo [%time%] [Hermes-Monitor] review.md disponivel
)
timeout /t 30 /nobreak >nul
goto hermes-loop
