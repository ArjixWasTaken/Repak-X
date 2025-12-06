# Build Quick Reference

## For Contributors - First Time Setup

### Prerequisites
1. **Rust** - https://rustup.rs/
2. **.NET SDK 8.0+** - https://dotnet.microsoft.com/download
3. **Node.js 18+** - https://nodejs.org/

### One-Command Build
```powershell
.\build_contributor.ps1
```
Or double-click: `build_contributor.bat`

**This builds everything:**
- ✅ UAssetBridge.exe (C# texture tool)
- ✅ StaticMeshSerializeSizeFixer.exe (C# mesh tool)
- ✅ React frontend
- ✅ Rust backend + Tauri app

**Output:** `target\release\repak-gui.exe`

---

## For Development - Quick Iteration

### After First Build
```powershell
# Quick rebuild (frontend + backend only)
.\build_app.ps1

# Run the app
.\run_app.ps1
```

### Frontend Changes Only
```powershell
cd repak-gui
npm run build
cd ..
cargo build --release
```

### Backend Changes Only
```powershell
cargo build --release
```

### C# Tools Changes
```powershell
# Rebuild UAssetBridge
dotnet publish uasset_toolkit/tools/UAssetBridge/UAssetBridge.csproj -c Release -r win-x64 --self-contained false -o target/uassetbridge

# Rebuild SerializeSizeFixer
dotnet publish UAssetAPI/StaticMeshSerializeSizeFixer/StaticMeshSerializeSizeFixer.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o target/serialsizefixer
```

---

## Build Configurations

### Debug Build (Faster Compilation)
```powershell
.\build_contributor.ps1 -Configuration debug
.\target\debug\repak-gui.exe
```

### Release Build (Optimized)
```powershell
.\build_contributor.ps1 -Configuration release
.\target\release\repak-gui.exe
```

---

## Creating Distribution Package

### Option 1: Build and Package in One Command (Recommended)
```powershell
.\build_and_package.ps1 -Zip
```
Or double-click: `build_and_package.bat`

**This does everything:**
- ✅ Builds all C# tools
- ✅ Builds frontend + backend
- ✅ Creates distribution folder
- ✅ Copies all dependencies
- ✅ Creates README for users
- ✅ Optionally creates ZIP archive

### Option 2: Package Existing Build
```powershell
.\package_release.ps1 -Configuration release -Zip
```

**Output:** `dist/Repak-Gui-Revamped-v{version}/` (and .zip if `-Zip` flag used)

---

## Project Structure

```
Repak_Gui-Revamped-TauriUpdate/
├── build_contributor.ps1       # Full build script (use this!)
├── build_contributor.bat       # Windows batch wrapper
├── build_app.ps1               # Quick rebuild (frontend+backend)
├── package_release.ps1         # Create distribution package
│
├── repak-gui/                  # Tauri frontend (React)
│   ├── src/                    # React source
│   ├── build.rs                # Copies runtime dependencies
│   └── package.json            # Node dependencies
│
├── uasset_toolkit/             # UAsset processing
│   ├── uasset_app/             # Rust wrapper
│   │   └── build.rs            # Builds UAssetBridge.exe
│   └── tools/
│       └── UAssetBridge/       # C# texture tool
│
├── UAssetAPI/                  # C# UAsset library
│   ├── UAssetAPI/              # Core library
│   └── StaticMeshSerializeSizeFixer/  # C# mesh tool
│
└── target/                     # Build outputs
    ├── release/
    │   ├── repak-gui.exe       # Main app
    │   └── uassetbridge/       # Runtime dependencies
    ├── uassetbridge/           # UAssetBridge build
    └── serialsizefixer/        # SerializeSizeFixer build
```

---

## Common Issues

### "cargo build failed"
**Solution:** Use `.\build_contributor.ps1` instead. The C# tools must be built first.

### "dotnet: command not found"
**Solution:** Install .NET SDK 8.0 from https://dotnet.microsoft.com/download

### "UAssetBridge.exe missing"
**Solution:** Run `.\build_contributor.ps1` to rebuild all C# tools.

### Frontend not updating
**Solution:**
```powershell
cd repak-gui
npm run build
cd ..
cargo build --release
```

---

## Testing

```powershell
# Run Rust tests
cargo test

# Build and test
.\build_contributor.ps1
.\target\release\repak-gui.exe
```

---

## More Information

- **Full Guide:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **Main README:** [README.md](README.md)
- **Tauri Docs:** https://tauri.app/
- **Rust Book:** https://doc.rust-lang.org/book/
