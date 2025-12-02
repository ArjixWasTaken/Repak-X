//! P2P Manager - WebRTC with File Transfer

use crate::p2p_libp2p::ShareInfo;
use crate::p2p_sharing::{ShareableModPack, ShareSession, TransferProgress, TransferStatus, P2PError, P2PResult};
use crate::p2p_webrtc::{self, WebRTCSignal, ReceiverProgress};
use log::{info, error};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::Mutex;
use base64::Engine;
use webrtc::peer_connection::RTCPeerConnection;
use webrtc::data_channel::RTCDataChannel;
use tokio::sync::mpsc;

pub struct UnifiedP2PManager {
    instance_id: String,
    pub active_shares: Arc<Mutex<HashMap<String, ActiveShare>>>,
    pub active_downloads: Arc<Mutex<HashMap<String, ActiveDownload>>>,
}

pub struct ActiveShare {
    pub session: ShareSession,
    pub mod_pack: ShareableModPack,
    pub mod_paths: Vec<PathBuf>,
    pub peer_connection: Option<Arc<RTCPeerConnection>>,
    pub data_channel: Option<Arc<RTCDataChannel>>,
    pub encryption_key: [u8; 32],
}

pub struct ActiveDownload {
    pub share_info: ShareInfo,
    pub progress: TransferProgress,
    pub output_dir: PathBuf,
    pub peer_connection: Option<Arc<RTCPeerConnection>>,
    pub encryption_key: [u8; 32],
}

impl UnifiedP2PManager {
    pub async fn new() -> P2PResult<Self> {
        let id = format!("repak-{}", &uuid::Uuid::new_v4().to_string()[..8]);
        info!("[P2P] Initialized: {}", id);
        Ok(Self {
            instance_id: id,
            active_shares: Arc::new(Mutex::new(HashMap::new())),
            active_downloads: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    pub async fn start_sharing(
        &self,
        name: String,
        desc: String,
        paths: Vec<PathBuf>,
        creator: Option<String>,
    ) -> P2PResult<ShareInfo> {
        info!("[P2P] Sharing: {}", name);
        
        let pack = crate::p2p_sharing::create_mod_pack(name.clone(), desc, &paths, creator)?;
        let code = crate::p2p_sharing::generate_share_code();
        let key = crate::p2p_sharing::generate_encryption_key();
        let key_b64 = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(&key);

        let pc = p2p_webrtc::create_peer_connection().await
            .map_err(|e| P2PError::ConnectionError(e))?;
        let (offer, dc) = p2p_webrtc::create_offer_with_channel(&pc).await
            .map_err(|e| P2PError::ConnectionError(e))?;

        let files: Vec<(String, PathBuf)> = pack.mods.iter()
            .zip(paths.iter())
            .map(|(m, p)| (m.filename.clone(), p.clone()))
            .collect();
        p2p_webrtc::setup_sharer_channel(dc.clone(), files, key);

        let offer_enc = offer.encode().map_err(|e| P2PError::ValidationError(e))?;
        let share_info = ShareInfo {
            peer_id: self.instance_id.clone(),
            addresses: vec![offer_enc],
            encryption_key: key_b64.clone(),
            share_code: code.clone(),
        };

        let conn = share_info.encode()
            .map_err(|e| P2PError::ValidationError(format!("{}", e)))?;
        
        let sess = ShareSession {
            share_code: code.clone(),
            encryption_key: key_b64,
            local_ip: "webrtc".into(),
            obfuscated_ip: "[WebRTC]".into(),
            port: 0,
            connection_string: conn.clone(),
            obfuscated_connection_string: format!("Code: {}", code),
            active: true,
        };

        self.active_shares.lock().insert(code.clone(), ActiveShare {
            session: sess,
            mod_pack: pack,
            mod_paths: paths,
            peer_connection: Some(pc),
            data_channel: Some(dc),
            encryption_key: key,
        });

        info!("[P2P] Ready: {} chars", conn.len());
        Ok(share_info)
    }

    pub fn stop_sharing(&self, code: &str) -> P2PResult<()> {
        if let Some(s) = self.active_shares.lock().remove(code) {
            if let Some(pc) = s.peer_connection {
                tokio::spawn(async move { let _ = pc.close().await; });
            }
        }
        Ok(())
    }

    pub async fn start_receiving(
        &self,
        conn: &str,
        out: PathBuf,
        _name: Option<String>,
    ) -> P2PResult<()> {
        info!("[P2P] Receiving to: {}", out.display());
        
        let share_info = ShareInfo::decode(conn)
            .map_err(|e| P2PError::ValidationError(format!("{}", e)))?;
        let offer_enc = share_info.addresses.first()
            .ok_or_else(|| P2PError::ValidationError("No offer".into()))?;
        let offer = WebRTCSignal::decode(offer_enc)
            .map_err(|e| P2PError::ValidationError(e))?;
        let key = derive_key(&share_info.encryption_key)?;

        let pc = p2p_webrtc::create_peer_connection().await
            .map_err(|e| P2PError::ConnectionError(e))?;
        let code = share_info.share_code.clone();
        
        let (tx, mut rx) = mpsc::channel::<ReceiverProgress>(100);
        p2p_webrtc::setup_receiver_channel(pc.clone(), out.clone(), key, tx);

        self.active_downloads.lock().insert(code.clone(), ActiveDownload {
            share_info,
            progress: TransferProgress {
                current_file: String::new(),
                files_completed: 0,
                total_files: 0,
                bytes_transferred: 0,
                total_bytes: 0,
                status: TransferStatus::Connecting,
            },
            output_dir: out,
            peer_connection: Some(pc.clone()),
            encryption_key: key,
        });

        let _ = p2p_webrtc::create_answer(&pc, &offer).await
            .map_err(|e| P2PError::ConnectionError(e))?;

        let dl = self.active_downloads.clone();
        let c = code.clone();
        tokio::spawn(async move {
            while let Some(p) = rx.recv().await {
                if let Some(d) = dl.lock().get_mut(&c) {
                    match p {
                        ReceiverProgress::PackInfo(f) => {
                            d.progress.total_files = f.len();
                            d.progress.total_bytes = f.iter().map(|x| x.size).sum();
                            d.progress.status = TransferStatus::Transferring;
                        }
                        ReceiverProgress::ChunkReceived { filename, .. } => {
                            d.progress.current_file = filename;
                            d.progress.bytes_transferred += 16384;
                        }
                        ReceiverProgress::FileComplete(_) => {
                            d.progress.files_completed += 1;
                        }
                        ReceiverProgress::Complete => {
                            d.progress.status = TransferStatus::Completed;
                        }
                        ReceiverProgress::Error(e) => {
                            d.progress.status = TransferStatus::Failed(e);
                        }
                    }
                }
            }
        });

        let dl2 = self.active_downloads.clone();
        let c2 = code.clone();
        tokio::spawn(async move {
            if let Err(e) = p2p_webrtc::wait_for_connection(&pc, 60).await {
                if let Some(d) = dl2.lock().get_mut(&c2) {
                    d.progress.status = TransferStatus::Failed(e);
                }
            }
        });

        Ok(())
    }

    pub fn get_share_session(&self, code: &str) -> Option<ShareSession> {
        self.active_shares.lock().get(code).map(|s| s.session.clone())
    }

    pub fn get_transfer_progress(&self, code: &str) -> Option<TransferProgress> {
        self.active_downloads.lock().get(code).map(|d| d.progress.clone())
    }

    pub fn is_sharing(&self, code: &str) -> bool {
        self.active_shares.lock().contains_key(code)
    }

    pub fn is_receiving(&self, code: &str) -> bool {
        self.active_downloads.lock().contains_key(code)
    }

    pub fn local_peer_id(&self) -> String {
        self.instance_id.clone()
    }

    pub fn listening_addresses(&self) -> Vec<String> {
        vec!["webrtc://p2p".into()]
    }
}

fn derive_key(b64: &str) -> P2PResult<[u8; 32]> {
    use sha2::{Sha256, Digest};
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(b64)
        .map_err(|e| P2PError::ValidationError(e.to_string()))?;
    let h = Sha256::digest(&bytes);
    let mut r = [0u8; 32];
    r.copy_from_slice(&h);
    Ok(r)
}

pub fn validate_connection_string(s: &str) -> P2PResult<bool> {
    let info = ShareInfo::decode(s)
        .map_err(|e| P2PError::ValidationError(format!("{}", e)))?;
    let offer = info.addresses.first()
        .ok_or_else(|| P2PError::ValidationError("No offer".into()))?;
    WebRTCSignal::decode(offer)
        .map(|_| true)
        .map_err(|e| P2PError::ValidationError(e))
}
