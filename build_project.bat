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
echo [1/3] Installing Frontend Dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm install failed
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Building Frontend...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm run build failed
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Building Rust Backend (Release)...
cargo build --release
if %ERRORLEVEL% NEQ 0 (
    echo Error: cargo build failed
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ==========================================
echo Build Complete!
echo Executable is located at: repak-gui\target\release\repak-gui.exe
echo ==========================================
pause
