# Build script for Repak Gui Revamped (Tauri + React)
# This script properly builds both frontend and backend using Tauri CLI

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building Repak Gui Revamped" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$originalLocation = Get-Location
$scriptRoot = Split-Path -Parent $PSCommandPath
$workspaceRoot = $scriptRoot

# Step 1: Prepare frontend
Write-Host "[1/2] Checking frontend dependencies..." -ForegroundColor Yellow
Set-Location $workspaceRoot
Set-Location repak-gui

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install failed!" -ForegroundColor Red
        Set-Location $originalLocation
        exit 1
    }
} else {
    Write-Host "Dependencies already installed." -ForegroundColor Gray
}

# Step 2: Build Tauri Application
# We use 'cargo tauri build' because it properly handles the bundling of frontend assets.
# Regular 'cargo build' skips this step, causing "localhost refused" errors in release mode.
Write-Host "[2/2] Building Tauri application..." -ForegroundColor Yellow

# 'cargo tauri build' will automatically run 'npm run build' via 'beforeBuildCommand' in tauri.conf.json
cargo tauri build --no-bundle

if ($LASTEXITCODE -ne 0) {
    Write-Host "Tauri build failed!" -ForegroundColor Red
    Set-Location $originalLocation
    exit 1
}

Write-Host "✓ Tauri app built successfully" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Executable location:" -ForegroundColor Yellow
# When running inside the crate, target is usually local
Write-Host "  repak-gui\target\release\repak-gui.exe" -ForegroundColor White
Write-Host ""
Write-Host "To run the app:" -ForegroundColor Yellow
Write-Host "  .\run_app.ps1" -ForegroundColor White
Write-Host ""

Set-Location $originalLocation
