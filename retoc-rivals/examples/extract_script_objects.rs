// Extract ScriptObjects from Marvel Rivals
// Run with: cargo run --example extract_script_objects -p retoc

use std::sync::Arc;

fn main() {
    let paks_path = r"E:\SteamLibrary\steamapps\common\MarvelRivals\MarvelGame\Marvel\Content\Paks";
    let output_path = r"E:\WindsurfCoding\repak_rivals-remastered\ScriptObjectExportTest\ScriptObjects.bin";
    
    println!("Extracting ScriptObjects from: {}", paks_path);
    
    let config = Arc::new(retoc::Config::default_with_aes(
        "0C263D8C22DCB085894899C3A3796383E9BF9DE0CBFB08C9BF2DEF2E84F29D74"
    ));
    
    match retoc::extract_script_objects(paks_path, config) {
        Ok(data) => {
            let size = data.len();
            println!("Found ScriptObjects! Size: {} bytes ({:.2} MB)", size, size as f64 / 1024.0 / 1024.0);
            
            // Create output directory if needed
            if let Some(parent) = std::path::Path::new(output_path).parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            
            if let Err(e) = std::fs::write(output_path, &data) {
                eprintln!("Failed to write: {}", e);
            } else {
                println!("Written to: {}", output_path);
            }
        }
        Err(e) => {
            eprintln!("Failed: {}", e);
        }
    }
}
