use std::path::Path;
use log::{info, error};

// ============================================================================
// TEXTURE MIPMAP STRIPPING IMPLEMENTATION TOGGLE
// ============================================================================
// Options:
//   "python"  - Use Python UE4-DDS-Tools via UAssetToolkit (proven, requires Python)
//   "csharp"  - Use native C# UAssetAPI TextureExport (new, no Python needed)
//   "rust"    - Use Rust uasset-texture-patch crate (experimental, has issues)
// 
// Recommended: "csharp" - Native C# using UAssetAPI (fixing Write implementation)
const TEXTURE_IMPLEMENTATION: &str = "csharp";
// ============================================================================

/// Integration module for texture processing
/// Supports both native Rust and Python (UE4-DDS-Tools) implementations

/// Convert texture to inline format by stripping mipmaps.
/// This removes all mipmaps except the first one and embeds the data in .uexp,
/// eliminating the need for .ubulk files.
/// 
/// Uses one of three implementations based on TEXTURE_IMPLEMENTATION constant:
/// - "python" - Python UE4-DDS-Tools via UAssetToolkit (proven, requires Python)
/// - "csharp" - Native C# UAssetAPI TextureExport (new, no Python needed)
/// - "rust"   - Rust uasset-texture-patch crate (experimental)
pub fn convert_texture_to_inline(uasset_path: &Path) -> Result<bool, Box<dyn std::error::Error>> {
    match TEXTURE_IMPLEMENTATION {
        "csharp" => convert_texture_to_inline_csharp(uasset_path),
        "rust" => convert_texture_to_inline_rust(uasset_path),
        _ => convert_texture_to_inline_python(uasset_path), // default to python
    }
}

/// Native C# implementation using UAssetAPI TextureExport via UAssetTool
fn convert_texture_to_inline_csharp(uasset_path: &Path) -> Result<bool, Box<dyn std::error::Error>> {
    use uasset_toolkit::UAssetToolkitSync;
    
    info!("[C#] Stripping mipmaps using UAssetAPI TextureExport: {:?}", uasset_path);
    
    match UAssetToolkitSync::new(None) {
        Ok(toolkit) => {
            let path_str = uasset_path.to_string_lossy();
            
            // Use the new strip_mipmaps_native action
            match toolkit.strip_mipmaps_native(&path_str) {
                Ok(true) => {
                    info!("[C#] Successfully stripped mipmaps: {:?}", uasset_path);
                    Ok(true)
                }
                Ok(false) => {
                    info!("[C#] Texture already has 1 mipmap or not a texture: {:?}", uasset_path);
                    Ok(false)
                }
                Err(e) => {
                    error!("[C#] Failed to strip mipmaps from {:?}: {}", uasset_path, e);
                    Err(e.into())
                }
            }
        }
        Err(e) => {
            error!("[C#] Failed to initialize UAssetToolkit: {}", e);
            Err(e.into())
        }
    }
}

/// Native Rust implementation - REMOVED (uasset-texture-patch crate had issues)
#[allow(dead_code)]
fn convert_texture_to_inline_rust(_uasset_path: &Path) -> Result<bool, Box<dyn std::error::Error>> {
    error!("[Rust] Rust texture implementation has been removed. Use 'csharp' or 'python' instead.");
    Err("Rust texture implementation removed".into())
}

/// Python implementation using UE4-DDS-Tools via UAssetToolkit
#[allow(dead_code)]
fn convert_texture_to_inline_python(uasset_path: &Path) -> Result<bool, Box<dyn std::error::Error>> {
    use uasset_toolkit::UAssetToolkitSync;
    
    info!("[Python] Converting texture using UE4-DDS-Tools: {:?}", uasset_path);
    
    match UAssetToolkitSync::new(None) {
        Ok(toolkit) => {
            let path_str = uasset_path.to_string_lossy();
            
            // Use the convert_texture method which calls UE4-DDS-Tools
            match toolkit.convert_texture(&path_str) {
                Ok(true) => {
                    info!("[Python] Successfully converted texture: {:?}", uasset_path);
                    Ok(true)
                }
                Ok(false) => {
                    info!("[Python] Texture conversion returned false for: {:?}", uasset_path);
                    Ok(false)
                }
                Err(e) => {
                    error!("[Python] Failed to convert texture {:?}: {}", uasset_path, e);
                    Err(e.into())
                }
            }
        }
        Err(e) => {
            error!("[Python] Failed to initialize UAssetToolkit: {}", e);
            Err(e.into())
        }
    }
}

/// Processes texture files using UAssetAPI toolkit for MipGenSettings modification
/// (Legacy function - kept for compatibility but prefer convert_texture_to_inline)
#[allow(dead_code)]
pub fn process_texture_with_uasset_api(uasset_path: &Path) -> Result<bool, Box<dyn std::error::Error>> {
    use uasset_toolkit::UAssetToolkitSync;
    
    info!("Processing texture with UAssetAPI toolkit: {:?}", uasset_path);
    
    match UAssetToolkitSync::new(None) {
        Ok(toolkit) => {
            let path_str = uasset_path.to_string_lossy();
            
            match toolkit.is_texture_uasset(&path_str) {
                Ok(is_texture) => {
                    if is_texture {
                        match toolkit.set_no_mipmaps(&path_str) {
                            Ok(()) => {
                                info!("UAssetAPI toolkit successfully set NoMipmaps: {:?}", uasset_path);
                                return Ok(true);
                            }
                            Err(e) => {
                                error!("Failed to set NoMipmaps for {:?}: {}", uasset_path, e);
                            }
                        }
                    }
                }
                Err(e) => {
                    error!("UAssetAPI is_texture_uasset failed for {:?}: {}", uasset_path, e);
                }
            }
        }
        Err(e) => {
            error!("Failed to initialize UAssetAPI toolkit: {}", e);
        }
    }
    
    Ok(false)
}
