pub fn extract_zip(zip_path: &str, output_dir: &str) -> io::Result<()> {
    let file = File::open(zip_path)?;
    let mut archive = ZipArchive::new(file)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let outpath = Path::new(output_dir).join(file.mangled_name());

        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    std::fs::create_dir_all(p)?;
                }
            }
            let mut outfile = File::create(&outpath)?;
            io::copy(&mut file, &mut outfile)?;
        }
    }

    Ok(())
}

use std::fs::File;
use std::io;
use unrar::Archive;
use std::path::Path;
use zip::ZipArchive;
use sevenz_rust::{SevenZReader, Password};

pub fn extract_rar(rar_path: &str, output_dir: &str) -> Result<(), unrar::error::UnrarError> {
    let output_dir = Path::new(output_dir);
    let mut archive =
        Archive::new(rar_path)
            .open_for_processing()?;
    while let Some(header) = archive.read_header()? {
        let filename = header.entry().filename.clone();
        archive = if header.entry().is_file() {
            header.extract_to(output_dir.join(filename))?
        } else {
            header.skip()?
        };
    }
    Ok(())
}

pub fn extract_7z(archive_path: &str, output_dir: &str) -> io::Result<()> {
    let output_path = Path::new(output_dir);
    std::fs::create_dir_all(output_path)?;
    
    // Create empty password (no password protection)
    let password = Password::empty();
    
    SevenZReader::open(archive_path, password)
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Failed to open 7z archive: {}", e)))?
        .for_each_entries(|entry, reader| {
            let entry_path = output_path.join(entry.name());
            
            // Create parent directories if needed
            if let Some(parent) = entry_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            
            // Extract file
            let mut output_file = File::create(&entry_path)?;
            io::copy(reader, &mut output_file)?;
            
            Ok(true) // Continue processing
        })
        .map_err(|e| io::Error::new(io::ErrorKind::Other, format!("Failed to extract 7z archive: {}", e)))?;
    
    Ok(())
}