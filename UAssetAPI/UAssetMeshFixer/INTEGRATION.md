# StaticMeshSerializeSizeFixer Integration Guide

## Overview

This document describes how to integrate the optimized skeletal mesh patcher with your Rust application, including usmap caching strategies.

## Current Architecture

### Commands Available

| Command | Description | Usage |
|---------|-------------|-------|
| `detect` | Detect asset type | `detect <uasset_path> [usmap_path]` |
| `fix` | Fix Static Mesh SerialSize | `fix <uasset_path> [usmap_path]` |
| `fix_skel` | Fix single Skeletal Mesh | `fix_skel <uasset_path> <usmap_path>` |
| `batch_fix_skel` | **Optimized** batch fix | `batch_fix_skel <directory> <usmap_path> [thread_count]` |
| `batch_detect` | Batch detect asset types | `batch_detect <directory> [usmap_path]` |
| `dump` | Debug dump asset structure | `dump <uasset_path> <usmap_path>` |

### Performance Comparison

| Approach | Time per Skeletal Mesh |
|----------|------------------------|
| Single file (`fix_skel`) | ~6800ms (includes usmap load) |
| Batch (`batch_fix_skel`) | ~116ms per file |
| **Speedup** | **~60x faster** |

The massive speedup comes from:
1. Loading usmap **once** instead of per-file
2. Using `SkipParsingExports` flag (only parse header)
3. Parallel processing
4. Binary header patching instead of full re-serialization

---

## Usmap Caching Strategy

### Current In-Memory Cache

The tool has an in-memory cache that:
- Stores the parsed `Usmap` object
- Tracks the usmap file path and modification time
- Auto-invalidates when the file changes

**Limitation**: Cache is lost when the process exits.

### Proposed: App-Controlled Cache

Your Rust app can control the cache by:

1. **Keeping the C# process alive** (recommended)
2. **Or**: Implementing a disk-based cache

---

## Option 1: Long-Running Process (Recommended)

### Architecture

```
┌─────────────────┐         stdin/stdout          ┌──────────────────────┐
│   Rust App      │ ◄──────────────────────────► │  C# Patcher Process  │
│  (repak-gui)    │         JSON commands         │  (keeps usmap cached)│
└─────────────────┘                               └──────────────────────┘
```

### New Command: `daemon` mode

Add a daemon mode that:
1. Starts the C# process once
2. Reads JSON commands from stdin
3. Writes JSON responses to stdout
4. Keeps usmap cached in memory

### Example Protocol

**Request (stdin)**:
```json
{"command": "load_usmap", "path": "C:/path/to/mappings.usmap"}
```

**Response (stdout)**:
```json
{"success": true, "load_time_ms": 576}
```

**Request**:
```json
{"command": "batch_fix_skel", "directory": "C:/temp/mod_extract", "thread_count": 8}
```

**Response**:
```json
{"success": true, "patched": 2, "skipped": 0, "elapsed_ms": 232}
```

**Request**:
```json
{"command": "exit"}
```

### Rust Integration Example

```rust
use std::process::{Command, Stdio, Child};
use std::io::{BufReader, BufWriter, BufRead, Write};

struct UAssetPatcher {
    process: Child,
    stdin: BufWriter<std::process::ChildStdin>,
    stdout: BufReader<std::process::ChildStdout>,
}

impl UAssetPatcher {
    pub fn new(exe_path: &str) -> std::io::Result<Self> {
        let mut process = Command::new(exe_path)
            .arg("daemon")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()?;
        
        let stdin = BufWriter::new(process.stdin.take().unwrap());
        let stdout = BufReader::new(process.stdout.take().unwrap());
        
        Ok(Self { process, stdin, stdout })
    }
    
    pub fn load_usmap(&mut self, path: &str) -> Result<u64, String> {
        let cmd = format!(r#"{{"command":"load_usmap","path":"{}"}}"#, path.replace("\\", "\\\\"));
        writeln!(self.stdin, "{}", cmd).unwrap();
        self.stdin.flush().unwrap();
        
        let mut response = String::new();
        self.stdout.read_line(&mut response).unwrap();
        
        // Parse JSON response...
        Ok(576) // load_time_ms
    }
    
    pub fn batch_fix_skel(&mut self, directory: &str, threads: u32) -> Result<BatchResult, String> {
        let cmd = format!(
            r#"{{"command":"batch_fix_skel","directory":"{}","thread_count":{}}}"#,
            directory.replace("\\", "\\\\"),
            threads
        );
        writeln!(self.stdin, "{}", cmd).unwrap();
        self.stdin.flush().unwrap();
        
        let mut response = String::new();
        self.stdout.read_line(&mut response).unwrap();
        
        // Parse JSON response...
        todo!()
    }
}

impl Drop for UAssetPatcher {
    fn drop(&mut self) {
        let _ = writeln!(self.stdin, r#"{{"command":"exit"}}"#);
        let _ = self.stdin.flush();
        let _ = self.process.wait();
    }
}
```

### Workflow

1. **App startup**: Spawn C# patcher process in daemon mode
2. **When user selects usmap**: Send `load_usmap` command
3. **When installing mod**: Send `batch_fix_skel` command (usmap already cached!)
4. **App shutdown**: Send `exit` command

---

## Option 2: Pre-Load Usmap Before Batch

Simpler approach - just ensure you call `batch_fix_skel` which loads usmap once for the entire batch.

### Current Workflow (Slow)
```
For each skeletal mesh:
    Call fix_skel (loads usmap every time) → 6800ms each
```

### Better Workflow (Fast)
```
Call batch_fix_skel with directory → loads usmap once, processes all files → 116ms each
```

### Rust Integration

```rust
fn patch_skeletal_meshes(mod_dir: &Path, usmap_path: &Path) -> Result<(), Error> {
    let output = Command::new("StaticMeshSerializeSizeFixer.exe")
        .args([
            "batch_fix_skel",
            mod_dir.to_str().unwrap(),
            usmap_path.to_str().unwrap(),
            &num_cpus::get().to_string(), // thread count
        ])
        .output()?;
    
    let result: BatchResult = serde_json::from_slice(&output.stdout)?;
    
    if result.success {
        info!("Patched {} skeletal meshes in {}ms", result.patched, result.elapsed_ms);
        Ok(())
    } else {
        Err(Error::PatchFailed)
    }
}
```

---

## Option 3: Disk-Based Usmap Cache

Cache the parsed usmap to disk for faster subsequent loads.

### How It Would Work

1. First load: Parse usmap (~600ms), serialize to binary cache file
2. Subsequent loads: Check if cache is valid (compare timestamps), load from cache (~50ms)

### Cache Invalidation

```
usmap_path: C:/Users/.../5.3.2-Marvel.usmap
cache_path: C:/Users/.../5.3.2-Marvel.usmap.cache

if cache_path exists AND cache_mtime > usmap_mtime:
    load from cache (fast)
else:
    parse usmap (slow)
    save to cache
```

### Considerations

- Cache file would be ~10-20MB (similar to usmap)
- Need to handle cache corruption gracefully
- May not be worth the complexity vs daemon mode

---

## Recommended Integration Path

### Phase 1: Use `batch_fix_skel` (Easy)

Replace individual `fix_skel` calls with single `batch_fix_skel` call.

**Changes needed**:
1. Collect all skeletal mesh paths
2. Call `batch_fix_skel` once with the mod directory

**Expected improvement**: ~60x faster

### Phase 2: Daemon Mode (Optional, for even more speed)

If you're processing multiple mods in sequence and want to avoid reloading usmap:

1. Implement `daemon` command in C#
2. Keep process alive in Rust app
3. Send commands via stdin/stdout

**Additional improvement**: ~600ms saved per mod batch

---

## JSON Output Format

### `batch_fix_skel` Response

```json
{
  "success": true,
  "total_files": 28,
  "potential_skeletal_meshes": 2,
  "processed": 2,
  "patched": 2,
  "skipped": 0,
  "errors": 0,
  "elapsed_ms": 808,
  "patched_files": [
    {
      "path": "C:\\path\\to\\SK_Character.uasset",
      "material_count": 13,
      "bytes_added": 52
    }
  ]
}
```

### Error Response

```json
{
  "success": false,
  "error": "Directory not found: C:\\invalid\\path"
}
```

---

## Thread Count Recommendations

| CPU Cores | Recommended Threads |
|-----------|---------------------|
| 4 | 4 |
| 8 | 8 |
| 16+ | 12-16 (diminishing returns) |

The tool defaults to `Environment.ProcessorCount` if not specified.

---

## File Locations

- **Executable**: Build with `dotnet publish -c Release -r win-x64 --self-contained`
- **Output**: `bin/Release/net8.0/win-x64/publish/StaticMeshSerializeSizeFixer.exe`

For faster startup, use the published self-contained executable instead of `dotnet run`.

---

## Testing Checklist

- [ ] Test `batch_fix_skel` on mod with multiple skeletal meshes
- [ ] Verify patched files load correctly in UAssetAPI
- [ ] Test with different thread counts
- [ ] Test usmap cache invalidation (modify usmap file, verify reload)
- [ ] Benchmark against current Rust patcher
- [ ] Test error handling (missing files, invalid assets)
