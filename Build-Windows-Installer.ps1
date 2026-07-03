$ErrorActionPreference = 'Stop'

Set-Location -LiteralPath $PSScriptRoot

function Write-Step {
  param([string]$Message)
  Write-Host ''
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Checked {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [int]$TimeoutSec = 0
  )
  if ($TimeoutSec -gt 0) {
    $proc = Start-Process -FilePath $FilePath -ArgumentList $Arguments -NoNewWindow -PassThru -Wait -TimeoutSec $TimeoutSec
    if ($proc.ExitCode -ne 0) {
      throw "Command failed (exit $($proc.ExitCode)): $FilePath $($Arguments -join ' ')"
    }
  } else {
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed: $FilePath $($Arguments -join ' ')"
    }
  }
}

function Invoke-Tolerant {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$WarnMsg,
    [int]$TimeoutSec = 0
  )
  try {
    if ($TimeoutSec -gt 0) {
      $proc = Start-Process -FilePath $FilePath -ArgumentList $Arguments -NoNewWindow -PassThru -Wait -TimeoutSec $TimeoutSec
      if ($proc.ExitCode -ne 0) {
        Write-Host "WARNING: $WarnMsg (exit $($proc.ExitCode))" -ForegroundColor Yellow
        return $false
      }
    } else {
      & $FilePath @Arguments
      if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: $WarnMsg (exit $LASTEXITCODE)" -ForegroundColor Yellow
        return $false
      }
    }
    return $true
  } catch {
    Write-Host "WARNING: $WarnMsg ($($_.Exception.Message))" -ForegroundColor Yellow
    return $false
  }
}

function Get-ProjectChildPath {
  param([string]$RelativePath)
  $root = [System.IO.Path]::GetFullPath($PSScriptRoot)
  $path = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot $RelativePath))
  if (-not $path.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to operate outside project folder: $path"
  }
  return $path
}

function Remove-ProjectPath {
  param([string]$RelativePath)
  $path = Get-ProjectChildPath $RelativePath
  if (Test-Path -LiteralPath $path) {
    Remove-Item -LiteralPath $path -Recurse -Force
  }
}

function Clear-ElectermRuntimeCache {
  $appData = Join-Path $env:APPDATA 'electerm'
  if (-not (Test-Path -LiteralPath $appData)) {
    return
  }

  $cacheDirs = @(
    'Cache',
    'Code Cache',
    'GPUCache',
    'DawnGraphiteCache',
    'DawnWebGPUCache'
  )

  foreach ($dir in $cacheDirs) {
    $path = Join-Path $appData $dir
    if (Test-Path -LiteralPath $path) {
      Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

function Restore-AutoStash {
  param([bool]$DidStash)
  if (-not $DidStash) {
    return
  }
  Write-Step 'Restoring local changes'
  try {
    & git stash pop
    if ($LASTEXITCODE -ne 0) {
      Write-Host 'WARNING: git stash pop had conflicts. Run "git stash pop" manually to resolve.' -ForegroundColor Yellow
    }
  } catch {
    Write-Host "WARNING: git stash pop failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host 'Run "git stash pop" manually to restore your changes.' -ForegroundColor Yellow
  }
}

Write-Host 'Electerm Windows installer builder'
Write-Host "Project: $PSScriptRoot"

Write-Step 'Checking required tools'
Invoke-Checked 'git' @('--version')
Invoke-Checked 'node' @('--version')
Invoke-Checked 'npm' @('--version')

$nvm = Get-Command nvm -ErrorAction SilentlyContinue
if ($nvm) {
  $nvmList = (& nvm list) -join "`n"
  if ($nvmList -match '24\.12\.0') {
    Write-Step 'Switching to Node 24.12.0 with nvm'
    Invoke-Checked 'nvm' @('use', '24.12.0')
  }
}

Write-Step 'Saving local changes before pulling latest code'
$didStash = $false
$status = (& git status --porcelain) -join "`n"
if ($status.Trim()) {
  $stashName = "electerm-package-auto-stash-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Invoke-Checked 'git' @('stash', 'push', '--include-untracked', '--message', $stashName)
  $didStash = $true
} else {
  Write-Host 'Working tree is clean.'
}

# Save original npm config so we can restore on failure
$origRegistry = $null
$origLegacyPeerDeps = $null
$npmConfigChanged = $false

try {
  Write-Step 'Checking remote updates'
  $branch = (& git branch --show-current).Trim()
  if (-not $branch) {
    throw 'Cannot detect current git branch.'
  }
  $remoteBehind = 0
  $fetchOk = Invoke-Tolerant 'git' @('fetch', 'origin') 'Failed to fetch from GitHub. Continuing with local code.' -TimeoutSec 30
  if ($fetchOk) {
    $remoteBehind = [int]((& git rev-list --count "HEAD..origin/$branch" 2>$null).Trim())
  }
  if ($remoteBehind -gt 0) {
    Write-Host "Remote has $remoteBehind new commit(s). Skipping pull, using local code to build." -ForegroundColor Yellow
  } else {
    Write-Host 'Local code is up to date with remote.' -ForegroundColor Green
  }

  Restore-AutoStash -DidStash $didStash
  $didStash = $false

  Write-Step 'Configuring npm mirrors and peer dependency mode'
  # Save original values before modifying
  $origRegistry = (& npm config get registry 2>$null).Trim()
  $origLegacyPeerDeps = (& npm config get legacy-peer-deps 2>$null).Trim()
  $npmConfigChanged = $true

  Invoke-Checked 'npm' @('config', 'set', 'legacy-peer-deps', 'true')
  Invoke-Checked 'npm' @('config', 'set', 'registry', 'https://registry.npmmirror.com')
  $env:ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
  $env:npm_config_electron_mirror = $env:ELECTRON_MIRROR
  $env:ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'
  $env:npm_config_electron_builder_binaries_mirror = $env:ELECTRON_BUILDER_BINARIES_MIRROR

  Write-Step 'Installing dependencies'
  Invoke-Checked 'npm' @('install')

  Write-Step 'Building app files'
  Invoke-Checked 'npm' @('run', 'b')
  Invoke-Checked 'npm' @('run', 'pb')

  Write-Step 'Building Windows NSIS installer'
  $env:WORKFLOW_NAME = 'local'
  $dist = Join-Path $PSScriptRoot 'dist'
  Remove-ProjectPath 'dist\win-unpacked'
  Remove-ProjectPath 'dist\builder-effective-config.yaml'
  if (Test-Path -LiteralPath $dist) {
    Get-ChildItem -LiteralPath $dist -Filter '*-installer.exe' -File -ErrorAction SilentlyContinue |
      Remove-Item -Force
  }
  $builder = Join-Path $PSScriptRoot 'node_modules\.bin\electron-builder.cmd'
  if (-not (Test-Path -LiteralPath $builder)) {
    throw "Cannot find electron-builder at $builder"
  }
  Invoke-Checked $builder @('--win', 'nsis', '--publish', 'never')

  $installer = Get-ChildItem -LiteralPath $dist -Filter '*-installer.exe' -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if (-not $installer) {
    throw 'Build finished, but no installer exe was found in dist.'
  }

  Write-Step 'Build succeeded'
  Write-Host "Installer: $($installer.FullName)" -ForegroundColor Green

  $answer = Read-Host 'Type yes to install now'
  if ($answer -eq 'yes') {
    $running = Get-Process electerm -ErrorAction SilentlyContinue
    if ($running) {
      Write-Step 'Closing running electerm before installation'
      $running | Stop-Process -Force
      Start-Sleep -Seconds 2
    }
    Write-Step 'Clearing electerm runtime cache'
    Clear-ElectermRuntimeCache
    Write-Step 'Starting installer'
    Start-Process -FilePath $installer.FullName -Wait
  } else {
    Write-Host 'Skipped installation.'
  }
} catch {
  Write-Host ''
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
} finally {
  # Always restore stash if it was created and not yet popped
  if ($didStash) {
    Restore-AutoStash -DidStash $true
  }
  # Always restore original npm config if we changed it
  if ($npmConfigChanged) {
    Write-Host ''
    Write-Step 'Restoring original npm config'
    # Clean up env vars first to avoid npm warnings about unknown config
    Remove-Item Env:ELECTRON_MIRROR -ErrorAction SilentlyContinue
    Remove-Item Env:npm_config_electron_mirror -ErrorAction SilentlyContinue
    Remove-Item Env:ELECTRON_BUILDER_BINARIES_MIRROR -ErrorAction SilentlyContinue
    Remove-Item Env:npm_config_electron_builder_binaries_mirror -ErrorAction SilentlyContinue
    if ($origRegistry) {
      & npm config set registry $origRegistry 2>$null
    } else {
      & npm config delete registry 2>$null
    }
    if ($origLegacyPeerDeps -eq 'true') {
      & npm config set legacy-peer-deps 'true' 2>$null
    } else {
      & npm config delete legacy-peer-deps 2>$null
    }
    Write-Host 'npm config restored.'
  }
  # Remind user if remote has newer commits
  if ($remoteBehind -gt 0) {
    Write-Host ''
    Write-Host "NOTE: Remote branch '$branch' has $remoteBehind newer commit(s) than your local code." -ForegroundColor Yellow
    Write-Host 'Run "git pull" manually to review and merge the updates.' -ForegroundColor Yellow
  }
}
