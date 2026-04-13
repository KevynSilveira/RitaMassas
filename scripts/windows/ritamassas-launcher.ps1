param(
  [ValidateSet('auto', 'start', 'stop', 'open', 'menu')]
  [string]$Action = 'auto'
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$configPath = Join-Path $projectRoot 'config\local-setup.json'
$serverScriptPath = Join-Path $projectRoot 'scripts\windows\ritamassas-server.ps1'
$batchLauncherPath = Join-Path $projectRoot 'RitaMassas.bat'
$runtimeDir = Join-Path $projectRoot 'data\runtime'
$pidFile = Join-Path $runtimeDir 'server.pid'
$stateFile = Join-Path $runtimeDir 'launcher-state.json'
$installStateFile = Join-Path $runtimeDir 'install-state.json'

function Ensure-Directory([string]$path) {
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path -Force | Out-Null
  }
}

function Read-JsonFile([string]$path) {
  if (-not (Test-Path $path)) {
    return $null
  }

  return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
}

function Write-JsonFile([string]$path, $data) {
  $json = $data | ConvertTo-Json -Depth 6
  Set-Content -LiteralPath $path -Value $json -Encoding UTF8
}

function Refresh-EnvironmentPath {
  $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machinePath;$userPath"
}

function Get-NodeInfo {
  try {
    $nodeCommand = Get-Command node -ErrorAction Stop
    $npmCommand = Get-Command npm -ErrorAction Stop
    $nodeVersion = (& $nodeCommand.Source -p "process.versions.node").Trim()
    $npmVersion = (& $npmCommand.Source -v).Trim()
    return [pscustomobject]@{
      Exists = $true
      NodePath = $nodeCommand.Source
      NpmPath = $npmCommand.Source
      Version = $nodeVersion
      Major = [int]($nodeVersion.Split('.')[0])
      NpmVersion = $npmVersion
    }
  } catch {
    return [pscustomobject]@{
      Exists = $false
      Version = $null
      Major = 0
      NpmVersion = $null
    }
  }
}

function Install-Node([string]$preferredVersion) {
  Write-Host 'Node.js nao encontrado ou abaixo da versao exigida.' -ForegroundColor Yellow
  Write-Host "Instalando Node.js $preferredVersion..." -ForegroundColor Yellow

  $winget = Get-Command winget -ErrorAction SilentlyContinue

  if ($winget) {
    try {
      & $winget.Source install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements --silent
      Refresh-EnvironmentPath
      return
    } catch {
      Write-Host 'Falha no winget. Vou tentar a instalacao direta do MSI.' -ForegroundColor Yellow
    }
  }

  $tempDir = Join-Path $env:TEMP 'ritamassas-installer'
  Ensure-Directory $tempDir
  $msiFile = Join-Path $tempDir "node-v$preferredVersion-x64.msi"
  $msiUrl = "https://nodejs.org/dist/v$preferredVersion/node-v$preferredVersion-x64.msi"

  Invoke-WebRequest -Uri $msiUrl -OutFile $msiFile -UseBasicParsing
  Start-Process 'msiexec.exe' -ArgumentList "/i `"$msiFile`" /qn /norestart" -Wait
  Refresh-EnvironmentPath
}

function Ensure-Node($config) {
  $nodeInfo = Get-NodeInfo

  if (-not $nodeInfo.Exists -or $nodeInfo.Major -lt [int]$config.minNodeMajor) {
    Install-Node -preferredVersion $config.preferredNodeVersion
    $nodeInfo = Get-NodeInfo
  }

  if (-not $nodeInfo.Exists -or $nodeInfo.Major -lt [int]$config.minNodeMajor) {
    throw "Nao foi possivel instalar o Node.js $($config.preferredNodeVersion) automaticamente."
  }

  Write-Host "Node.js: $($nodeInfo.Version)" -ForegroundColor Green
  Write-Host "npm: $($nodeInfo.NpmVersion)" -ForegroundColor Green
  return $nodeInfo
}

function Get-FileHashSafe([string]$path) {
  if (-not (Test-Path $path)) {
    return ''
  }

  return (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash
}

function Ensure-ProjectDependencies($nodeInfo) {
  Ensure-Directory $runtimeDir

  $nodeModulesPath = Join-Path $projectRoot 'node_modules'
  $packageLockPath = Join-Path $projectRoot 'package-lock.json'
  $packageLockHash = Get-FileHashSafe $packageLockPath
  $installState = Read-JsonFile $installStateFile

  $needsInstall =
    (-not (Test-Path $nodeModulesPath)) -or
    (-not $installState) -or
    ($installState.packageLockHash -ne $packageLockHash) -or
    ($installState.nodeVersion -ne $nodeInfo.Version)

  if (-not $needsInstall) {
    Write-Host 'Dependencias OK.' -ForegroundColor Green
    return
  }

  Write-Host 'Instalando dependencias do projeto...' -ForegroundColor Yellow
  Push-Location $projectRoot
  try {
    & npm install
    if ($LASTEXITCODE -ne 0) {
      throw 'npm install falhou.'
    }
  } finally {
    Pop-Location
  }

  Write-JsonFile $installStateFile ([pscustomobject]@{
      packageLockHash = $packageLockHash
      nodeVersion = $nodeInfo.Version
      installedAt = (Get-Date).ToString('o')
    })
}

function Get-LatestSourceWriteTime {
  $paths = @(
    'app',
    'assets',
    'components',
    'config',
    'constants',
    'context',
    'hooks',
    'lib',
    'server',
    'types',
    'app.json',
    'package.json',
    'package-lock.json',
    'metro.config.js',
    'tsconfig.json'
  ) | ForEach-Object { Join-Path $projectRoot $_ }

  $latest = Get-Date '2000-01-01T00:00:00'

  foreach ($entry in $paths) {
    if (-not (Test-Path $entry)) {
      continue
    }

    $item = Get-Item -LiteralPath $entry
    if ($item.PSIsContainer) {
      $candidate = Get-ChildItem -LiteralPath $entry -Recurse -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
      if ($candidate -and $candidate.LastWriteTime -gt $latest) {
        $latest = $candidate.LastWriteTime
      }
    } elseif ($item.LastWriteTime -gt $latest) {
      $latest = $item.LastWriteTime
    }
  }

  return $latest
}

function Ensure-WebBuild {
  $distIndex = Join-Path $projectRoot 'dist\index.html'
  $buildRequired =
    (-not (Test-Path $distIndex)) -or
    ((Get-LatestSourceWriteTime) -gt (Get-Item -LiteralPath $distIndex).LastWriteTime)

  if (-not $buildRequired) {
    Write-Host 'Build web atualizada.' -ForegroundColor Green
    return
  }

  Write-Host 'Gerando build web...' -ForegroundColor Yellow
  Push-Location $projectRoot
  try {
    & npm run build:web
    if ($LASTEXITCODE -ne 0) {
      throw 'npm run build:web falhou.'
    }
  } finally {
    Pop-Location
  }
}

function Test-IsAdministrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Ensure-FirewallRule($config) {
  if (-not $config.firewall.enabled) {
    return
  }

  if (-not (Test-IsAdministrator)) {
    Write-Host 'Firewall: sem permissao de administrador para criar a regra automaticamente.' -ForegroundColor Yellow
    return
  }

  $ruleName = [string]$config.firewall.ruleName
  $existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host 'Firewall: regra ja existente.' -ForegroundColor Green
    return
  }

  New-NetFirewallRule `
    -DisplayName $ruleName `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort ([int]$config.port) `
    -Profile Private | Out-Null

  Write-Host 'Firewall: regra criada para a rede privada.' -ForegroundColor Green
}

function Ensure-DesktopShortcut($config) {
  if (-not $config.createDesktopShortcut) {
    return
  }

  $desktopPath = [Environment]::GetFolderPath('Desktop')
  $shortcutPath = Join-Path $desktopPath ("{0}.lnk" -f $config.desktopShortcutName)
  $shortcutIconPath = Join-Path $projectRoot $config.shortcutIconPath
  $wshShell = New-Object -ComObject WScript.Shell
  $shortcut = $wshShell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $batchLauncherPath
  $shortcut.WorkingDirectory = $projectRoot
  $shortcut.Description = "$($config.productName) - iniciar ou gerenciar o sistema"
  if (Test-Path $shortcutIconPath) {
    $shortcut.IconLocation = "$shortcutIconPath,0"
  }
  $shortcut.Save()
}

function Remove-LauncherState {
  Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $stateFile -Force -ErrorAction SilentlyContinue
}

function Test-RitaMassasHealth([int]$port) {
  try {
    $response = Invoke-RestMethod -Uri "http://localhost:$port/api/health" -TimeoutSec 3
    return [bool]$response.ok
  } catch {
    return $false
  }
}

function Test-LauncherEndpoint([int]$port) {
  try {
    $response = Invoke-RestMethod -Uri "http://localhost:$port/api/launcher-info" -TimeoutSec 3
    return ($response -isnot [string]) -and -not [string]::IsNullOrWhiteSpace($response.localUrl)
  } catch {
    return $false
  }
}

function Get-NetworkUrls([int]$port) {
  $urls = [System.Collections.Generic.List[string]]::new()

  foreach ($networkInterface in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
    if ($networkInterface.OperationalStatus -ne [System.Net.NetworkInformation.OperationalStatus]::Up) {
      continue
    }

    $interfaceLabel = "$($networkInterface.Name) $($networkInterface.Description)"
    if ($interfaceLabel -match 'virtual|vmware|vethernet|hyper-v|host-only|loopback') {
      continue
    }

    foreach ($addressInfo in $networkInterface.GetIPProperties().UnicastAddresses) {
      if ($addressInfo.Address.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
        continue
      }

      $ipAddress = $addressInfo.Address.IPAddressToString
      if ($ipAddress.StartsWith('127.') -or $ipAddress.StartsWith('169.254.')) {
        continue
      }

      $url = "http://${ipAddress}:$port"
      if (-not $urls.Contains($url)) {
        $urls.Add($url)
      }
    }
  }

  return @($urls)
}

function Get-ListeningProcessOnPort([int]$port) {
  try {
    $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop | Select-Object -First 1
    if (-not $connection) {
      return $null
    }

    return Get-Process -Id $connection.OwningProcess -ErrorAction Stop
  } catch {
    return $null
  }
}

function Get-RunningServerProcess($config) {
  if (Test-Path $pidFile) {
    $rawPid = (Get-Content -LiteralPath $pidFile -Raw).Trim()
    if ($rawPid) {
      try {
        return Get-Process -Id ([int]$rawPid) -ErrorAction Stop
      } catch {
        Remove-LauncherState
      }
    } else {
      Remove-LauncherState
    }
  }

  if (Test-RitaMassasHealth -port ([int]$config.port)) {
    return Get-ListeningProcessOnPort -port ([int]$config.port)
  }

  Remove-LauncherState
  return $null
}

function Wait-ForServerReady([int]$port) {
  $deadline = (Get-Date).AddSeconds(60)

  while ((Get-Date) -lt $deadline) {
    if (Test-RitaMassasHealth -port $port) {
      return $true
    }
    Start-Sleep -Milliseconds 800
  }

  return $false
}

function Get-LauncherInfo($config) {
  $baseUrl = "http://localhost:$($config.port)"

  try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/launcher-info" -TimeoutSec 4
    if (($response -isnot [string]) -and -not [string]::IsNullOrWhiteSpace($response.localUrl)) {
      return $response
    }
  } catch {
  }

  return [pscustomobject]@{
    productName = $config.productName
    localUrl = $baseUrl
    launcherUrl = "$baseUrl$($config.launcherPath)"
    networkUrls = @(Get-NetworkUrls -port ([int]$config.port))
  }
}

function Open-LauncherPanel($config) {
  Start-Process "http://localhost:$($config.port)$($config.launcherPath)"
}

function Start-Service($config) {
  Ensure-Directory (Join-Path $projectRoot 'data')
  Ensure-Directory (Join-Path $projectRoot 'data\uploads')
  Ensure-Directory $runtimeDir

  $currentProcess = Get-RunningServerProcess $config
  if ($currentProcess) {
    if (Test-LauncherEndpoint -port ([int]$config.port)) {
      return $currentProcess
    }

    Write-Host 'Foi encontrada uma instancia anterior do servico. Reiniciando para aplicar a versao nova.' -ForegroundColor Yellow
    Stop-ServiceByConfig -config $config -Quiet
  }

  Ensure-WebBuild

  Write-Host 'Iniciando servico...' -ForegroundColor Yellow
  $argumentString = @(
    '-NoLogo'
    '-NoProfile'
    '-NoExit'
    '-ExecutionPolicy Bypass'
    "-File `"$serverScriptPath`""
    "-ProjectRoot `"$projectRoot`""
    "-Port $($config.port)"
    "-ProductName `"$($config.productName)`""
  ) -join ' '

  $process = Start-Process -FilePath 'powershell.exe' -ArgumentList $argumentString -WorkingDirectory $projectRoot -PassThru
  Set-Content -LiteralPath $pidFile -Value $process.Id -Encoding ASCII

  Write-JsonFile $stateFile ([pscustomobject]@{
      processId = $process.Id
      startedAt = (Get-Date).ToString('o')
      port = [int]$config.port
      productName = $config.productName
    })

  if (-not (Wait-ForServerReady -port ([int]$config.port))) {
    throw 'O servico nao respondeu dentro do tempo esperado.'
  }

  if (-not (Test-LauncherEndpoint -port ([int]$config.port))) {
    throw 'O servico subiu, mas o painel do launcher nao respondeu como esperado.'
  }

  return $process
}

function Stop-ServiceByConfig($config, [switch]$Quiet) {
  $process = Get-RunningServerProcess $config

  if ($process) {
    if (-not $Quiet) {
      Write-Host 'Parando servico...' -ForegroundColor Yellow
    }
    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
  }

  $listenerProcess = Get-ListeningProcessOnPort -port ([int]$config.port)
  if ($listenerProcess -and (Test-RitaMassasHealth -port ([int]$config.port))) {
    if (-not $Quiet) {
      Write-Host 'Encerrando a instancia que estava ocupando a porta do sistema...' -ForegroundColor Yellow
    }
    Stop-Process -Id $listenerProcess.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800
  }

  if (-not $process -and -not $listenerProcess) {
    Remove-LauncherState
    if (-not $Quiet) {
      Write-Host 'O servico ja esta parado.' -ForegroundColor Yellow
    }
    return
  }

  Remove-LauncherState
  if (-not $Quiet) {
    Write-Host 'Servico encerrado.' -ForegroundColor Green
  }
}

function Show-RunningMenu($config) {
  while ($true) {
    $info = Get-LauncherInfo $config

    Clear-Host
    Write-Host $config.productName -ForegroundColor Yellow
    Write-Host 'Servico em execucao.' -ForegroundColor Green
    Write-Host ''
    Write-Host "Acesso local: $($info.localUrl)"
    if ($info.networkUrls) {
      foreach ($networkUrl in $info.networkUrls) {
        Write-Host "Acesso na rede: $networkUrl"
      }
    }
    Write-Host ''
    Write-Host '1. Abrir painel de acesso'
    Write-Host '2. Abrir sistema'
    Write-Host '3. Copiar link da rede'
    Write-Host '4. Reiniciar servico'
    Write-Host '5. Parar servico'
    Write-Host '0. Sair'
    Write-Host ''

    $choice = Read-Host 'Escolha uma opcao'

    switch ($choice) {
      '1' { Open-LauncherPanel $config }
      '2' { Start-Process $info.localUrl }
      '3' {
        $preferredUrl = @($info.networkUrls)[0]
        if ($preferredUrl) {
          Set-Clipboard -Value $preferredUrl
          Write-Host 'Link da rede copiado para a area de transferencia.' -ForegroundColor Green
        } else {
          Write-Host 'Nenhum link de rede foi encontrado.' -ForegroundColor Yellow
        }
        Read-Host 'Pressione Enter para continuar'
      }
      '4' {
        Stop-ServiceByConfig -config $config -Quiet
        $nodeInfo = Ensure-Node $config
        Ensure-ProjectDependencies $nodeInfo
        Start-Service $config | Out-Null
        if ($config.autoOpenBrowser) {
          Open-LauncherPanel $config
        }
        Read-Host 'Servico reiniciado. Pressione Enter para continuar'
      }
      '5' {
        Stop-ServiceByConfig -config $config
        Read-Host 'Pressione Enter para fechar'
        return
      }
      '0' { return }
      default {
        Write-Host 'Opcao invalida.' -ForegroundColor Yellow
        Start-Sleep -Seconds 1
      }
    }
  }
}

Ensure-Directory $runtimeDir
$config = Read-JsonFile $configPath
if (-not $config) {
  throw 'Nao foi possivel carregar config/local-setup.json.'
}

try {
  if ($Action -eq 'stop') {
    Stop-ServiceByConfig -config $config
    exit 0
  }

  if ($Action -eq 'open') {
    Open-LauncherPanel $config
    exit 0
  }

  $runningProcess = Get-RunningServerProcess $config

  if ($runningProcess -and ($Action -eq 'auto' -or $Action -eq 'menu')) {
    if (-not (Test-LauncherEndpoint -port ([int]$config.port))) {
      Stop-ServiceByConfig -config $config -Quiet
      $runningProcess = $null
    }
  }

  if ($runningProcess -and ($Action -eq 'auto' -or $Action -eq 'menu')) {
    Show-RunningMenu $config
    exit 0
  }

  $nodeInfo = Ensure-Node $config
  Ensure-ProjectDependencies $nodeInfo
  Ensure-FirewallRule $config
  Ensure-DesktopShortcut $config
  Start-Service $config | Out-Null

  if ($config.autoOpenBrowser) {
    Open-LauncherPanel $config
  }

  $launcherInfo = Get-LauncherInfo $config
  Write-Host ''
  Write-Host $config.productName -ForegroundColor Yellow
  Write-Host 'Servico pronto para uso.' -ForegroundColor Green
  Write-Host "Acesso local: $($launcherInfo.localUrl)"
  if ($launcherInfo.networkUrls) {
    foreach ($networkUrl in $launcherInfo.networkUrls) {
      Write-Host "Acesso na rede: $networkUrl"
    }
  }
  Write-Host ''
  Write-Host 'O navegador foi aberto com o painel de acesso.' -ForegroundColor Green
  Write-Host 'Para parar o servico, execute este atalho novamente.' -ForegroundColor Yellow
  Write-Host ''
  if ($Action -eq 'auto') {
    Read-Host 'Pressione Enter para fechar este assistente'
  }
} catch {
  Write-Host ''
  Write-Host 'Nao foi possivel concluir a inicializacao.' -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host ''
  if ($Action -eq 'auto' -or $Action -eq 'menu') {
    Read-Host 'Pressione Enter para fechar'
  }
  exit 1
}
