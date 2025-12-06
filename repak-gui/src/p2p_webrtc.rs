//! WebRTC P2P Module with File Transfer

use log::{info, warn, debug};
use std::sync::Arc;
use std::path::Path;
use std::collections::HashMap;
use tokio::sync::{mpsc, Mutex as TokioMutex};
use webrtc::api::APIBuilder;
use webrtc::api::interceptor_registry::register_default_interceptors;
use webrtc::api::media_engine::MediaEngine;
use webrtc::data_channel::data_channel_message::DataChannelMessage;
use webrtc::data_channel::RTCDataChannel;
use webrtc::ice_transport::ice_server::RTCIceServer;
use webrtc::interceptor::registry::Registry;
use webrtc::peer_connection::configuration::RTCConfiguration;
use webrtc::peer_connection::peer_connection_state::RTCPeerConnectionState;
use webrtc::peer_connection::sdp::session_description::RTCSessionDescription;
use webrtc::peer_connection::RTCPeerConnection;
use serde::{Deserialize, Serialize};
use base64::Engine;

const STUN_SERVERS: &[&str] = &[
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302",
];

const CHUNK_SIZE: usize = 16 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebRTCSignal {
    pub sdp: String,
    pub sdp_type: String,
    pub ice_candidates: Vec<String>,
}

impl WebRTCSignal {
    pub fn encode(&self) -> Result<String, String> {
        let json = serde_json::to_string(self).map_err(|e| e.to_string())?;
        Ok(base64::engine::general_purpose::STANDARD.encode(json.as_bytes()))
    }
    
    pub fn decode(encoded: &str) -> Result<Self, String> {
        let bytes = base64::engine::general_purpose::STANDARD.decode(encoded).map_err(|e| e.to_string())?;
        let json = String::from_utf8(bytes).map_err(|e| e.to_string())?;
        serde_json::from_str(&json).map_err(|e| e.to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TransferMessage {
    PackInfo { files: Vec<FileMetadata> },
    RequestPackInfo,
    RequestChunk { filename: String, index: u32 },
    Chunk { filename: String, index: u32, data: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub filename: String,
    pub size: u64,
    pub hash: String,
}

#[derive(Debug, Clone)]
pub enum ReceiverProgress {
    PackInfo(Vec<FileMetadata>),
    ChunkReceived { filename: String, index: u32 },
    FileComplete(String),
    Complete,
    Error(String),
}

fn create_rtc_config() -> RTCConfiguration {
    RTCConfiguration {
        ice_servers: vec![RTCIceServer {
            urls: STUN_SERVERS.iter().map(|s| s.to_string()).collect(),
            ..Default::default()
        }],
        ..Default::default()
    }
}

pub async fn create_peer_connection() -> Result<Arc<RTCPeerConnection>, String> {
    let mut me = MediaEngine::default();
    let mut reg = Registry::new();
    reg = register_default_interceptors(reg, &mut me).map_err(|e| e.to_string())?;
    let api = APIBuilder::new().with_media_engine(me).with_interceptor_registry(reg).build();
    let pc = api.new_peer_connection(create_rtc_config()).await.map_err(|e| e.to_string())?;
    Ok(Arc::new(pc))
}

pub async fn create_offer_with_channel(pc: &RTCPeerConnection) -> Result<(WebRTCSignal, Arc<RTCDataChannel>), String> {
    info!("[WebRTC] Creating offer...");
    let dc = pc.create_data_channel("file-transfer", None).await.map_err(|e| e.to_string())?;
    let offer = pc.create_offer(None).await.map_err(|e| e.to_string())?;
    pc.set_local_description(offer).await.map_err(|e| e.to_string())?;
    wait_ice(pc).await;
    let desc = pc.local_description().await.ok_or("No description")?;
    Ok((WebRTCSignal { sdp: desc.sdp, sdp_type: "offer".into(), ice_candidates: vec![] }, dc))
}

pub async fn create_answer(pc: &RTCPeerConnection, offer: &WebRTCSignal) -> Result<WebRTCSignal, String> {
    info!("[WebRTC] Creating answer...");
    let remote = RTCSessionDescription::offer(offer.sdp.clone()).map_err(|e| e.to_string())?;
    pc.set_remote_description(remote).await.map_err(|e| e.to_string())?;
    let answer = pc.create_answer(None).await.map_err(|e| e.to_string())?;
    pc.set_local_description(answer).await.map_err(|e| e.to_string())?;
    wait_ice(pc).await;
    let desc = pc.local_description().await.ok_or("No description")?;
    Ok(WebRTCSignal { sdp: desc.sdp, sdp_type: "answer".into(), ice_candidates: vec![] })
}

async fn wait_ice(pc: &RTCPeerConnection) {
    let (tx, mut rx) = mpsc::channel::<()>(1);
    let tx = Arc::new(TokioMutex::new(Some(tx)));
    pc.on_ice_gathering_state_change(Box::new(move |s| {
        if s == webrtc::ice_transport::ice_gatherer_state::RTCIceGathererState::Complete {
            let tx = tx.clone();
            Box::pin(async move { if let Some(t) = tx.lock().await.take() { let _ = t.send(()).await; } })
        } else { Box::pin(async {}) }
    }));
    tokio::select! {
        _ = rx.recv() => { info!("[WebRTC] ICE complete"); }
        _ = tokio::time::sleep(std::time::Duration::from_secs(10)) => { warn!("[WebRTC] ICE timeout"); }
    }
}

pub async fn wait_for_connection(pc: &RTCPeerConnection, timeout: u64) -> Result<(), String> {
    let (tx, mut rx) = mpsc::channel::<Result<(), String>>(1);
    let tx = Arc::new(TokioMutex::new(Some(tx)));
    pc.on_peer_connection_state_change(Box::new(move |s| {
        let tx = tx.clone();
        Box::pin(async move {
            match s {
                RTCPeerConnectionState::Connected => { if let Some(t) = tx.lock().await.take() { let _ = t.send(Ok(())).await; } }
                RTCPeerConnectionState::Failed => { if let Some(t) = tx.lock().await.take() { let _ = t.send(Err("Failed".into())).await; } }
                _ => {}
            }
        })
    }));
    tokio::select! {
        r = rx.recv() => r.unwrap_or(Err("Closed".into())),
        _ = tokio::time::sleep(std::time::Duration::from_secs(timeout)) => Err("Timeout".into())
    }
}

pub fn setup_sharer_channel(dc: Arc<RTCDataChannel>, files: Vec<(String, std::path::PathBuf)>, key: [u8; 32]) {
    let files = Arc::new(files);
    let key = Arc::new(key);
    dc.on_open(Box::new(|| { info!("[WebRTC] Sharer channel open"); Box::pin(async {}) }));
    let dc2 = dc.clone();
    let files2 = files.clone();
    let key2 = key.clone();
    dc.on_message(Box::new(move |msg: DataChannelMessage| {
        let dc = dc2.clone();
        let files = files2.clone();
        let key = key2.clone();
        Box::pin(async move {
            if let Ok(m) = serde_json::from_slice::<TransferMessage>(&msg.data) {
                match m {
                    TransferMessage::RequestPackInfo => {
                        let metas: Vec<FileMetadata> = files.iter().map(|(n, p)| {
                            let sz = std::fs::metadata(p).map(|m| m.len()).unwrap_or(0);
                            FileMetadata { filename: n.clone(), size: sz, hash: String::new() }
                        }).collect();
                        if let Ok(j) = serde_json::to_string(&TransferMessage::PackInfo { files: metas }) {
                            let _ = dc.send_text(j).await;
                        }
                    }
                    TransferMessage::RequestChunk { filename, index } => {
                        if let Some((_, path)) = files.iter().find(|(n, _)| n == &filename) {
                            if let Ok(data) = read_chunk(path, index, &key) {
                                if let Ok(j) = serde_json::to_string(&TransferMessage::Chunk { filename, index, data }) {
                                    let _ = dc.send_text(j).await;
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        })
    }));
}

pub fn setup_receiver_channel(pc: Arc<RTCPeerConnection>, out: std::path::PathBuf, key: [u8; 32], tx: mpsc::Sender<ReceiverProgress>) {
    let out = Arc::new(out);
    let key = Arc::new(key);
    let chunks: Arc<TokioMutex<HashMap<String, HashMap<u32, Vec<u8>>>>> = Arc::new(TokioMutex::new(HashMap::new()));
    let finfo: Arc<TokioMutex<HashMap<String, (u64, u32)>>> = Arc::new(TokioMutex::new(HashMap::new()));
    pc.on_data_channel(Box::new(move |dc: Arc<RTCDataChannel>| {
        let out = out.clone(); let key = key.clone(); let chunks = chunks.clone(); let finfo = finfo.clone(); let tx = tx.clone();
        Box::pin(async move {
            let dc2 = dc.clone();
            dc.on_open(Box::new(move || {
                let dc = dc2.clone();
                Box::pin(async move {
                    info!("[WebRTC] Receiver channel open");
                    if let Ok(j) = serde_json::to_string(&TransferMessage::RequestPackInfo) { let _ = dc.send_text(j).await; }
                })
            }));
            let dc3 = dc.clone(); let out2 = out.clone(); let key2 = key.clone(); let chunks2 = chunks.clone(); let finfo2 = finfo.clone(); let tx2 = tx.clone();
            dc.on_message(Box::new(move |msg: DataChannelMessage| {
                let dc = dc3.clone(); let out = out2.clone(); let key = key2.clone(); let chunks = chunks2.clone(); let finfo = finfo2.clone(); let tx = tx2.clone();
                Box::pin(async move {
                    if let Ok(m) = serde_json::from_slice::<TransferMessage>(&msg.data) {
                        match m {
                            TransferMessage::PackInfo { files } => {
                                let _ = tx.send(ReceiverProgress::PackInfo(files.clone())).await;
                                for f in &files { finfo.lock().await.insert(f.filename.clone(), (f.size, ((f.size as usize + CHUNK_SIZE - 1) / CHUNK_SIZE).max(1) as u32)); }
                                if let Some(f) = files.first() {
                                    if let Ok(j) = serde_json::to_string(&TransferMessage::RequestChunk { filename: f.filename.clone(), index: 0 }) { let _ = dc.send_text(j).await; }
                                }
                            }
                            TransferMessage::Chunk { filename, index, data } => {
                                if let Ok(dec) = decrypt_chunk(&data, &key) { chunks.lock().await.entry(filename.clone()).or_default().insert(index, dec); }
                                let done = { let i = finfo.lock().await; let c = chunks.lock().await; i.get(&filename).map(|(_, t)| c.get(&filename).map(|x| x.len() as u32 >= *t).unwrap_or(false)).unwrap_or(false) };
                                if done {
                                    let path = out.join(&filename);
                                    if let Some(p) = path.parent() { let _ = std::fs::create_dir_all(p); }
                                    { let c = chunks.lock().await; if let Some(fc) = c.get(&filename) { let mut d = Vec::new(); let mut idx: Vec<_> = fc.keys().collect(); idx.sort(); for i in idx { if let Some(x) = fc.get(i) { d.extend(x); } } let _ = std::fs::write(&path, &d); } }
                                    let _ = tx.send(ReceiverProgress::FileComplete(filename.clone())).await;
                                    chunks.lock().await.remove(&filename);
                                    let next = { let i = finfo.lock().await; let c = chunks.lock().await; i.keys().find(|f| !c.contains_key(*f) && !out.join(f).exists()).cloned() };
                                    if let Some(n) = next { if let Ok(j) = serde_json::to_string(&TransferMessage::RequestChunk { filename: n, index: 0 }) { let _ = dc.send_text(j).await; } }
                                    else { let _ = tx.send(ReceiverProgress::Complete).await; }
                                } else { if let Ok(j) = serde_json::to_string(&TransferMessage::RequestChunk { filename, index: index + 1 }) { let _ = dc.send_text(j).await; } }
                            }
                            _ => {}
                        }
                    }
                })
            }));
        })
    }));
}

fn read_chunk(path: &Path, idx: u32, key: &[u8; 32]) -> Result<String, String> {
    use std::io::{Read, Seek, SeekFrom};
    let mut f = std::fs::File::open(path).map_err(|e| e.to_string())?;
    f.seek(SeekFrom::Start((idx as usize * CHUNK_SIZE) as u64)).map_err(|e| e.to_string())?;
    let mut buf = vec![0u8; CHUNK_SIZE];
    let n = f.read(&mut buf).map_err(|e| e.to_string())?;
    buf.truncate(n);
    encrypt_chunk(&buf, key)
}

fn encrypt_chunk(data: &[u8], key: &[u8; 32]) -> Result<String, String> {
    use aes_gcm::{Aes256Gcm, KeyInit, aead::Aead, Nonce};
    use rand::RngCore;
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    let mut nonce = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce);
    let ct = cipher.encrypt(Nonce::from_slice(&nonce), data).map_err(|e| e.to_string())?;
    let mut r = nonce.to_vec(); r.extend(ct);
    Ok(base64::engine::general_purpose::STANDARD.encode(&r))
}

fn decrypt_chunk(data: &str, key: &[u8; 32]) -> Result<Vec<u8>, String> {
    use aes_gcm::{Aes256Gcm, KeyInit, aead::Aead, Nonce};
    let enc = base64::engine::general_purpose::STANDARD.decode(data).map_err(|e| e.to_string())?;
    if enc.len() < 12 { return Err("Too short".into()); }
    let (nonce, ct) = enc.split_at(12);
    let cipher = Aes256Gcm::new_from_slice(key).map_err(|e| e.to_string())?;
    cipher.decrypt(Nonce::from_slice(nonce), ct).map_err(|e| e.to_string())
}
