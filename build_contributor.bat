@echo off
REM ============================================
REM Repak GUI - Contributor Build Script
REM ============================================
REM This script builds the entire project from scratch
REM ============================================

echo ========================================
echo Repak GUI - Full Contributor Build
echo ========================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: PowerShell not found!
    pause
    exit /b 1
)

REM Run the PowerShell build script
powershell -ExecutionPolicy Bypass -File "%~dp0build_contributor.ps1" -Configuration release

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Build failed! Check the output above for errors.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Build completed successfully!
pause
