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
    [string[]]$Arguments
  )
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $FilePath $($Arguments -join ' ')"
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
  Invoke-Checked 'git' @('stash', 'pop')
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

try {
  Write-Step 'Pulling latest code from GitHub'
  $branch = (& git branch --show-current).Trim()
  if (-not $branch) {
    throw 'Cannot detect current git branch.'
  }
  Invoke-Checked 'git' @('fetch', 'origin')
  Invoke-Checked 'git' @('pull', '--ff-only', 'origin', $branch)

  Restore-AutoStash -DidStash $didStash
  $didStash = $false

  Write-Step 'Configuring npm mirrors and peer dependency mode'
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
  if ($didStash) {
    Write-Host ''
    Write-Host 'Local changes are still in git stash. Restore them with:' -ForegroundColor Yellow
    Write-Host 'git stash pop'
  }
  exit 1
}
