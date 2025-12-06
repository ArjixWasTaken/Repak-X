# Build Scripts Guide

This project includes several build scripts for different purposes. Here's a complete guide.

## 📋 Quick Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `build_contributor.ps1/.bat` | Full build from scratch | First time setup, clean build |
| `build_app.ps1` | Quick rebuild (frontend+backend) | Development iteration |
| `build_and_package.ps1/.bat` | Build + create distribution | Creating releases to share |
| `run_app.ps1` | Launch the application | After building |
| `run_dev.bat` | Dev mode with hot reload | Active development |
| `BUILD_AND_TEST.bat` | Build + launch 2 instances | P2P testing |
| `package_release.ps1` | Package existing build | Internal use by build_and_package.ps1 |

## 🚀 For Contributors

### First Time Setup

```powershell
.\build_contributor.ps1
```

**What it does:**
1. ✅ Checks prerequisites (Rust, .NET, Node.js)
2. ✅ Builds UAssetBridge.exe (C# texture tool)
3. ✅ Builds StaticMeshSerializeSizeFixer.exe (C# mesh tool)
4. ✅ Installs npm dependencies
5. ✅ Builds React frontend
6. ✅ Builds Rust backend + Tauri app

**Output:** `target/release/repak-gui.exe`

**Time:** ~5-10 minutes (first build)

### Quick Development Iteration

```powershell
.\build_app.ps1
```

**What it does:**
1. ✅ Builds React frontend
2. ✅ Builds Tauri app

**Assumes:** C# tools already built

**Time:** ~1-2 minutes

### Running the App

```powershell
.\run_app.ps1
```

Or directly:
```powershell
.\target\release\repak-gui.exe
```

## 📦 For Creating Distribution Packages

### One-Command Build and Package (Recommended)

```powershell
.\build_and_package.ps1 -Zip
```

**What it does:**
1. ✅ Runs full contributor build
2. ✅ Creates `dist/Repak-Gui-Revamped-v{version}/` folder
3. ✅ Copies all executables and dependencies
4. ✅ Copies documentation
5. ✅ Creates user-friendly README
6. ✅ Creates ZIP archive (if `-Zip` flag used)

**Output:**
- Folder: `dist/Repak-Gui-Revamped-v{version}/`
- ZIP: `dist/Repak-Gui-Revamped-v{version}.zip`

**Time:** ~5-10 minutes (includes full build)

**Package includes:**
- `repak-gui.exe` - Main application
- `uassetbridge/` - Texture processing tools
- `tools/StaticMeshSerializeSizeFixer.exe` - Mesh fixing tool
- `oo2core_9_win64.dll` - Oodle compression
- `data/` - Character and game data
- Documentation (README, LICENSE, CHANGELOG)

### Package Existing Build

```powershell
.\package_release.ps1 -Configuration release -Zip
```

**What it does:**
- ✅ Packages already-built files into distribution folder
- ✅ Does NOT rebuild anything

**Use when:** You've already built everything and just need to package it

**Time:** ~30 seconds

## 🖱️ Windows Batch Files (Double-Click)

For users who prefer GUI:

- **`build_contributor.bat`** - Full build from scratch
- **`build_and_package.bat`** - Build and package (asks about ZIP)
- **`run_dev.bat`** - Start development mode with hot reload
- **`BUILD_AND_TEST.bat`** - Build and launch 2 instances for P2P testing

Just double-click these files to run them!

## 🔧 Build Configurations

### Debug Build (Faster Compilation)

```powershell
.\build_contributor.ps1 -Configuration debug
```

- Faster compilation
- Larger file size
- Includes debug symbols
- Slower runtime performance

### Release Build (Optimized)

```powershell
.\build_contributor.ps1 -Configuration release
```

- Slower compilation
- Smaller file size
- No debug symbols
- Faster runtime performance
- **Use this for distribution!**

## 📁 Output Locations

```
target/
├── release/                    # Release build output
│   ├── repak-gui.exe          # Main application
│   ├── uassetbridge/          # UAssetBridge runtime files
│   ├── oo2core_9_win64.dll    # Oodle DLL
│   └── data/                  # Character data
├── debug/                      # Debug build output (same structure)
├── uassetbridge/              # UAssetBridge build output
└── serialsizefixer/           # SerializeSizeFixer build output

dist/
├── Repak-Gui-Revamped-v{version}/  # Distribution folder
└── Repak-Gui-Revamped-v{version}.zip  # Distribution ZIP
```

## 🎯 Common Workflows

### Scenario 1: First Time Contributor

```powershell
# 1. Clone the repo
git clone <repo-url>
cd Repak_Gui-Revamped-TauriUpdate

# 2. Build everything
.\build_contributor.ps1

# 3. Run the app
.\target\release\repak-gui.exe
```

### Scenario 2: Making Code Changes

```powershell
# 1. Make your changes to the code

# 2. Quick rebuild
.\build_app.ps1

# 3. Test
.\target\release\repak-gui.exe
```

### Scenario 3: Creating a Release

```powershell
# 1. Ensure code is ready
git status

# 2. Build and package
.\build_and_package.ps1 -Zip

# 3. Test the distribution
cd dist\Repak-Gui-Revamped-v{version}
.\repak-gui.exe

# 4. Upload the ZIP file
# dist/Repak-Gui-Revamped-v{version}.zip
```

### Scenario 4: C# Tool Changes

```powershell
# 1. Make changes to C# code

# 2. Rebuild C# tools
dotnet publish uasset_toolkit/tools/UAssetBridge/UAssetBridge.csproj -c Release -r win-x64 --self-contained false -o target/uassetbridge

# 3. Rebuild Rust (to copy new C# tools)
cargo build --release

# 4. Test
.\target\release\repak-gui.exe
```

## ⚠️ Important Notes

### Don't Use `cargo build` Directly!

This is a complex project with multiple dependencies:
- C# tools must be built first
- Frontend must be built before backend
- Build scripts handle the correct order

**Always use the provided build scripts!**

### Prerequisites Required

Before building, ensure you have:
- ✅ Rust (latest stable) - https://rustup.rs/
- ✅ .NET SDK 8.0+ - https://dotnet.microsoft.com/download
- ✅ Node.js 18+ - https://nodejs.org/

Run `.\build_contributor.ps1` to check prerequisites automatically.

### Build Order Matters

The correct build order is:
1. C# projects (UAssetBridge, SerializeSizeFixer)
2. Frontend (React)
3. Backend (Rust + Tauri)

The build scripts handle this automatically via `build.rs` files.

## 🐛 Troubleshooting

### Build fails with "dotnet not found"
**Solution:** Install .NET SDK 8.0 from https://dotnet.microsoft.com/download

### Build fails with "cargo not found"
**Solution:** Install Rust from https://rustup.rs/

### Build fails with "npm not found"
**Solution:** Install Node.js from https://nodejs.org/

### UAssetBridge.exe missing at runtime
**Solution:** Run `.\build_contributor.ps1` to rebuild C# tools

### Frontend not updating
**Solution:**
```powershell
cd repak-gui
npm run build
cd ..
cargo build --release
```

### "Access denied" errors
**Solution:** Run PowerShell as Administrator or move project outside Program Files

## 📚 Additional Resources

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Detailed contributor guide
- **[BUILD_QUICK_REFERENCE.md](BUILD_QUICK_REFERENCE.md)** - Quick command reference
- **[README.md](README.md)** - Project overview

## 🎉 Summary

| Task | Command |
|------|---------|
| First build | `.\build_contributor.ps1` or double-click `build_contributor.bat` |
| Quick rebuild | `.\build_app.ps1` |
| Create release | `.\build_and_package.ps1 -Zip` or double-click `build_and_package.bat` |
| Run app | `.\run_app.ps1` or `.\target\release\repak-gui.exe` |
| Dev mode | Double-click `run_dev.bat` |
| P2P testing | Double-click `BUILD_AND_TEST.bat` |

**Most common command for contributors:**
```powershell
.\build_contributor.ps1
```

**Most common command for releases:**
```powershell
.\build_and_package.ps1 -Zip
```

**For active development with hot reload:**
```powershell
.\run_dev.bat
```
