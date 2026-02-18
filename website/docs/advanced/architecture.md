---
sidebar_position: 1
---

# Architecture

An overview of the Repak X technical architecture.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS, MUI, Framer Motion
- **Backend:** Tauri 2.0, Rust, Tokio async runtime
- **Asset Processing:** Custom Rust library + C# UAsset toolkit
- **Networking:** libp2p for peer-to-peer mod sharing

## Project Structure

```
Repak-X/
├── repak/            # Core PAK file format library (Rust)
├── repak-x/          # Tauri 2.0 desktop app (Rust backend + React frontend)
│   └── src/          # React frontend
├── uasset_toolkit/   # UAsset/UMap file handling (Rust + C#)
├── oodle_loader/     # Oodle compression support
├── scripts/          # Build & utility scripts (PowerShell)
└── website/          # Documentation (Docusaurus)
```

## Key Components

### Repak Core Library

The `repak` crate handles PAK file reading/writing, including compression (Zlib, Gzip, Zstd, Oodle) and AES-256 encryption.

### UAsset Toolkit

Handles parsing and processing of Unreal Engine asset formats including Skeletal Mesh, Static Mesh, StringTable, and Texture types.

### Tauri Backend

The Rust backend manages file operations, game detection, mod processing, and system integration through Tauri commands.

### React Frontend

The React frontend provides the user interface with drag & drop, search, filtering, and mod management capabilities.
