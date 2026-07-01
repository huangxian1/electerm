$ErrorActionPreference = 'Stop'

$defaultFinalShellDir = Join-Path $env:LOCALAPPDATA 'finalshell'
$finalShellDir = if ($args.Count -gt 0) { $args[0] } else { $defaultFinalShellDir }
$connDir = Join-Path $finalShellDir 'conn'
$outDir = Join-Path $PSScriptRoot 'dist'
$outFile = Join-Path $outDir 'finalshell-electerm-bookmarks.json'

if (-not (Test-Path -LiteralPath $connDir)) {
  throw "FinalShell connection directory not found: $connDir"
}

if (-not (Test-Path -LiteralPath $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

function New-Id {
  return [Guid]::NewGuid().ToString('N')
}

function Convert-Encoding {
  param([string]$Value)
  if (-not $Value) {
    return 'utf8'
  }
  if ($Value -ieq 'UTF-8') {
    return 'utf8'
  }
  return $Value
}

$bookmarks = @()
$files = Get-ChildItem -LiteralPath $connDir -Filter '*_connect_config.json' -File

foreach ($file in $files) {
  $item = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8 | ConvertFrom-Json

  if ($item.delete_time -and $item.delete_time -gt 0) {
    continue
  }

  if (-not $item.host) {
    continue
  }

  # FinalShell conection_type 100 is SSH.
  if ($item.conection_type -ne 100) {
    Write-Host "Skipped unsupported FinalShell connection type $($item.conection_type): $($item.name)"
    continue
  }

  $bookmark = [ordered]@{
    id = New-Id
    type = 'ssh'
    title = if ($item.name) { [string]$item.name } else { [string]$item.host }
    host = [string]$item.host
    port = if ($item.port) { [int]$item.port } else { 22 }
    username = if ($item.user_name) { [string]$item.user_name } else { '' }
    authType = 'password'
    password = if ($item.password) { [string]$item.password } else { '' }
    description = if ($item.description) { [string]$item.description } else { '' }
    enableSsh = $true
    enableSftp = $true
    useSshAgent = $false
    term = 'xterm-256color'
    displayRaw = $false
    encode = Convert-Encoding $item.terminal_encoding
    envLang = 'en_US.UTF-8'
    runScripts = @(
      [ordered]@{
        delay = 500
        script = ''
      }
    )
  }

  $bookmarks += [pscustomobject]$bookmark
}

$groupId = New-Id
$payload = [ordered]@{
  bookmarks = $bookmarks
  bookmarkGroups = @(
    [ordered]@{
      id = $groupId
      title = 'FinalShell Import'
      color = '#0088cc'
      bookmarkGroupIds = @()
      bookmarkIds = @($bookmarks | ForEach-Object { $_.id })
    }
  )
}

$json = $payload | ConvertTo-Json -Depth 20
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outFile, $json, $utf8NoBom)

Write-Host "Converted $($bookmarks.Count) FinalShell SSH bookmarks."
Write-Host "Output: $outFile"
Write-Host 'Warning: the output JSON contains imported passwords. Keep it private.'
