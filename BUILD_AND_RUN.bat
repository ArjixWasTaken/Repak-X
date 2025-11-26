@echo off
echo ========================================
echo Building Repak Gui Revamped
echo ========================================
echo.

REM Run the PowerShell build script
powershell.exe -ExecutionPolicy Bypass -File "%~dp0build_app.ps1"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Build successful! Launching app...
    echo ========================================
    echo.
    powershell.exe -ExecutionPolicy Bypass -File "%~dp0run_app.ps1"
) else (
    echo.
    echo Build failed! Check the errors above.
    pause
)
