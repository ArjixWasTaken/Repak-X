$ErrorActionPreference = "Stop"

$rootPath = Resolve-Path "$PSScriptRoot/.."
$websitePath = Join-Path $rootPath "website"

if (-not (Test-Path $websitePath)) {
    Write-Error "Could not find website directory at: $websitePath"
    exit 1
}

Set-Location $websitePath

# Check for node
if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Error "The 'node' command is not found. Please install Node.js 18+."
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path (Join-Path $websitePath "node_modules"))) {
    Write-Host "--- INSTALLING DEPENDENCIES ---" -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed."; exit 1 }
}

# Build
Write-Host "`n--- BUILDING WEBSITE ---" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Website build failed."; exit 1 }

Write-Host "`n--- BUILD SUCCESSFUL ---" -ForegroundColor Green
Write-Host "Output: $websitePath\build"

# Ask to serve
$response = Read-Host "`nWould you like to serve it locally? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host "`n--- SERVING LOCALLY ---" -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop.`n"
    npm run serve
}
