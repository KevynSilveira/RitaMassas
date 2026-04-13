param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRoot,
  [Parameter(Mandatory = $true)]
  [int]$Port,
  [Parameter(Mandatory = $true)]
  [string]$ProductName
)

$ErrorActionPreference = 'Stop'

$Host.UI.RawUI.WindowTitle = "$ProductName - Servico"

$runtimeDir = Join-Path $ProjectRoot 'data\runtime'
$stdoutLog = Join-Path $runtimeDir 'server-output.log'

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
Set-Location $ProjectRoot

$env:HOST = '0.0.0.0'
$env:PORT = "$Port"

Write-Host ''
Write-Host $ProductName -ForegroundColor Yellow
Write-Host 'Servico em execucao.' -ForegroundColor Green
Write-Host 'Nao feche esta janela enquanto o sistema estiver em uso.' -ForegroundColor Yellow
Write-Host ''
Write-Host "Pasta do projeto: $ProjectRoot"
Write-Host "Porta: $Port"
Write-Host ''

try {
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  & node --no-warnings '.\server\internal-server.js' 2>&1 | Tee-Object -FilePath $stdoutLog -Append
  $nodeExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference

  if ($nodeExitCode -ne 0) {
    throw "O servidor foi encerrado com codigo $nodeExitCode."
  }
} catch {
  Write-Host ''
  Write-Host 'O servico foi encerrado com erro.' -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  throw
}
