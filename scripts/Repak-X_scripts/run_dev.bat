@echo off
echo ==========================================
echo Starting Repak GUI Revamped (Dev Mode)
echo ==========================================

REM Scripts are in scripts\Repak-X_scripts\, go up 2 levels then into repak-x
cd /d "%~dp0..\..\repak-x" || (
    echo Error: Could not find repak-x directory
    pause
    exit /b 1
)

echo Starting Tauri Development Server...
echo This will compile the backend and launch the application.
echo.
call npx tauri dev

if %ERRORLEVEL% NEQ 0 (
    echo Error: Application crashed or failed to start
    pause
)
