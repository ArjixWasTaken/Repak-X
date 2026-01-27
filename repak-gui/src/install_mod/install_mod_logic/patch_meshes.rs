use colored::Colorize;
use log::{error, info, warn};
use path_slash::PathExt;
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::PathBuf;

/// Simple mesh patch wrapper - calls mesh_patch_with_source with no source directory
#[allow(dead_code)]
pub fn mesh_patch(paths: &mut Vec<PathBuf>, mod_dir: &PathBuf) -> Result<(), repak::Error> {
    mesh_patch_with_source(paths, mod_dir, None)
}

/// Mesh patch with optional source directory to check for existing patched_files marker.
/// This prevents double-patching skeletal meshes from cooked directory mods that were already patched.
/// Now uses UAssetTool's patch_mesh function instead of the old uasset_mesh_patch_rivals crate.
pub fn mesh_patch_with_source(paths: &mut Vec<PathBuf>, mod_dir: &PathBuf, source_mod_dir: Option<&PathBuf>) -> Result<(), repak::Error> {
    let uasset_files = paths
        .iter()
        .filter(|p| {
            p.extension().and_then(|ext| ext.to_str()) == Some("uasset")
                && p.to_str().map_or(false, |s| s.to_lowercase().contains("meshes"))
        })
        .cloned()
        .collect::<Vec<PathBuf>>();

    let patched_cache_file = mod_dir.join("patched_files");
    info!("Patching mesh files using UAssetTool...");
    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(&patched_cache_file)?;

    // Read patched files from the working directory cache
    let mut patched_files = BufReader::new(&file)
        .lines()
        .filter_map(|l| l.ok())
        .collect::<Vec<_>>();
    
    // Also check for patched_files in the source mod directory (for cooked directory mods)
    if let Some(source_dir) = source_mod_dir {
        let source_patched_file = source_dir.join("patched_files");
        if source_patched_file.exists() {
            info!("Found existing patched_files marker in source mod directory: {:?}", source_patched_file);
            if let Ok(source_file) = File::open(&source_patched_file) {
                let source_patched: Vec<String> = BufReader::new(source_file)
                    .lines()
                    .filter_map(|l| l.ok())
                    .collect();
                info!("Loaded {} previously patched file entries from source mod", source_patched.len());
                patched_files.extend(source_patched);
            }
        }
    }

    let mut cache_writer = BufWriter::new(&file);
    paths.push(patched_cache_file);

    for uassetfile in &uasset_files {
        let Some(dir_path) = uassetfile.parent() else {
            warn!("Could not get parent directory for file: {:?}, skipping", uassetfile);
            continue;
        };
        
        let uexp_file = dir_path.join(
            uassetfile
                .file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.replace(".uasset", ".uexp"))
                .unwrap_or_else(|| {
                    warn!("Could not convert filename to string: {:?}", uassetfile);
                    "unknown.uexp".to_string()
                }),
        );

        if !uexp_file.exists() {
            warn!("UEXP file does not exist: {:?}, skipping mesh patching", uexp_file);
            continue;
        }

        let rel_uasset = match uassetfile
            .strip_prefix(mod_dir)
            .ok()
            .and_then(|p| p.to_slash())
        {
            Some(path) => path,
            None => {
                error!("File not in input directory: {:?}", uassetfile);
                continue;
            }
        };

        let rel_uexp = match uexp_file
            .strip_prefix(mod_dir)
            .ok()
            .and_then(|p| p.to_slash())
        {
            Some(path) => path,
            None => {
                error!("File not in input directory: {:?}", uexp_file);
                continue;
            }
        };

        // Check if already patched
        let already_patched = patched_files.iter().any(|i| {
            i.as_str() == rel_uexp.as_ref() as &str || i.as_str() == rel_uasset.as_ref() as &str
        });
        
        if already_patched {
            info!("Skipping {} (already patched)", rel_uasset.yellow());
            continue;
        }

        info!("Processing mesh: {}", uassetfile.to_str().unwrap_or("<invalid_path>").yellow());
        
        // Use UAssetTool's patch_mesh function
        match uasset_toolkit::patch_mesh(
            &uassetfile.to_string_lossy(),
            &uexp_file.to_string_lossy(),
        ) {
            Ok(_) => {
                info!("[Mesh Patcher] Successfully patched: {}", rel_uasset);
                writeln!(&mut cache_writer, "{}", &rel_uasset)?;
                writeln!(&mut cache_writer, "{}", &rel_uexp)?;
                cache_writer.flush()?;
            }
            Err(e) => {
                warn!("[Mesh Patcher] Failed to patch {}: {}", rel_uasset, e);
            }
        }
    }

    info!("Done patching mesh files!");
    Ok(())
}