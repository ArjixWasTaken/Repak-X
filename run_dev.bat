@echo off
echo ==========================================
echo Starting Repak GUI Revamped (Dev Mode)
echo ==========================================

cd repak-gui || (
    echo Error: Could not find repak-gui directory
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
