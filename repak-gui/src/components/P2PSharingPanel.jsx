import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share as ShareIcon, 
  Download as DownloadIcon, 
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  CheckCircle as CheckIcon,
  CloudUpload as UploadIcon,
  CloudDownload as CloudDownloadIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Security as SecurityIcon,
  Info as InfoIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

const P2PSharingPanel = ({ isOpen, onClose, installedMods, selectedMods, gamePath }) => {
  const [activeTab, setActiveTab] = useState('share'); // 'share' or 'receive'
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  
  // Share State
  const [packName, setPackName] = useState('');
  const [packDesc, setPackDesc] = useState('');
  const [shareSession, setShareSession] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [selectedModPaths, setSelectedModPaths] = useState(new Set());

  // Receive State
  const [connectionString, setConnectionString] = useState('');
  const [isReceiving, setIsReceiving] = useState(false);
  const [progress, setProgress] = useState(null);
  const [receiveComplete, setReceiveComplete] = useState(false);

  // Initialize selected mods from props
  useEffect(() => {
    if (isOpen && selectedMods && selectedMods.size > 0) {
      setSelectedModPaths(new Set(selectedMods));
      setPackName(`My Mod Pack (${selectedMods.size} mods)`);
    }
  }, [isOpen, selectedMods]);

  // Poll for status
  useEffect(() => {
    let interval;
    if (isOpen) {
      checkStatus();
      interval = setInterval(checkStatus, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  const checkStatus = async () => {
    try {
      const sharing = await invoke('p2p_is_sharing');
      setIsSharing(sharing);
      
      if (sharing) {
        const session = await invoke('p2p_get_share_session');
        setShareSession(session);
      }

      const receiving = await invoke('p2p_is_receiving');
      setIsReceiving(receiving);

      if (receiving) {
        const prog = await invoke('p2p_get_receive_progress');
        setProgress(prog);
        if (prog && prog.status && prog.status.hasOwnProperty('Completed')) {
            setReceiveComplete(true);
            setIsReceiving(false);
        }
      }
    } catch (err) {
      console.error("Status check failed:", err);
    }
  };

  const handleStartSharing = async () => {
    if (selectedModPaths.size === 0) {
      setError("Please select at least one mod to share.");
      return;
    }
    if (!packName.trim()) {
      setError("Please enter a pack name.");
      return;
    }

    try {
      setError('');
      setStatus('Starting share session...');
      const session = await invoke('p2p_start_sharing', {
        name: packName,
        description: packDesc,
        modPaths: Array.from(selectedModPaths),
        creator: "User" // Could be configurable
      });
      setShareSession(session);
      setIsSharing(true);
      setStatus('Sharing active!');
    } catch (err) {
      setError(`Failed to start sharing: ${err}`);
      setStatus('');
    }
  };

  const handleStopSharing = async () => {
    try {
      await invoke('p2p_stop_sharing');
      setShareSession(null);
      setIsSharing(false);
      setStatus('Sharing stopped.');
    } catch (err) {
      setError(`Failed to stop sharing: ${err}`);
    }
  };

  const handleStartReceiving = async () => {
    if (!connectionString.trim()) {
      setError("Please enter a connection string.");
      return;
    }

    try {
      setError('');
      setStatus('Connecting...');
      
      // Validate first
      await invoke('p2p_validate_connection_string', { connectionString });
      
      // Start receiving
      // We'll use a default 'ReceivedMods' folder or just the game path
      // The backend likely puts them in the game path directly or a subfolder?
      // The docs say "Connect and download all mods to the specified directory"
      // Let's use the game path (mods folder)
      await invoke('p2p_start_receiving', {
        connectionString,
        outputDir: gamePath,
        clientName: "User"
      });
      
      setIsReceiving(true);
      setReceiveComplete(false);
      setStatus('Download started...');
    } catch (err) {
      setError(`Failed to start download: ${err}`);
      setStatus('');
    }
  };

  const handleStopReceiving = async () => {
    try {
      await invoke('p2p_stop_receiving');
      setIsReceiving(false);
      setStatus('Download cancelled.');
    } catch (err) {
      setError(`Failed to stop download: ${err}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setStatus('Copied to clipboard!');
    setTimeout(() => setStatus(''), 2000);
  };

  const toggleModSelection = (path) => {
    const newSet = new Set(selectedModPaths);
    if (newSet.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    setSelectedModPaths(newSet);
  };

  if (!isOpen) return null;

  return (
    <div className="p2p-overlay">
      <motion.div 
        className="p2p-modal"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <div className="p2p-header">
          <div className="p2p-title">
            <WifiIcon className="p2p-icon" />
            <h2>P2P Mod Sharing</h2>
          </div>
          <button onClick={onClose} className="btn-icon-close">
            <CloseIcon />
          </button>
        </div>

        <div className="p2p-tabs">
          <button 
            className={`p2p-tab ${activeTab === 'share' ? 'active' : ''}`}
            onClick={() => setActiveTab('share')}
          >
            <UploadIcon fontSize="small" /> Share Mods
          </button>
          <button 
            className={`p2p-tab ${activeTab === 'receive' ? 'active' : ''}`}
            onClick={() => setActiveTab('receive')}
          >
            <CloudDownloadIcon fontSize="small" /> Receive Mods
          </button>
        </div>

        <div className="p2p-content">
          {error && (
            <div className="p2p-error">
              <ErrorIcon fontSize="small" /> {error}
            </div>
          )}
          
          {status && !error && (
            <div className="p2p-status">
              <InfoIcon fontSize="small" /> {status}
            </div>
          )}

          {activeTab === 'share' && (
            <div className="share-view">
              {!isSharing ? (
                <>
                  <div className="form-group">
                    <label>Pack Name</label>
                    <input 
                      type="text" 
                      value={packName} 
                      onChange={(e) => setPackName(e.target.value)}
                      placeholder="e.g. My Awesome Skin Pack"
                      className="p2p-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Description (Optional)</label>
                    <textarea 
                      value={packDesc} 
                      onChange={(e) => setPackDesc(e.target.value)}
                      placeholder="Describe what's in this pack..."
                      className="p2p-textarea"
                    />
                  </div>
                  
                  <div className="mod-selection-list">
                    <label>Select Mods to Share ({selectedModPaths.size})</label>
                    <div className="mod-list-scroll">
                      {installedMods.map(mod => (
                        <div 
                          key={mod.path} 
                          className={`mod-select-item ${selectedModPaths.has(mod.path) ? 'selected' : ''}`}
                          onClick={() => toggleModSelection(mod.path)}
                        >
                          <input 
                            type="checkbox" 
                            checked={selectedModPaths.has(mod.path)}
                            readOnly
                          />
                          <span className="mod-name">
                            {mod.custom_name || mod.path.split('\\').pop()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleStartSharing} className="btn-primary btn-large">
                    <ShareIcon /> Start Sharing
                  </button>
                </>
              ) : (
                <div className="active-share-view">
                  <div className="success-banner">
                    <CheckIcon /> Sharing Active
                  </div>
                  
                  <div className="share-code-display">
                    <label>SHARE CODE</label>
                    <div className="code-box">
                      {shareSession?.connection_string}
                      <button 
                        onClick={() => copyToClipboard(shareSession?.connection_string)}
                        className="btn-copy"
                        title="Copy to clipboard"
                      >
                        <CopyIcon />
                      </button>
                    </div>
                    <p className="hint">Share this code with your friend to let them download your pack.</p>
                  </div>

                  <div className="session-info">
                    <div className="info-row">
                      <span>Pack Name:</span>
                      <strong>{packName}</strong>
                    </div>
                    <div className="info-row">
                      <span>Mods:</span>
                      <strong>{selectedModPaths.size} files</strong>
                    </div>
                    <div className="info-row">
                      <span>Security:</span>
                      <span className="secure-badge"><SecurityIcon fontSize="inherit"/> AES-256 Encrypted</span>
                    </div>
                  </div>

                  <button onClick={handleStopSharing} className="btn-danger btn-large">
                    <WifiOffIcon /> Stop Sharing
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'receive' && (
            <div className="receive-view">
              {!isReceiving && !receiveComplete ? (
                <>
                  <div className="form-group">
                    <label>Enter Share Code</label>
                    <input 
                      type="text" 
                      value={connectionString} 
                      onChange={(e) => setConnectionString(e.target.value)}
                      placeholder="Paste the connection string here..."
                      className="p2p-input code-input"
                    />
                  </div>
                  
                  <div className="security-note">
                    <SecurityIcon fontSize="small" />
                    <p>Only connect to people you trust. All transfers are encrypted.</p>
                  </div>

                  <button onClick={handleStartReceiving} className="btn-primary btn-large">
                    <DownloadIcon /> Connect & Download
                  </button>
                </>
              ) : (
                <div className="transfer-progress-view">
                  {receiveComplete ? (
                    <div className="completion-state">
                      <CheckIcon className="success-icon-large" />
                      <h3>Download Complete!</h3>
                      <p>All mods have been installed successfully.</p>
                      <button 
                        onClick={() => {
                          setReceiveComplete(false);
                          setConnectionString('');
                          setProgress(null);
                        }} 
                        className="btn-secondary"
                      >
                        Download Another
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3>Downloading...</h3>
                      {progress && (
                        <div className="progress-container">
                          <div className="progress-info">
                            <span>{progress.current_file}</span>
                            <span>{Math.round((progress.files_completed / progress.total_files) * 100)}%</span>
                          </div>
                          <div className="progress-bar-track">
                            <div 
                              className="progress-bar-fill"
                              style={{ width: `${(progress.files_completed / progress.total_files) * 100}%` }}
                            />
                          </div>
                          <div className="progress-stats">
                            <span>{progress.files_completed} / {progress.total_files} files</span>
                            <span>{(progress.bytes_transferred / 1024 / 1024).toFixed(1)} MB transferred</span>
                          </div>
                          <div className="status-badge">
                            {typeof progress.status === 'string' ? progress.status : JSON.stringify(progress.status)}
                          </div>
                        </div>
                      )}
                      <button onClick={handleStopReceiving} className="btn-danger">
                        Cancel Download
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <style>{`
        .p2p-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .p2p-modal {
          background: #1e1e1e;
          width: 600px;
          max-width: 90vw;
          max-height: 85vh;
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid #333;
        }
        .p2p-header {
          padding: 1.5rem;
          border-bottom: 1px solid #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #252525;
        }
        .p2p-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .p2p-title h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #fff;
        }
        .p2p-icon {
          color: #4a9eff;
        }
        .btn-icon-close {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }
        .btn-icon-close:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
        .p2p-tabs {
          display: flex;
          border-bottom: 1px solid #333;
        }
        .p2p-tab {
          flex: 1;
          padding: 1rem;
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: 600;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
        }
        .p2p-tab:hover {
          background: rgba(255,255,255,0.05);
          color: #ccc;
        }
        .p2p-tab.active {
          color: #4a9eff;
          border-bottom-color: #4a9eff;
          background: rgba(74, 158, 255, 0.05);
        }
        .p2p-content {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }
        .form-group {
          margin-bottom: 1.25rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          color: #ccc;
          font-size: 0.9rem;
        }
        .p2p-input, .p2p-textarea {
          width: 100%;
          padding: 0.75rem;
          background: #111;
          border: 1px solid #333;
          border-radius: 6px;
          color: #fff;
          font-family: inherit;
        }
        .p2p-input:focus, .p2p-textarea:focus {
          border-color: #4a9eff;
          outline: none;
        }
        .p2p-textarea {
          min-height: 80px;
          resize: vertical;
        }
        .mod-selection-list {
          margin-bottom: 1.5rem;
          border: 1px solid #333;
          border-radius: 6px;
          overflow: hidden;
        }
        .mod-selection-list label {
          display: block;
          padding: 0.75rem;
          background: #252525;
          border-bottom: 1px solid #333;
          margin: 0;
          font-weight: 600;
        }
        .mod-list-scroll {
          max-height: 200px;
          overflow-y: auto;
          background: #111;
        }
        .mod-select-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0.75rem;
          border-bottom: 1px solid #222;
          cursor: pointer;
        }
        .mod-select-item:hover {
          background: rgba(255,255,255,0.05);
        }
        .mod-select-item.selected {
          background: rgba(74, 158, 255, 0.1);
        }
        .btn-primary, .btn-danger, .btn-secondary {
          width: 100%;
          padding: 0.75rem;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #4a9eff;
          color: #fff;
        }
        .btn-primary:hover {
          background: #3a8eef;
        }
        .btn-danger {
          background: #ff4a4a;
          color: #fff;
        }
        .btn-danger:hover {
          background: #ee3a3a;
        }
        .btn-secondary {
          background: #444;
          color: #fff;
        }
        .btn-secondary:hover {
          background: #555;
        }
        .p2p-error {
          background: rgba(255, 74, 74, 0.1);
          border: 1px solid rgba(255, 74, 74, 0.3);
          color: #ff6b6b;
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .p2p-status {
          background: rgba(74, 158, 255, 0.1);
          border: 1px solid rgba(74, 158, 255, 0.3);
          color: #4a9eff;
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .active-share-view {
          text-align: center;
        }
        .success-banner {
          background: rgba(46, 204, 113, 0.1);
          color: #2ecc71;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-weight: bold;
          font-size: 1.1rem;
        }
        .share-code-display {
          margin-bottom: 2rem;
        }
        .code-box {
          background: #000;
          border: 1px solid #444;
          padding: 1rem;
          border-radius: 6px;
          font-family: monospace;
          font-size: 1.1rem;
          color: #4a9eff;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 0.5rem;
          word-break: break-all;
        }
        .btn-copy {
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          padding: 4px;
        }
        .btn-copy:hover {
          color: #fff;
        }
        .hint {
          font-size: 0.85rem;
          color: #888;
          margin-top: 0.5rem;
        }
        .session-info {
          background: #252525;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          text-align: left;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }
        .info-row:last-child {
          margin-bottom: 0;
        }
        .secure-badge {
          color: #2ecc71;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
        }
        .code-input {
          font-family: monospace;
          font-size: 1.1rem;
          text-align: center;
          letter-spacing: 1px;
        }
        .security-note {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 193, 7, 0.1);
          padding: 0.75rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
          color: #ffc107;
          font-size: 0.9rem;
        }
        .progress-container {
          background: #252525;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
        }
        .progress-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }
        .progress-bar-track {
          height: 8px;
          background: #111;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }
        .progress-bar-fill {
          height: 100%;
          background: #4a9eff;
          transition: width 0.3s ease;
        }
        .progress-stats {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #888;
        }
        .status-badge {
          display: inline-block;
          margin-top: 0.5rem;
          padding: 2px 8px;
          background: #333;
          border-radius: 4px;
          font-size: 0.75rem;
          color: #ccc;
        }
        .completion-state {
          text-align: center;
          padding: 2rem 0;
        }
        .success-icon-large {
          font-size: 4rem !important;
          color: #2ecc71;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
};

export default P2PSharingPanel;
