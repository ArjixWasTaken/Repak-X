# Contributing to Repak GUI

Thank you for your interest in contributing! This guide will help you set up your development environment and build the project.

## 🚀 Quick Start for Contributors

### Prerequisites

Before building, ensure you have the following installed:

1. **Rust** (latest stable)
   - Install from: https://rustup.rs/
   - Verify: `cargo --version`

2. **.NET SDK 8.0 or later**
   - Install from: https://dotnet.microsoft.com/download
   - Verify: `dotnet --version`

3. **Node.js** (v18 or later)
   - Install from: https://nodejs.org/
   - Verify: `node --version`

4. **Git**
   - Install from: https://git-scm.com/
   - Verify: `git --version`

### Building the Project

#### Option 1: One-Command Build (Recommended)

```powershell
# PowerShell
.\build_contributor.ps1
```

Or simply double-click `build_contributor.bat` on Windows.

This will:
- ✅ Check all prerequisites
- ✅ Build UAssetBridge.exe (C# texture processing tool)
- ✅ Build StaticMeshSerializeSizeFixer.exe (C# mesh fixing tool)
- ✅ Install frontend dependencies (npm)
- ✅ Build React frontend
- ✅ Build Rust backend + Tauri app

#### Option 2: Manual Build Steps

If you prefer to build components separately:

```powershell
# 1. Build C# projects
dotnet publish uasset_toolkit/tools/UAssetBridge/UAssetBridge.csproj -c Release -r win-x64 --self-contained false -o target/uassetbridge
dotnet publish UAssetAPI/StaticMeshSerializeSizeFixer/StaticMeshSerializeSizeFixer.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o target/serialsizefixer

# 2. Install frontend dependencies and build
cd repak-gui
npm install
npm run build
cd ..

# 3. Build Rust workspace
cargo build --release
```

### Running the Application

After building:

```powershell
# Release build
.\target\release\repak-gui.exe

# Debug build (faster compilation, slower runtime)
.\build_contributor.ps1 -Configuration debug
.\target\debug\repak-gui.exe
```

## 📁 Project Structure

```
Repak_Gui-Revamped-TauriUpdate/
├── repak-gui/              # Tauri frontend (React + TypeScript)
│   ├── src/                # React source code
│   ├── build.rs            # Rust build script (copies assets)
│   └── package.json        # Node dependencies
├── repak/                  # Core PAK file library (Rust)
├── repak_cli/              # CLI tool (Rust)
├── uasset_toolkit/         # UAsset processing tools
│   ├── uasset_app/         # Rust wrapper for UAssetBridge
│   └── tools/
│       └── UAssetBridge/   # C# texture processing tool
├── UAssetAPI/              # C# UAsset manipulation library
│   ├── UAssetAPI/          # Core library
│   └── StaticMeshSerializeSizeFixer/  # Mesh fixing tool
├── target/                 # Build output directory
│   ├── release/            # Release builds
│   │   ├── repak-gui.exe   # Main application
│   │   └── uassetbridge/   # UAssetBridge runtime files
│   ├── uassetbridge/       # UAssetBridge build output
│   └── serialsizefixer/    # SerializeSizeFixer build output
└── build_contributor.ps1   # Full build script
```

## 🔧 Development Workflow

### Making Changes

1. **Frontend Changes** (React/TypeScript):
   ```powershell
   cd repak-gui
   npm run dev  # Hot reload development server
   ```

2. **Backend Changes** (Rust):
   ```powershell
   cargo build  # Fast incremental build
   cargo test   # Run tests
   ```

3. **C# Tools Changes**:
   ```powershell
   # Rebuild UAssetBridge
   dotnet build uasset_toolkit/tools/UAssetBridge/UAssetBridge.csproj
   
   # Rebuild SerializeSizeFixer
   dotnet build UAssetAPI/StaticMeshSerializeSizeFixer/StaticMeshSerializeSizeFixer.csproj
   ```

### Testing Your Changes

```powershell
# Run Rust tests
cargo test

# Build and run the app
cargo build --release
.\target\release\repak-gui.exe
```

### Creating a Distribution Package

**One-command build and package:**
```powershell
.\build_and_package.ps1 -Zip
```

Or double-click `build_and_package.bat`

This will:
1. Build all C# tools
2. Build frontend and backend
3. Create a distribution folder with all dependencies
4. Optionally create a ZIP archive ready to share

**If you've already built everything:**
```powershell
.\package_release.ps1 -Configuration release -Zip
```

This creates a `dist/` folder with all necessary files for distribution.

## 🐛 Common Issues

### Issue: "cargo build" fails with linking errors

**Solution**: Make sure you've built the C# projects first. The Rust build depends on UAssetBridge.exe being available.

```powershell
.\build_contributor.ps1  # This ensures correct build order
```

### Issue: Frontend not updating

**Solution**: Rebuild the frontend:

```powershell
cd repak-gui
npm run build
cd ..
cargo build --release
```

### Issue: "dotnet: command not found"

**Solution**: Install .NET SDK 8.0 from https://dotnet.microsoft.com/download

### Issue: UAssetBridge.exe missing at runtime

**Solution**: The build.rs scripts automatically copy UAssetBridge.exe to the correct location. If it's missing:

```powershell
# Manually publish UAssetBridge
dotnet publish uasset_toolkit/tools/UAssetBridge/UAssetBridge.csproj -c Release -r win-x64 --self-contained false -o target/release/uassetbridge
```

## 📝 Code Style

- **Rust**: Follow standard Rust conventions (`cargo fmt`, `cargo clippy`)
- **TypeScript/React**: Follow the existing code style (Prettier/ESLint configured)
- **C#**: Follow standard C# conventions

## 🔍 Understanding the Build Process

### Build Order (Important!)

The build must happen in this order due to dependencies:

1. **C# Projects** → Produces `UAssetBridge.exe` and `StaticMeshSerializeSizeFixer.exe`
2. **Frontend** → Produces React build in `repak-gui/dist/`
3. **Rust Backend** → Links everything together via `build.rs` scripts

The `build.rs` files handle:
- Copying UAssetBridge.exe to the correct runtime location
- Copying oo2core_9_win64.dll (Oodle compression)
- Copying character_data.json
- Embedding frontend assets into the Tauri app

### Key Build Scripts

- `repak-gui/build.rs` - Copies runtime dependencies (UAssetBridge, Oodle DLL, data files)
- `uasset_toolkit/uasset_app/build.rs` - Builds/publishes UAssetBridge.exe
- `build_contributor.ps1` - Orchestrates the entire build process

## 🤝 Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly with `.\build_contributor.ps1`
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your fork (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📚 Additional Resources

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [React Documentation](https://react.dev/)
- [.NET Documentation](https://docs.microsoft.com/en-us/dotnet/)

## 💬 Getting Help

If you encounter issues:

1. Check this CONTRIBUTING.md file
2. Review existing GitHub Issues
3. Open a new Issue with:
   - Your OS and versions (Rust, .NET, Node.js)
   - Full error messages
   - Steps to reproduce

---

Happy coding! 🎉
