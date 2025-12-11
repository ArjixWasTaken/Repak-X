# Proposal: Target Folder Support for Mod Installation

## Overview

This document proposes adding support for installing mods directly to a specified subfolder within the mods directory, enabling the "Quick Organize" drop feature in the UI.

## Feature Description

When users drag and drop files onto the **Quick Organize** section of the drop zone overlay, they can hover over a specific folder in the folder tree. When they release the files, the mods should be installed **directly into that folder** instead of the root `~mods` directory.

## Current State

### Frontend (Already Implemented)

The frontend now sends a `targetFolder` property with each mod when the user uses Quick Organize:

```javascript
// In App.jsx - handleFileDrop function
const modsWithFolder = modsData.map(mod => ({
  ...mod,
  targetFolder: targetFolder  // e.g., "Skins" or "Heroes/SpiderMan"
}))

await invoke('install_mods', { mods: modsWithFolder })
```

The `targetFolder` value is:
- The folder's relative path from the mods root (e.g., `"Skins"`, `"Heroes/SpiderMan"`)
- `null` or `undefined` when using the normal install panel (no folder targeting)

### Backend (Needs Implementation)

Currently, the `ModToInstall` struct doesn't include the `targetFolder` field and all mods are installed to `state.game_path`.

## Proposed Backend Changes

### 1. Update `ModToInstall` Struct

**File:** `src/main_tauri.rs` (around line 977)

```rust
#[derive(serde::Deserialize)]
struct ModToInstall {
    path: String,
    #[serde(rename = "customName")]
    custom_name: Option<String>,
    #[serde(rename = "fixMesh")]
    fix_mesh: bool,
    #[serde(rename = "fixTexture")]
    fix_texture: bool,
    #[serde(rename = "fixSerializeSize")]
    fix_serialize_size: bool,
    #[serde(rename = "toRepak")]
    to_repak: bool,
    // NEW FIELD
    #[serde(rename = "targetFolder")]
    target_folder: Option<String>,
}
```

### 2. Modify `install_mods` Function

**File:** `src/main_tauri.rs` (around line 995)

The installation logic needs to consider `target_folder` when determining where to output the installed mod files.

**Option A: Modify `mod_directory` per batch**

If all mods in a single `install_mods` call share the same `target_folder` (which is the case for Quick Organize), you can:

```rust
// After getting mod_directory from state
let mut mod_directory = state_guard.game_path.clone();

// Check if any mod has a target folder (they all should have the same one in Quick Organize)
if let Some(first_mod) = mods.first() {
    if let Some(ref target) = first_mod.target_folder {
        mod_directory = mod_directory.join(target);
        
        // Ensure the target folder exists
        if !mod_directory.exists() {
            std::fs::create_dir_all(&mod_directory)
                .map_err(|e| format!("Failed to create target folder: {}", e))?;
        }
        
        let _ = window.emit("install_log", format!("[Install] Target folder: {}", target));
    }
}
```

**Option B: Per-mod target folder support**

If you want to support different target folders per mod in the same batch, you'd need to:
1. Add `target_folder: Option<String>` to the `InstallableMod` struct
2. Modify `install_mods_in_viewport` or post-installation logic to move each mod to its target folder

### 3. Expected Behavior

| Scenario                             | `targetFolder` Value       | Installation Path                    |
| ------------------------------------ | -------------------------- | ------------------------------------ |
| Normal Install (via panel)           | `null` / `undefined`       | `~mods/ModName.pak`                  |
| Quick Organize to "Skins"            | `"Skins"`                  | `~mods/Skins/ModName.pak`            |
| Quick Organize to "Heroes/SpiderMan" | `"Heroes/SpiderMan"`       | `~mods/Heroes/SpiderMan/ModName.pak` |
| Quick Organize to root               | `"~mods"` (root folder ID) | `~mods/ModName.pak`                  |

### 4. Edge Cases to Handle

1. **Target folder doesn't exist**: Create it with `create_dir_all`
2. **Root folder selected**: The root folder has `is_root: true` and its ID is the folder name (e.g., `"~mods"`). When this is selected, install to the root (ignore `target_folder` or treat as `None`)
3. **IoStore mods**: Remember to copy `.pak`, `.utoc`, and `.ucas` files together to the target folder

## Testing Checklist

- [ ] Dropping PAK file on "Skins" folder → installed to `~mods/Skins/`
- [ ] Dropping ZIP archive on subfolder → installed to that subfolder
- [ ] Dropping on root folder → installed to `~mods/` root
- [ ] Normal install via install panel → still works (installed to root)
- [ ] IoStore mods (pak+utoc+ucas) → all 3 files go to target folder

## Questions for Implementation

1. Should we support per-mod target folders in a single batch, or is batch-level targeting sufficient?
2. For IoStore mods that are just file copies (not going through repak), should we handle the copy differently?

---

**Frontend Implementation Status:** ✅ Complete  
**Backend Implementation Status:** ⏳ Pending

*Created: 2025-12-11*
