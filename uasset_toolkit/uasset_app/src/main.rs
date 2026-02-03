use anyhow::Result;
use std::io::{self, BufRead};
use uasset_toolkit::{SyncToolkit, patch_mesh};

fn main() -> Result<()> {
    let args: Vec<String> = std::env::args().collect();
    
    // Try to auto-detect bridge path if not provided
    let bridge_path = if args.len() >= 2 && !args[1].ends_with(".uasset") {
        Some(args[1].clone())
    } else {
        None
    };
    
    let toolkit = SyncToolkit::new(bridge_path)?;
    
    // Determine if we have file arguments
    let file_args: Vec<&String> = if args.len() >= 2 && !args[1].ends_with(".uasset") {
        // First arg is bridge path, files start from index 2
        args.iter().skip(2).collect()
    } else {
        // No bridge path provided, files start from index 1
        args.iter().skip(1).collect()
    };
    
    if !file_args.is_empty() {
        // Command line mode - process files
        for file_path in file_args {
            println!("Processing: {}", file_path);
            match toolkit.is_texture_uasset(file_path) {
                Ok(true) => println!("✓ {} - Texture detected and set to NoMipmaps", file_path),
                Ok(false) => println!("- {} - Not a texture uasset", file_path),
                Err(e) => eprintln!("✗ {} - Error: {}", file_path, e),
            }
        }
    } else {
        // Interactive mode - read from stdin
        println!("UAsset Toolkit - Interactive Mode");
        println!("Enter uasset file paths (one per line), or 'quit' to exit:");
        println!("Commands:");
        println!("  <file_path>           - Process texture uasset");
        println!("  info <file>           - Get texture info");
        println!("  mesh <file>           - Check if file is mesh uasset");
        println!("  mesh-info <file>      - Get mesh info");
        println!("  patch-mesh <uasset> <uexp> - Patch mesh materials");
        println!("  quit/exit             - Exit program");
        println!();
        
        let stdin = io::stdin();
        for line in stdin.lock().lines() {
            let line = line?;
            let line = line.trim();
            
            if line == "quit" || line == "exit" {
                break;
            }
            
            if line.is_empty() {
                continue;
            }
            
            let parts: Vec<&str> = line.split_whitespace().collect();
            
            match parts.as_slice() {
                ["info", file_path] => {
                    match toolkit.is_texture_uasset(file_path) {
                        Ok(is_texture) => {
                            println!("File: {} - Is Texture: {}", file_path, is_texture);
                        }
                        Err(e) => eprintln!("✗ Error checking texture: {}", e),
                    }
                }
                ["mesh", file_path] => {
                    match toolkit.batch_detect_skeletal_mesh(&[file_path.to_string()]) {
                        Ok(is_mesh) => {
                            if is_mesh {
                                println!("✓ {} is a mesh uasset", file_path);
                            } else {
                                println!("- {} is not a mesh uasset", file_path);
                            }
                        }
                        Err(e) => eprintln!("✗ Error detecting mesh: {}", e),
                    }
                }
                ["mesh-info", file_path] => {
                    match toolkit.batch_detect_skeletal_mesh(&[file_path.to_string()]) {
                        Ok(is_skeletal) => {
                            println!("File: {} - Is Skeletal Mesh: {}", file_path, is_skeletal);
                        }
                        Err(e) => eprintln!("✗ Error checking mesh: {}", e),
                    }
                }
                ["patch-mesh", uasset_path, uexp_path] => {
                    match patch_mesh(uasset_path, uexp_path) {
                        Ok(()) => println!("✓ Successfully patched mesh: {}", uasset_path),
                        Err(e) => eprintln!("✗ Error patching mesh: {}", e),
                    }
                }
                _ => {
                    // Treat as file path
                    match toolkit.is_texture_uasset(line) {
                        Ok(true) => println!("✓ {} - Texture detected and set to NoMipmaps", line),
                        Ok(false) => println!("- {} - Not a texture uasset", line),
                        Err(e) => eprintln!("✗ {} - Error: {}", line, e),
                    }
                }
            }
        }
    }
    
    Ok(())
}
