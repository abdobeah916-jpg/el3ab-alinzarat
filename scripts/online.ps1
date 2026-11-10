# Starts the game server + a public Cloudflare quick tunnel (no account, no card).
#   .\scripts\online.ps1              -> server + public link
#   .\scripts\online.ps1 -Deploy      -> also rebuild/redeploy the Vercel copy on that link
#   .\scripts\stop-online.ps1         -> stop both
param(
  [int]$Port = 3000,
  [switch]$Deploy
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$tools = Join-Path $root ".tools"
New-Item -ItemType Directory -Force $tools | Out-Null
$cf = Join-Path $tools "cloudflared.exe"

function Test-Health([int]$p) {
  try { return (Invoke-WebRequest "http://localhost:$p/api/health" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { return $false }
}

if (-not (Test-Path $cf)) {
  Write-Host "downloading cloudflared..." -ForegroundColor DarkGray
  Invoke-WebRequest "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $cf -UseBasicParsing
}

if (Test-Health $Port) {
  Write-Host "server already listening on $Port" -ForegroundColor DarkGray
} else {
  Write-Host "starting game server on $Port..." -ForegroundColor Cyan
  $env:PORT = "$Port"
  if (-not $env:TOKEN_SECRET) { $env:TOKEN_SECRET = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N") }
  if (-not $env:ADMIN_KEY) { $env:ADMIN_KEY = [guid]::NewGuid().ToString("N").Substring(0, 16) }
  $server = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c", "pnpm --filter @casino/server start > `"$tools\server.log`" 2>&1" `
    -WorkingDirectory $root -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput "$tools\server.stdout.log" -RedirectStandardError "$tools\server.stderr.log"
  Set-Content (Join-Path $tools "server.pid") $server.Id -Encoding ascii
  $deadline = (Get-Date).AddSeconds(60)
  while (-not (Test-Health $Port)) {
    if ((Get-Date) -gt $deadline) { throw "server did not start on port $Port - see .tools\server.log" }
    Start-Sleep -Milliseconds 700
  }
  Write-Host "server ready" -ForegroundColor Green
}

$errLog = Join-Path $tools "tunnel.err.log"
$outLog = Join-Path $tools "tunnel.out.log"
Remove-Item $errLog, $outLog -ErrorAction SilentlyContinue
Write-Host "opening public tunnel..." -ForegroundColor Cyan
$tunnel = Start-Process -FilePath $cf -ArgumentList "tunnel", "--url", "http://localhost:$Port", "--no-autoupdate" `
  -RedirectStandardError $errLog -RedirectStandardOutput $outLog -WindowStyle Hidden -PassThru
Set-Content (Join-Path $tools "tunnel.pid") $tunnel.Id -Encoding ascii

$url = $null
$deadline = (Get-Date).AddSeconds(45)
while (-not $url) {
  if ((Get-Date) -gt $deadline) { throw "no tunnel URL - see $errLog" }
  Start-Sleep -Milliseconds 700
  $text = @()
  foreach ($f in @($errLog, $outLog)) { if (Test-Path $f) { $text += (Get-Content $f -Raw -ErrorAction SilentlyContinue) } }
  $m = [regex]::Match(($text -join "`n"), "https://[a-z0-9-]+\.trycloudflare\.com")
  if ($m.Success) { $url = $m.Value }
}

Set-Content (Join-Path $tools "last-url.txt") $url -Encoding ascii
Write-Host ""
Write-Host "PUBLIC URL: $url" -ForegroundColor Yellow
Write-Host "  local mode: $url/local" -ForegroundColor Gray
Write-Host "  health:     $url/api/health" -ForegroundColor Gray
Write-Host "  (keep the machine on - the link dies when the tunnel stops)" -ForegroundColor DarkGray

if ($Deploy) {
  Write-Host ""
  Write-Host "deploying the Vercel copy against $url..." -ForegroundColor Cyan
  $env:VITE_API_BASE = $url
  Push-Location $root
  try { pnpm deploy:vercel } finally { Pop-Location }
}

exit 0
