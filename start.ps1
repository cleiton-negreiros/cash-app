# start.ps1
# Executado no boot (Task Scheduler ou shell:startup)
# Dispara o ciclo opencode <-> Hermes sem intervencão humana.

$ErrorActionPreference = 'SilentlyContinue'

function Invoke-CommandOrLog {
  param(
    [string]$Label,
    [scriptblock]$Script
  )
  try {
    Write-Host "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $Label
    & $Script
    Write-Host ("[{0}] {1}: OK" -f (Get-Date -Format 'HH:mm:ss'), $Label)
  }
  catch {
    Write-Host ("[{0}] {1}: ERRO -> {2}" -f (Get-Date -Format 'HH:mm:ss'), $Label, $_.Exception.Message)
  }
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ReadyPath = Join-Path $Root '.hermes\ready.md'
$StatusPath = Join-Path $Root '.hermes\status.md'
$HandoffPath = Join-Path $Root 'HANDOFF.md'

Set-Location -Path $Root

Invoke-CommandOrLog -Label 'checar ready.md existente' -Script {
  if (Test-Path $ReadyPath) {
    Write-Host 'ready.md ja existe; ciclo anterior nao fechado. Nada a fazer ate o Opencode/Hermes encerrarem o sinal atual.'
    exit 0
  }
}

Invoke-CommandOrLog -Label 'atualizar status: aguardando varredura' -Script {
  @"
# Estado do Ciclo

| Campo | Valor |
|-------|-------|
| **Ciclo** | 1 |
| **Fase** | varredura |
| **Tarefa atual** | -(auto)- |
| **Última ação** | start.ps1 executado no boot |
| **Próximo passo** | procurar proxima tarefa pendente no HANDOFF.md |
"@ | Set-Content -Path $StatusPath -Encoding UTF8
}

$hasPending = $false

Invoke-CommandOrLog -Label 'varrer HANDOFF.md por tarefas pendentes' -Script {
  if (-not (Test-Path $HandoffPath)) {
    Write-Host 'HANDOFF.md nao encontrado.'
    return
  }

  $content = Get-Content -Path $HandoffPath -Raw

  if ($content -match '\|\s*(\d+)\s*\|\s*[^|\[]+\[feito\]') {
    Write-Host 'nenhuma tarefa pendente encontrada no momento.'
    return
  }

  if ($content -match '\|\s*(\d+)\s*\|\s*[^|]+?\|\s*pendente\s*\|') {
    Write-Host 'tarefa pendente encontrada em HANDOFF.md'
    $script:hasPending = $true
  }
}

if ($hasPending) {
  Invoke-CommandOrLog -Label 'abrir novo ciclo opencode' -Script {
    $env:WORKDIR = $Root
    opencode --auto
  }
}
else {
  Invoke-CommandOrLog -Label 'sem tarefas pendentes' -Script {
    Write-Host 'Nenhuma tarefa pendente em HANDOFF.md. Nenhuma acao adicional.'
  }
}

Invoke-CommandOrLog -Label 'atualizar status: ciclo aguardando conclusao' -Script {
  @"
# Estado do Ciclo

| Campo | Valor |
|-------|-------|
| **Ciclo** | 1 |
| **Fase** | aguardando_conclusao |
| **Tarefa atual** | -(auto)- |
| **Última ação** | start.ps1 executou varredura no boot |
| **Próximo passo** | opencode implementar proxima tarefa pendente, se houver |
"@ | Set-Content -Path $StatusPath -Encoding UTF8
}
