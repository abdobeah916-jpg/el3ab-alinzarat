# Stops the public tunnel and the game server started by scripts\online.ps1
param([int]$Port = 3000)

$root = Split-Path -Parent $PSScriptRoot
$tools = Join-Path $root ".tools"

foreach ($name in @("tunnel", "server")) {
  $file = Join-Path $tools "$name.pid"
  if (Test-Path $file) {
    $procId = (Get-Content $file -Raw).Trim()
    if ($procId) {
      try { Stop-Process -Id ([int]$procId) -Force -ErrorAction Stop; Write-Host "stopped $name ($procId)" } catch { Write-Host "$name already stopped" -ForegroundColor DarkGray }
    }
    Remove-Item $file -ErrorAction SilentlyContinue
  }
}

# Whatever still holds the port (the node child of the pnpm wrapper).
Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
  try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction Stop; Write-Host "freed port $Port (pid $($_.OwningProcess))" } catch {}
}

# Leftover cloudflared from an earlier run.
Get-Process cloudflared -ErrorAction SilentlyContinue | ForEach-Object {
  try { Stop-Process -Id $_.Id -Force -ErrorAction Stop; Write-Host "stopped leftover cloudflared ($($_.Id))" } catch {}
}

Remove-Item (Join-Path $tools "last-url.txt") -ErrorAction SilentlyContinue
Write-Host "offline" -ForegroundColor Yellow
