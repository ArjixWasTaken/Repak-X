use std::path::Path;
use log::{info, error};
use uasset_toolkit::UAssetToolkitSync;

/// Integration module for UAssetAPI from GitHub
/// This module provides texture processing capabilities via UAssetAPI

/// Processes texture files using UAssetAPI toolkit for MipGenSettings modification
pub fn process_texture_with_uasset_api(uasset_path: &Path) -> Result<bool, Box<dyn std::error::Error>> {
    info!("Processing texture with UAssetAPI toolkit: {:?}", uasset_path);
    
    // Try UAssetAPI toolkit first for most accurate processing
    match UAssetToolkitSync::new(None) {
        Ok(toolkit) => {
            info!("UAssetToolkit initialized successfully");
            
            // First check if it's a texture that needs fixing
            let path_str = uasset_path.to_string_lossy();
            info!("Checking if texture needs MipGen fix: {}", path_str);
            
            match toolkit.is_texture_uasset(&path_str) {
                Ok(is_texture) => {
                    info!("is_texture_uasset returned: {}", is_texture);
                    if is_texture {
                        // It's a texture that needs fixing, now set NoMipmaps
                        info!("Texture needs fix, calling set_no_mipmaps...");
                        match toolkit.set_no_mipmaps(&path_str) {
                            Ok(()) => {
                                info!("UAssetAPI toolkit successfully set NoMipmaps: {:?}", uasset_path);
                                return Ok(true);
                            }
                            Err(e) => {
                                error!("Failed to set NoMipmaps for {:?}: {}", uasset_path, e);
                            }
                        }
                    } else {
                        info!("UAssetAPI: File is not a texture or already NoMipmaps: {:?}", uasset_path);
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
    
    // Return false to indicate fallback to existing processing methods
    Ok(false)
}

/// Convert texture using UE4-DDS-Tools (export -> re-inject with no_mipmaps)
/// This is the safest texture conversion method that:
/// 1. Exports the texture to DDS (temp folder)
/// 2. Re-injects with --no_mipmaps flag
/// 
/// This uses the bundled UE4-DDS-Tools Python tool for reliable texture processing.
pub fn convert_texture_to_inline(uasset_path: &Path) -> Result<bool, Box<dyn std::error::Error>> {
    info!("Converting texture using UE4-DDS-Tools: {:?}", uasset_path);
    
    match UAssetToolkitSync::new(None) {
        Ok(toolkit) => {
            let path_str = uasset_path.to_string_lossy();
            
            // Use the new convert_texture method which calls UE4-DDS-Tools
            match toolkit.convert_texture(&path_str) {
                Ok(true) => {
                    info!("Successfully converted texture: {:?}", uasset_path);
                    Ok(true)
                }
                Ok(false) => {
                    info!("Texture conversion returned false for: {:?}", uasset_path);
                    Ok(false)
                }
                Err(e) => {
                    error!("Failed to convert texture {:?}: {}", uasset_path, e);
                    // Don't fail the whole process, just log and continue
                    Ok(false)
                }
            }
        }
        Err(e) => {
            error!("Failed to initialize UAssetToolkit for texture conversion: {}", e);
            Ok(false)
        }
    }
}
