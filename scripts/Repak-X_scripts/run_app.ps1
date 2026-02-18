# Quick run script for Repak Gui Revamped
# Just launches the built executable

# Scripts are in scripts/Repak-X_scripts/, so go up 2 levels to repo root
$scriptRoot = Split-Path -Parent $PSCommandPath
$workspaceRoot = Split-Path -Parent (Split-Path -Parent $scriptRoot)

$targetExe = @(
    "target\release\REPAK-X.exe",
    "repak-x\target\release\REPAK-X.exe",
    "target\debug\REPAK-X.exe"
)

$exePath = $null
foreach ($rel in $targetExe) {
    $candidate = Join-Path -Path $workspaceRoot -ChildPath $rel
    if (Test-Path $candidate) {
        $exePath = $candidate
        break
    }
}

if ($exePath) {
    # Kill existing instances to ensure clean startup
    Stop-Process -Name "REPAK-X" -Force -ErrorAction SilentlyContinue
    
    Write-Host "Launching Repak Gui Revamped..." -ForegroundColor Green
    Start-Process -FilePath $exePath
}
else {
    Write-Host "Error: Application not built yet!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run build_app.ps1 first:" -ForegroundColor Yellow
    Write-Host "  .\build_app.ps1" -ForegroundColor White
    Write-Host ""
    exit 1
}
