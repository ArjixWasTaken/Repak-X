//! P2P Relay Client - WebSocket-based secure file transfer
//!
//! All communication goes through a WebSocket relay server.
//! No direct peer connections = No IP exposure = No doxxing.
//!
//! Security:
//! - All file data is AES-256-GCM encrypted before transmission
//! - Encryption key is part of the share code (not sent over relay)
//! - Relay only sees encrypted blobs, cannot read file contents

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::Engine;
use futures_util::{SinkExt, StreamExt};
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use tokio_tungstenite::{connect_async, tungstenite::Message};

/// Chunk size for file transfers (64KB - small for relay efficiency)
const CHUNK_SIZE: usize = 64 * 1024;

/// ntfy.sh - Free, open-source pub/sub notification service
/// No API key required, topics are created on-the-fly
/// WebSocket for subscribe: wss://ntfy.sh/<topic>/ws
/// HTTP POST for publish: https://ntfy.sh/<topic>
const NTFY_WS_URL: &str = "wss://ntfy.sh";
const NTFY_HTTP_URL: &str = "https://ntfy.sh";

// ============================================================================
// RELAY MESSAGE PROTOCOL
// ============================================================================

/// Messages sent over the relay
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum RelayMessage {
    /// Join a share room
    Join {
        room: String,
        instance_id: String,
        role: String, // "sharer" or "receiver"
    },
    /// Sharer announces pack info
    PackInfo {
        room: String,
        from: String,
        pack_json: String, // Encrypted
    },
    /// Receiver requests pack info
    RequestPackInfo {
        room: String,
        from: String,
    },
    /// Request a file chunk
    ChunkRequest {
        room: String,
        from: String,
        to: String,
        filename: String,
        chunk_index: u32,
    },
    /// File chunk data
    ChunkData {
        room: String,
        from: String,
        to: String,
        filename: String,
        chunk_index: u32,
        data: String, // Base64 encoded encrypted data
        total_chunks: u32,
        file_hash: String,
    },
    /// Transfer complete
    TransferComplete {
        room: String,
        from: String,
    },
    /// Error
    Error {
        room: String,
        message: String,
    },
    /// Ping to keep connection alive
    Ping {
        room: String,
        from: String,
    },
}

// ============================================================================
// ENCRYPTION HELPERS
// ============================================================================

/// Encrypt data with AES-256-GCM
pub fn encrypt_data(data: &[u8], key: &[u8]) -> Result<Vec<u8>, String> {
    if key.len() != 32 {
        return Err(format!("Invalid key length: {} (expected 32)", key.len()));
    }

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    // Generate random nonce
    let nonce_bytes: [u8; 12] = rand::random();
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, data)
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Prepend nonce to ciphertext
    let mut result = nonce_bytes.to_vec();
    result.extend(ciphertext);
    Ok(result)
}

/// Decrypt data with AES-256-GCM
pub fn decrypt_data(encrypted: &[u8], key: &[u8]) -> Result<Vec<u8>, String> {
    if key.len() != 32 {
        return Err(format!("Invalid key length: {} (expected 32)", key.len()));
    }
    if encrypted.len() < 12 {
        return Err("Encrypted data too short".to_string());
    }

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Failed to create cipher: {}", e))?;

    let nonce = Nonce::from_slice(&encrypted[..12]);
    let ciphertext = &encrypted[12..];

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))
}

/// Derive 32-byte key from base64 encryption key
pub fn derive_key(key_b64: &str) -> Result<[u8; 32], String> {
    let key_bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(key_b64)
        .map_err(|e| format!("Invalid key encoding: {}", e))?;

    if key_bytes.len() >= 32 {
        let mut key = [0u8; 32];
        key.copy_from_slice(&key_bytes[..32]);
        Ok(key)
    } else {
        // Pad with SHA256 hash if key is too short
        let mut hasher = Sha256::new();
        hasher.update(&key_bytes);
        let hash = hasher.finalize();
        let mut key = [0u8; 32];
        key.copy_from_slice(&hash);
        Ok(key)
    }
}

// ============================================================================
// RELAY CLIENT
// ============================================================================

/// WebSocket relay client for P2P file transfer
pub struct RelayClient {
    instance_id: String,
    topic: String,
    tx: mpsc::UnboundedSender<RelayMessage>,
    connected: Arc<RwLock<bool>>,
    http_client: reqwest::Client,
}

impl RelayClient {
    /// Connect to the relay server for a specific room
    pub async fn connect(instance_id: String) -> Result<(Self, mpsc::UnboundedReceiver<RelayMessage>), String> {
        // Use a default channel - will be overridden by connect_to_room
        Self::connect_to_room(instance_id, "lobby").await
    }
    
    /// Connect to a specific room/channel on the relay
    pub async fn connect_to_room(instance_id: String, room: &str) -> Result<(Self, mpsc::UnboundedReceiver<RelayMessage>), String> {
        // Clean room name for ntfy topic (alphanumeric and dashes only, lowercase)
        let clean_room = room.replace("/", "").replace("_", "-").to_lowercase();
        let ws_url = format!("{}/{}/ws", NTFY_WS_URL, clean_room);
        
        info!("[P2P Relay] Connecting to ntfy.sh relay...");
        info!("[P2P Relay] Topic: {}", clean_room);
        info!("[P2P Relay] WebSocket URL: {}", ws_url);
        
        // Create HTTP client for publishing
        let http_client = reqwest::Client::new();
        
        let (ws_stream, response) = connect_async(&ws_url)
            .await
            .map_err(|e| format!("WebSocket connection failed: {}", e))?;
        
        info!("[P2P Relay] Connected! Status: {}", response.status());
        
        let topic = clean_room.clone();

        let (_write, mut read) = ws_stream.split();
        let (tx, mut internal_rx) = mpsc::unbounded_channel::<RelayMessage>();
        let (event_tx, event_rx) = mpsc::unbounded_channel::<RelayMessage>();
        let connected = Arc::new(RwLock::new(true));
        let connected_clone = connected.clone();

        // Spawn HTTP publisher task (ntfy uses HTTP POST to publish, not WebSocket)
        let publish_topic = topic.clone();
        let publish_client = http_client.clone();
        tokio::spawn(async move {
            let publish_url = format!("{}/{}", NTFY_HTTP_URL, publish_topic);
            while let Some(msg) = internal_rx.recv().await {
                let json = match serde_json::to_string(&msg) {
                    Ok(j) => j,
                    Err(e) => {
                        error!("[P2P Relay] Failed to serialize message: {}", e);
                        continue;
                    }
                };
                info!("[P2P Relay] >>> PUBLISHING to {}: {}", publish_topic, &json[..json.len().min(300)]);
                
                // Publish via HTTP POST
                match publish_client.post(&publish_url)
                    .body(json.clone())
                    .send()
                    .await 
                {
                    Ok(resp) => {
                        if resp.status().is_success() {
                            debug!("[P2P Relay] Published successfully");
                        } else {
                            error!("[P2P Relay] Publish failed: {}", resp.status());
                        }
                    }
                    Err(e) => {
                        error!("[P2P Relay] Publish error: {}", e);
                    }
                }
            }
            info!("[P2P Relay] Publisher task ended");
        });

        // Spawn reader task
        // ntfy.sh sends messages in format: {"id":"x","time":123,"event":"message","topic":"t","message":"..."}
        tokio::spawn(async move {
            while let Some(msg_result) = read.next().await {
                match msg_result {
                    Ok(Message::Text(text)) => {
                        info!("[P2P Relay] <<< RECEIVED: {}", &text[..text.len().min(500)]);
                        
                        // Try to parse as ntfy.sh message format first
                        if let Ok(ntfy_msg) = serde_json::from_str::<serde_json::Value>(&text) {
                            // Check if it's an ntfy event
                            if let Some(event) = ntfy_msg.get("event").and_then(|e| e.as_str()) {
                                match event {
                                    "open" => {
                                        info!("[P2P Relay] ntfy connection opened");
                                        continue;
                                    }
                                    "keepalive" => {
                                        debug!("[P2P Relay] ntfy keepalive");
                                        continue;
                                    }
                                    "message" => {
                                        // Extract the actual message content
                                        if let Some(msg_content) = ntfy_msg.get("message").and_then(|m| m.as_str()) {
                                            // Parse the message content as our RelayMessage
                                            match serde_json::from_str::<RelayMessage>(msg_content) {
                                                Ok(relay_msg) => {
                                                    info!("[P2P Relay] Parsed RelayMessage: {:?}", std::mem::discriminant(&relay_msg));
                                                    if let Err(e) = event_tx.send(relay_msg) {
                                                        error!("[P2P Relay] Failed to forward message: {}", e);
                                                        break;
                                                    }
                                                }
                                                Err(e) => {
                                                    warn!("[P2P Relay] Failed to parse message content: {} - {}", e, msg_content);
                                                }
                                            }
                                        }
                                        continue;
                                    }
                                    _ => {
                                        debug!("[P2P Relay] Unknown ntfy event: {}", event);
                                        continue;
                                    }
                                }
                            }
                        }
                        
                        // Fallback: try to parse directly as RelayMessage
                        match serde_json::from_str::<RelayMessage>(&text) {
                            Ok(relay_msg) => {
                                info!("[P2P Relay] Parsed as direct RelayMessage: {:?}", std::mem::discriminant(&relay_msg));
                                if let Err(e) = event_tx.send(relay_msg) {
                                    error!("[P2P Relay] Failed to forward message: {}", e);
                                    break;
                                }
                            }
                            Err(e) => {
                                debug!("[P2P Relay] Ignoring non-protocol message: {}", &text[..text.len().min(100)]);
                            }
                        }
                    }
                    Ok(Message::Ping(_)) => {
                        debug!("[P2P Relay] Received ping");
                    }
                    Ok(Message::Pong(_)) => {
                        debug!("[P2P Relay] Received pong");
                    }
                    Ok(Message::Close(frame)) => {
                        info!("[P2P Relay] Connection closed: {:?}", frame);
                        *connected_clone.write().await = false;
                        break;
                    }
                    Ok(_) => {}
                    Err(e) => {
                        error!("[P2P Relay] Read error: {}", e);
                        *connected_clone.write().await = false;
                        break;
                    }
                }
            }
            info!("[P2P Relay] Reader task ended");
        });

        Ok((
            Self {
                instance_id,
                topic,
                tx,
                connected,
                http_client,
            },
            event_rx,
        ))
    }

    /// Send a message to the relay
    pub fn send(&self, msg: RelayMessage) -> Result<(), String> {
        self.tx
            .send(msg)
            .map_err(|e| format!("Failed to send: {}", e))
    }

    /// Announce presence in the room
    pub fn join_room(&self, room: &str, role: &str) -> Result<(), String> {
        info!("[P2P Relay] Announcing presence in room '{}' as {}", room, role);
        // Send a join message so other clients know we're here
        self.send(RelayMessage::Join {
            room: room.to_string(),
            instance_id: self.instance_id.clone(),
            role: role.to_string(),
        })
    }

    /// Check if connected
    pub async fn is_connected(&self) -> bool {
        *self.connected.read().await
    }

    /// Get instance ID
    pub fn instance_id(&self) -> &str {
        &self.instance_id
    }
}

// ============================================================================
// FILE TRANSFER HELPERS
// ============================================================================

/// Read a file and split into chunks
pub fn read_file_chunks(path: &Path) -> Result<(Vec<Vec<u8>>, String), String> {
    use std::fs::File;
    use std::io::Read;

    info!("[P2P Transfer] Reading file: {}", path.display());

    let mut file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;

    let mut contents = Vec::new();
    file.read_to_end(&mut contents)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Calculate hash
    let mut hasher = Sha256::new();
    hasher.update(&contents);
    let hash = hex::encode(hasher.finalize());

    info!(
        "[P2P Transfer] File size: {} bytes, hash: {}",
        contents.len(),
        &hash[..16]
    );

    // Split into chunks
    let chunks: Vec<Vec<u8>> = contents.chunks(CHUNK_SIZE).map(|c| c.to_vec()).collect();

    info!("[P2P Transfer] Split into {} chunks", chunks.len());

    Ok((chunks, hash))
}

/// Write chunks to a file
pub fn write_file_from_chunks(
    path: &Path,
    chunks: &HashMap<u32, Vec<u8>>,
    total_chunks: u32,
    expected_hash: &str,
) -> Result<(), String> {
    use std::fs::File;
    use std::io::Write;

    info!(
        "[P2P Transfer] Writing file: {} ({} chunks)",
        path.display(),
        total_chunks
    );

    // Ensure we have all chunks
    for i in 0..total_chunks {
        if !chunks.contains_key(&i) {
            return Err(format!("Missing chunk {}", i));
        }
    }

    // Combine chunks
    let mut contents = Vec::new();
    for i in 0..total_chunks {
        contents.extend(&chunks[&i]);
    }

    // Verify hash
    let mut hasher = Sha256::new();
    hasher.update(&contents);
    let actual_hash = hex::encode(hasher.finalize());

    if actual_hash != expected_hash {
        return Err(format!(
            "Hash mismatch: expected {}, got {}",
            expected_hash, actual_hash
        ));
    }

    info!("[P2P Transfer] Hash verified: {}", &actual_hash[..16]);

    // Create parent directories
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories: {}", e))?;
    }

    // Write file
    let mut file = File::create(path).map_err(|e| format!("Failed to create file: {}", e))?;

    file.write_all(&contents)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    info!(
        "[P2P Transfer] File written successfully: {} bytes",
        contents.len()
    );

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_roundtrip() {
        let key = [0u8; 32];
        let data = b"Hello, World!";

        let encrypted = encrypt_data(data, &key).unwrap();
        let decrypted = decrypt_data(&encrypted, &key).unwrap();

        assert_eq!(data.to_vec(), decrypted);
    }
}
