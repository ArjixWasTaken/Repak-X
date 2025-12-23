// Inspect ScriptObjects.bin and print basic info + some sample names
//
// Usage:
//   cargo run --example inspect_script_objects -p retoc --release -- <path_to_ScriptObjects.bin>
//
// If no path is provided, defaults to the repo's ScriptObjectExportTest output.

use std::path::PathBuf;

fn main() {
    let default_path = PathBuf::from(r"E:\WindsurfCoding\repak_rivals-remastered\ScriptObjectExportTest\ScriptObjects.bin");
    let path = std::env::args_os()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or(default_path);

    println!("Inspecting: {}", path.display());

    let data = match std::fs::read(&path) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("Failed to read file: {}", e);
            std::process::exit(1);
        }
    };

    match retoc::inspect_script_objects_bytes(&data) {
        Ok(info) => {
            println!("ScriptObjects.bin size: {} bytes ({:.2} MB)", data.len(), data.len() as f64 / 1024.0 / 1024.0);
            println!("Global names: {}", info.global_name_count);
            println!("Script object entries: {}", info.script_object_count);
            println!("\nSample matching names (up to 50):");
            for name in info.matching_names {
                println!("- {}", name);
            }
        }
        Err(e) => {
            eprintln!("Failed to parse ScriptObjects: {}", e);
            std::process::exit(1);
        }
    }
}
