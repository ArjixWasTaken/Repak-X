use std::fs::File;
use std::io::{Read, Write};
use std::sync::OnceLock;

type Result<T, E = Error> = std::result::Result<T, E>;

pub use oodle_lz::{CompressionLevel, Compressor};

#[allow(non_snake_case)]
mod oodle_lz {
    #[derive(Debug, Clone, Copy)]
    #[repr(i32)]
    pub enum Compressor {
        /// None = memcpy, pass through uncompressed bytes
        None = 3,

        /// Fast decompression and high compression ratios, amazing!
        Kraken = 8,
        /// Leviathan = Kraken's big brother with higher compression, slightly slower decompression.
        Leviathan = 13,
        /// Mermaid is between Kraken & Selkie - crazy fast, still decent compression.
        Mermaid = 9,
        /// Selkie is a super-fast relative of Mermaid.  For maximum decode speed.
        Selkie = 11,
        /// Hydra, the many-headed beast = Leviathan, Kraken, Mermaid, or Selkie (see $OodleLZ_About_Hydra)
        Hydra = 12,
    }

    #[derive(Debug, Clone, Copy)]
    #[repr(i32)]
    pub enum CompressionLevel {
        /// don't compress, just copy raw bytes
        None = 0,
        /// super fast mode, lower compression ratio
        SuperFast = 1,
        /// fastest LZ mode with still decent compression ratio
        VeryFast = 2,
        /// fast - good for daily use
        Fast = 3,
        /// standard medium speed LZ mode
        Normal = 4,

        /// optimal parse level 1 (faster optimal encoder)
        Optimal1 = 5,
        /// optimal parse level 2 (recommended baseline optimal encoder)
        Optimal2 = 6,
        /// optimal parse level 3 (slower optimal encoder)
        Optimal3 = 7,
        /// optimal parse level 4 (very slow optimal encoder)
        Optimal4 = 8,
        /// optimal parse level 5 (don't care about encode speed, maximum compression)
        Optimal5 = 9,

        /// faster than SuperFast, less compression
        HyperFast1 = -1,
        /// faster than HyperFast2, less compression
        HyperFast2 = -2,
        /// faster than HyperFast2, less compression
        HyperFast3 = -3,
        /// fastest, less compression
        HyperFast4 = -4,
    }

    pub type Compress = unsafe extern "system" fn(
        compressor: Compressor,
        rawBuf: *const u8,
        rawLen: usize,
        compBuf: *mut u8,
        level: CompressionLevel,
        pOptions: *const (),
        dictionaryBase: *const (),
        lrm: *const (),
        scratchMem: *mut u8,
        scratchSize: usize,
    ) -> isize;

    pub type Decompress = unsafe extern "system" fn(
        compBuf: *const u8,
        compBufSize: usize,
        rawBuf: *mut u8,
        rawLen: usize,
        fuzzSafe: u32,
        checkCRC: u32,
        verbosity: u32,
        decBufBase: u64,
        decBufSize: usize,
        fpCallback: u64,
        callbackUserData: u64,
        decoderMemory: *mut u8,
        decoderMemorySize: usize,
        threadPhase: u32,
    ) -> isize;

    pub type GetCompressedBufferSizeNeeded =
        unsafe extern "system" fn(compressor: Compressor, rawSize: usize) -> usize;
}

#[cfg(target_os = "linux")]
const OODLE_LIB_NAME: &str = "liboo2corelinux64.so.9";
#[cfg(target_os = "linux")]
const OODLE_DOWNLOAD_URL: &str = "https://github.com/new-world-tools/go-oodle/releases/download/v0.2.3-files/liboo2corelinux64.so.9";

#[cfg(windows)]
const OODLE_LIB_NAME: &str = "oo2core_9_win64.dll";
#[cfg(windows)]
const OODLE_DOWNLOAD_URL: &str = "https://github.com/new-world-tools/go-oodle/releases/download/v0.2.3-files/oo2core_9_win64.dll";

/// Minimum valid size for the Oodle DLL (around 600KB for Windows)
/// A corrupted/truncated DLL will be smaller than this
const OODLE_MIN_VALID_SIZE: u64 = 500_000; // 500KB minimum

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error("Oodle lib hash mismatch expected: {expected} got {found}")]
    HashMismatch { expected: String, found: String },
    #[error("Oodle compression failed")]
    CompressionFailed,
    #[error("Oodle initialization failed previously")]
    InitializationFailed,
    #[error("IO error {0:?}")]
    Io(#[from] std::io::Error),
    #[error("Oodle libloading error {0:?}")]
    LibLoading(#[from] libloading::Error),
    #[error("Failed to download Oodle library: {0}")]
    DownloadFailed(String),
}

/// Check if the Oodle DLL exists and is valid (not corrupted/truncated)
fn is_oodle_valid(path: &std::path::Path) -> bool {
    if !path.exists() {
        return false;
    }
    
    match std::fs::metadata(path) {
        Ok(metadata) => {
            let size = metadata.len();
            if size < OODLE_MIN_VALID_SIZE {
                eprintln!("Oodle DLL at {:?} is too small ({} bytes), likely corrupted", path, size);
                return false;
            }
            true
        }
        Err(_) => false,
    }
}

/// Download the Oodle library from a reliable source
fn download_oodle(target_path: &std::path::Path) -> Result<()> {
    eprintln!("Downloading Oodle library from {}...", OODLE_DOWNLOAD_URL);
    
    // Use ureq for simple HTTP download (it's already a dependency in the workspace)
    let response = ureq::get(OODLE_DOWNLOAD_URL)
        .call()
        .map_err(|e| Error::DownloadFailed(format!("HTTP request failed: {}", e)))?;
    
    if response.status() != 200 {
        return Err(Error::DownloadFailed(format!(
            "HTTP status {}: {}",
            response.status(),
            response.status_text()
        )));
    }
    
    // Read the response body
    let mut bytes = Vec::new();
    response.into_reader()
        .read_to_end(&mut bytes)
        .map_err(|e| Error::DownloadFailed(format!("Failed to read response: {}", e)))?;
    
    // Validate the downloaded size
    if (bytes.len() as u64) < OODLE_MIN_VALID_SIZE {
        return Err(Error::DownloadFailed(format!(
            "Downloaded file is too small ({} bytes), expected at least {} bytes",
            bytes.len(),
            OODLE_MIN_VALID_SIZE
        )));
    }
    
    // Write to file
    let mut file = File::create(target_path)?;
    file.write_all(&bytes)?;
    
    eprintln!("Successfully downloaded Oodle library ({} bytes) to {:?}", bytes.len(), target_path);
    Ok(())
}

fn fetch_oodle() -> Result<std::path::PathBuf> {
    let oodle_path = std::env::current_exe()?.with_file_name(OODLE_LIB_NAME);
    
    // Check if existing DLL is valid
    if !is_oodle_valid(&oodle_path) {
        // Remove corrupted file if it exists
        if oodle_path.exists() {
            eprintln!("Removing corrupted/invalid Oodle DLL at {:?}", oodle_path);
            std::fs::remove_file(&oodle_path).ok();
        }
        
        // Download fresh copy
        download_oodle(&oodle_path)?;
    }
    
    Ok(oodle_path)
}

pub struct Oodle {
    _library: libloading::Library,
    compress: oodle_lz::Compress,
    decompress: oodle_lz::Decompress,
    get_compressed_buffer_size_needed: oodle_lz::GetCompressedBufferSizeNeeded,
}
impl Oodle {
    pub fn compress(
        &self,
        input: &[u8],
        compressor: Compressor,
        compression_level: CompressionLevel,
    ) -> Result<Vec<u8>> {
        unsafe {
            let buffer_size = self.get_compressed_buffer_size_needed(compressor, input.len());
            let mut buffer = vec![0; buffer_size];

            let len = (self.compress)(
                compressor,
                input.as_ptr(),
                input.len(),
                buffer.as_mut_ptr(),
                compression_level,
                std::ptr::null(),
                std::ptr::null(),
                std::ptr::null(),
                std::ptr::null_mut(),
                0,
            );

            if len == -1 {
                return Err(Error::CompressionFailed);
            }
            buffer.truncate(len as usize);

            Ok(buffer)
        }
    }
    pub fn decompress(&self, input: &[u8], output: &mut [u8]) -> isize {
        unsafe {
            (self.decompress)(
                input.as_ptr(),
                input.len(),
                output.as_mut_ptr(),
                output.len(),
                1,
                1,
                0,
                0,
                0,
                0,
                0,
                std::ptr::null_mut(),
                0,
                3,
            )
        }
    }
    fn get_compressed_buffer_size_needed(
        &self,
        compressor: oodle_lz::Compressor,
        raw_buffer: usize,
    ) -> usize {
        unsafe { (self.get_compressed_buffer_size_needed)(compressor, raw_buffer) }
    }
}

static OODLE: OnceLock<Option<Oodle>> = OnceLock::new();

fn load_oodle() -> Result<Oodle> {
    let path = fetch_oodle()?;
    unsafe {
        let library = libloading::Library::new(path)?;
        Ok(Oodle {
            compress: *library.get(b"OodleLZ_Compress")?,
            decompress: *library.get(b"OodleLZ_Decompress")?,
            get_compressed_buffer_size_needed: *library
                .get(b"OodleLZ_GetCompressedBufferSizeNeeded")?,
            _library: library,
        })
    }
}

pub fn oodle() -> Result<&'static Oodle> {
    let mut result = None;
    let oodle = OODLE.get_or_init(|| match load_oodle() {
        Err(err) => {
            result = Some(Err(err));
            None
        }
        Ok(oodle) => Some(oodle),
    });
    match (result, oodle) {
        // oodle initialized so return
        (_, Some(oodle)) => Ok(oodle),
        // error during initialization
        (Some(result), _) => result?,
        // no error because initialization was tried and failed before
        _ => Err(Error::InitializationFailed),
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn test_oodle() {
        let oodle = oodle().unwrap();

        let data = b"In tools and when compressing large inputs in one call, consider using
        $OodleXLZ_Compress_AsyncAndWait (in the Oodle2 Ext lib) instead to get parallelism. Alternatively,
        chop the data into small fixed size chunks (we recommend at least 256KiB, i.e. 262144 bytes) and
        call compress on each of them, which decreases compression ratio but makes for trivial parallel
        compression and decompression.";

        let buffer = oodle
            .compress(data, Compressor::Mermaid, CompressionLevel::Optimal5)
            .unwrap();

        dbg!((data.len(), buffer.len()));

        let mut uncomp = vec![0; data.len()];
        oodle.decompress(&buffer, &mut uncomp);

        assert_eq!(data[..], uncomp[..]);
    }
}
