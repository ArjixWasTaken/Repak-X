@echo off
REM ============================================
REM Repak GUI - Build and Package for Distribution
REM ============================================
REM This script builds and packages everything for distribution
REM ============================================

echo ========================================
echo Repak GUI - Build and Package
echo ========================================
echo.

REM Check if PowerShell is available
where powershell >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: PowerShell not found!
    pause
    exit /b 1
)

REM Ask if user wants to create ZIP
set /p CREATE_ZIP="Create ZIP archive? (Y/N): "

if /i "%CREATE_ZIP%"=="Y" (
    powershell -ExecutionPolicy Bypass -File "%~dp0build_and_package.ps1" -Configuration release -Zip
) else (
    powershell -ExecutionPolicy Bypass -File "%~dp0build_and_package.ps1" -Configuration release
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Packaging failed! Check the output above for errors.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Package created successfully!
pause
