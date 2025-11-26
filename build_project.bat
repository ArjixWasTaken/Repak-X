@echo off
echo ==========================================
echo Building Repak GUI Revamped (Tauri Version)
echo ==========================================

cd repak-gui || (
    echo Error: Could not find repak-gui directory
    pause
    exit /b 1
)

echo.
echo [1/2] Installing Frontend Dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm install failed
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Building Tauri App (Frontend + Backend)...
cargo tauri build --no-bundle
if %ERRORLEVEL% NEQ 0 (
    echo Error: cargo tauri build failed
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ==========================================
echo Build Complete!
echo Executable is located at: target\release\repak-gui.exe
echo ==========================================
pause
