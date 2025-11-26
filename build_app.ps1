# Build script for Repak Gui Revamped (Tauri + React)
# This script properly builds both frontend and backend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building Repak Gui Revamped" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build frontend
Write-Host "[1/2] Building React frontend..." -ForegroundColor Yellow
Set-Location repak-gui
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "✓ Frontend built successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Build Tauri app
Write-Host "[2/2] Building Tauri application..." -ForegroundColor Yellow
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
Write-Host "  target\release\repak-gui.exe" -ForegroundColor White
Write-Host ""
Write-Host "To run the app:" -ForegroundColor Yellow
Write-Host "  .\target\release\repak-gui.exe" -ForegroundColor White
Write-Host ""
