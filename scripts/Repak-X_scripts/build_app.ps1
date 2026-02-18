# Build script for Repak Gui Revamped (Tauri + React)
# NOTE: Tauri's beforeBuildCommand in tauri.conf.json automatically
# runs the frontend build via npm-build.bat, so we don't need to build it separately.

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building Repak Gui Revamped" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get workspace root (scripts are in scripts/Repak-X_scripts/, so go up 2 levels)
$scriptDir = $PSScriptRoot
$workspaceRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
Set-Location $workspaceRoot

# Ensure UAssetToolRivals submodule is initialized (needed for build.rs)
$initScript = Join-Path $workspaceRoot "scripts\Init-Submodule.ps1"
if (Test-Path $initScript) {
    & $initScript -NonInteractive
}

# Build Tauri app (includes frontend build via beforeBuildCommand)
Write-Host "Building Tauri application (frontend + backend)..." -ForegroundColor Yellow
Set-Location (Join-Path $workspaceRoot "repak-x")
npx tauri build --no-bundle
if ($LASTEXITCODE -ne 0) {
    Write-Host "Tauri build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "✓ Tauri app built successfully" -ForegroundColor Green
Write-Host ""

Set-Location ..

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Executable location:" -ForegroundColor Yellow
Write-Host "  target\release\REPAK-X.exe" -ForegroundColor White
Write-Host ""
Write-Host "To run the app:" -ForegroundColor Yellow
Write-Host "  .\target\release\REPAK-X.exe" -ForegroundColor White
Write-Host ""
