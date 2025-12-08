# Complete Multiple PAK/IoStore Detection Fix

This document contains all the exact code changes needed to implement complete multiple PAK and IoStore detection for directories and archives.

## Current Status
- ✅ Directory multiple PAK detection: Already working (in current build)
- ❌ Archive multiple PAK detection: Needs full recursive logic
- ❌ IoStore multiple sets detection: Not implemented
- ❌ Archive IoStore multiple sets detection: Not implemented

## Required Changes

### 1. Directory Detection Enhancement (IoStore Support)

**File**: `repak-gui/src/main_tauri.rs`
**Location**: Around line 499 (directory detection section)

**Find this code:**
```rust
        let (mod_type, auto_fix_mesh, auto_fix_texture, auto_fix_serialize_size) = if path.is_dir() {
            // First check if directory contains multiple PAK files or IoStore sets
            use walkdir::WalkDir;
            let mut pak_files = Vec::new();
            let mut iostore_sets = std::collections::HashMap::<String, (bool, bool, bool)>::new(); // basename -> (pak, utoc, ucas)
            
            for entry in WalkDir::new(&path).max_depth(1).into_iter().filter_map(|e| e.ok()) {
                let entry_path = entry.path();
                if entry_path.is_file() {
                    if let Some(ext) = entry_path.extension().and_then(|s| s.to_str()) {
                        if ext == "pak" {
                            // Check if this is part of an IoStore set
                            let basename = entry_path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                            let utoc_path = entry_path.with_extension("utoc");
                            let ucas_path = entry_path.with_extension("ucas");
                            
                            if utoc_path.exists() && ucas_path.exists() {
                                // This is an IoStore set
                                iostore_sets.entry(basename.to_string()).or_insert((false, false, false)).0 = true;
                            } else {
                                // Regular PAK file
                                pak_files.push(entry_path.to_path_buf());
                            }
                        } else if ext == "utoc" {
                            let basename = entry_path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                            iostore_sets.entry(basename.to_string()).or_insert((false, false, false)).1 = true;
                        } else if ext == "ucas" {
                            let basename = entry_path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                            iostore_sets.entry(basename.to_string()).or_insert((false, false, false)).2 = true;
                        }
                    }
                }
            }
            
            // Collect complete IoStore sets
            let complete_iostore_sets: Vec<String> = iostore_sets.iter()
                .filter_map(|(basename, (has_pak, has_utoc, has_ucas))| {
                    if *has_pak && *has_utoc && *has_ucas {
                        Some(path.join(format!("{}.pak", basename)).to_string_lossy().to_string())
                    } else {
                        None
                    }
                })
                .collect();
            
            // If directory contains multiple PAK files or IoStore sets, process each one separately
            let total_mods = pak_files.len() + complete_iostore_sets.len();
            if total_mods > 1 {
                let _ = window.emit("install_log", format!("[Detection] Found {} mod(s) in directory: {} regular PAKs, {} IoStore sets", total_mods, pak_files.len(), complete_iostore_sets.len()));
                
                // Combine all mod paths
                let mut all_mod_paths: Vec<String> = pak_files.iter()
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();
                all_mod_paths.extend(complete_iostore_sets);
                
                // Return early and let the recursion handle each mod
                return Box::pin(parse_dropped_files(all_mod_paths, state, window)).await;
            }
            
            // Single mod or no mods found - treat as content directory with loose files
            use crate::utils::collect_files;
            
            let mut file_paths = Vec::new();
```

**Replace with:**
```rust
        let (mod_type, auto_fix_mesh, auto_fix_texture, auto_fix_serialize_size) = if path.is_dir() {
            // First check if directory contains multiple PAK files or IoStore sets
            use walkdir::WalkDir;
            let mut pak_files = Vec::new();
            let mut iostore_sets = std::collections::HashMap::<String, (bool, bool, bool)>::new(); // basename -> (pak, utoc, ucas)
            
            for entry in WalkDir::new(&path).max_depth(1).into_iter().filter_map(|e| e.ok()) {
                let entry_path = entry.path();
                if entry_path.is_file() {
                    if let Some(ext) = entry_path.extension().and_then(|s| s.to_str()) {
                        if ext == "pak" {
                            // Check if this is part of an IoStore set
                            let basename = entry_path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                            let utoc_path = entry_path.with_extension("utoc");
                            let ucas_path = entry_path.with_extension("ucas");
                            
                            if utoc_path.exists() && ucas_path.exists() {
                                // This is an IoStore set
                                iostore_sets.entry(basename.to_string()).or_insert((false, false, false)).0 = true;
                            } else {
                                // Regular PAK file
                                pak_files.push(entry_path.to_path_buf());
                            }
                        } else if ext == "utoc" {
                            let basename = entry_path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                            iostore_sets.entry(basename.to_string()).or_insert((false, false, false)).1 = true;
                        } else if ext == "ucas" {
                            let basename = entry_path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                            iostore_sets.entry(basename.to_string()).or_insert((false, false, false)).2 = true;
                        }
                    }
                }
            }
            
            // Collect complete IoStore sets
            let complete_iostore_sets: Vec<String> = iostore_sets.iter()
                .filter_map(|(basename, (has_pak, has_utoc, has_ucas))| {
                    if *has_pak && *has_utoc && *has_ucas {
                        Some(path.join(format!("{}.pak", basename)).to_string_lossy().to_string())
                    } else {
                        None
                    }
                })
                .collect();
            
            // If directory contains multiple PAK files or IoStore sets, process each one separately
            let total_mods = pak_files.len() + complete_iostore_sets.len();
            if total_mods > 1 {
                let _ = window.emit("install_log", format!("[Detection] Found {} mod(s) in directory: {} regular PAKs, {} IoStore sets", total_mods, pak_files.len(), complete_iostore_sets.len()));
                
                // Combine all mod paths
                let mut all_mod_paths: Vec<String> = pak_files.iter()
                    .map(|p| p.to_string_lossy().to_string())
                    .collect();
                all_mod_paths.extend(complete_iostore_sets);
                
                // Return early and let the recursion handle each mod
                return Box::pin(parse_dropped_files(all_mod_paths, state, window)).await;
            }
            
            // Single mod or no mods found - treat as content directory with loose files
            use crate::utils::collect_files;
            
            let mut file_paths = Vec::new();
```

### 2. Archive Detection Enhancement (Complete Multiple PAK + IoStore Support)

**File**: `repak-gui/src/main_tauri.rs`
**Location**: Around line 589 (archive detection section)

**Find this code:**
```rust
                        // First, look for .pak files in extracted contents
                        let mut found_pak = false;
                        for entry in WalkDir::new(temp_path) {
                            if let Ok(entry) = entry {
                                let entry_path = entry.path();
                                if entry_path.is_file() && entry_path.extension().and_then(|s| s.to_str()) == Some("pak") {
                                    found_pak = true;
```

**Replace with:**
```rust
                        // Look for .pak files and IoStore sets in extracted contents
                        let mut pak_files_in_archive = Vec::new();
                        let mut iostore_sets_in_archive = std::collections::HashMap::<String, (bool, bool, bool)>::new();
                        
                        for entry in WalkDir::new(temp_path) {
                            if let Ok(entry) = entry {
                                let entry_path = entry.path();
                                if entry_path.is_file() {
                                    if let Some(ext) = entry_path.extension().and_then(|s| s.to_str()) {
                                        if ext == "pak" {
                                            // Check if this is part of an IoStore set
                                            let basename = entry_path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                                            let utoc_path = entry_path.with_extension("utoc");
                                            let ucas_path = entry_path.with_extension("ucas");
                                            
                                            if utoc_path.exists() && ucas_path.exists() {
                                                // This is an IoStore set
                                                iostore_sets_in_archive.entry(basename.to_string()).or_insert((false, false, false)).0 = true;
                                            } else {
                                                // Regular PAK file
                                                pak_files_in_archive.push(entry_path.to_path_buf());
                                            }
                                        } else if ext == "utoc" {
                                            let basename = entry_path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                                            iostore_sets_in_archive.entry(basename.to_string()).or_insert((false, false, false)).1 = true;
                                        } else if ext == "ucas" {
                                            let basename = entry_path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
                                            iostore_sets_in_archive.entry(basename.to_string()).or_insert((false, false, false)).2 = true;
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Collect complete IoStore sets
                        let complete_iostore_sets_in_archive: Vec<String> = iostore_sets_in_archive.iter()
                            .filter_map(|(basename, (has_pak, has_utoc, has_ucas))| {
                                if *has_pak && *has_utoc && *has_ucas {
                                    Some(PathBuf::from(temp_path).join(format!("{}.pak", basename)).to_string_lossy().to_string())
                                } else {
                                    None
                                }
                            })
                            .collect();
                        
                        // If archive contains multiple mods, process each one separately
                        let total_archive_mods = pak_files_in_archive.len() + complete_iostore_sets_in_archive.len();
                        if total_archive_mods > 1 {
                            let _ = window.emit("install_log", format!("[Detection] Found {} mod(s) in archive: {} regular PAKs, {} IoStore sets", total_archive_mods, pak_files_in_archive.len(), complete_iostore_sets_in_archive.len()));
                            
                            // Combine all mod paths
                            let mut all_archive_mod_paths: Vec<String> = pak_files_in_archive.iter()
                                .map(|p| p.to_string_lossy().to_string())
                                .collect();
                            all_archive_mod_paths.extend(complete_iostore_sets_in_archive);
                            
                            // Clean up temp dir before returning
                            drop(temp_dir);
                            
                            // Return early and let the recursion handle each mod
                            return Box::pin(parse_dropped_files(all_archive_mod_paths, state, window)).await;
                        }
                        
                        // Single mod or no mods - continue with existing logic
                        let found_pak = !pak_files_in_archive.is_empty() || !complete_iostore_sets_in_archive.is_empty();
                        if found_pak {
                            let entry_path = if !pak_files_in_archive.is_empty() {
                                &pak_files_in_archive[0]
                            } else {
                                &PathBuf::from(&complete_iostore_sets_in_archive[0])
                            };
```

### 3. Remove Archive Break Statement

**File**: `repak-gui/src/main_tauri.rs`
**Location**: Around line 723

**Find this code:**
```rust
                                    break; // Only analyze first pak file
```

**Replace with:**
```rust
// (Delete this line completely)
```

## Implementation Instructions

1. **Backup your current working file first**
2. **Apply changes in order**: Start with directory enhancement, then archive enhancement, then remove break statement
3. **Test after each major change** to ensure no syntax errors
4. **Build with**: `cargo build --release`

## Expected Behavior After Implementation

### Directories:
- **Multiple regular PAKs**: Each PAK listed separately
- **Multiple IoStore sets**: Each IoStore set listed separately  
- **Mixed**: Both regular PAKs and IoStore sets listed separately
- **Single mod**: Processed normally

### Archives (ZIP/RAR/7Z):
- **Multiple regular PAKs**: Each PAK extracted and listed separately
- **Multiple IoStore sets**: Each IoStore set extracted and listed separately
- **Mixed**: Both regular PAKs and IoStore sets listed separately
- **Single mod**: Processed normally

## Testing Cases

1. **Directory with 2 regular PAK files** → Should show 2 separate entries
2. **Directory with 2 IoStore sets** → Should show 2 separate entries  
3. **ZIP with 2 regular PAK files** → Should show 2 separate entries
4. **ZIP with 2 IoStore sets** → Should show 2 separate entries
5. **Directory with 1 PAK + 1 IoStore set** → Should show 2 separate entries

## Troubleshooting

If build fails:
1. Check bracket matching carefully
2. Ensure all variable names are consistent
3. Verify `std::collections::HashMap` import availability
4. Check that `PathBuf::from()` calls are correct

## Notes

- This preserves all existing functionality while adding comprehensive multiple mod detection
- IoStore sets are detected by checking for matching `.pak`, `.utoc`, and `.ucas` files with same basename
- The recursive approach ensures each mod gets proper individual detection and analysis
- Logging provides clear feedback about what was detected
