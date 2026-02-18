import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdDownload, MdOpenInNew, MdClose } from 'react-icons/md';
import './UpdateAppModal.css';

type UpdateInfo = {
    latest?: string;
    url?: string;
    asset_url?: string;
    [key: string]: any;
};

type UpdateDownloadProgress = {
    status?: string;
    percentage?: number;
};

type UpdateAppModalProps = {
    isOpen: boolean;
    updateInfo: UpdateInfo | null;
    downloadProgress: UpdateDownloadProgress | null;
    downloadedPath: string | null;
    onDownload: () => void;
    onApply: () => void;
    onOpenReleasePage: (url: string) => void;
    onClose: () => void;
};

export default function UpdateAppModal({
    isOpen,
    updateInfo,
    downloadProgress,
    downloadedPath,
    onDownload,
    onApply,
    onOpenReleasePage,
    onClose
}: UpdateAppModalProps) {
    if (!isOpen || !updateInfo) return null;

    const isDownloading = downloadProgress?.status === 'downloading';
    const isReady = downloadProgress?.status === 'ready' || downloadedPath;
    const downloadPercent = downloadProgress?.percentage ?? 0;

    return (
        <AnimatePresence>
            <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="modal-content update-modal"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                >
                    <div className="modal-header">
                        <h2>🎉 Update Available!</h2>
                        <button className="modal-close" onClick={onClose}>
                            <MdClose />
                        </button>
                    </div>

                    <div className="modal-body">
                        <p className="update-version">
                            Version <strong>{updateInfo.latest}</strong> is available
                        </p>

                        {isDownloading && downloadProgress && (
                            <div className="download-progress">
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${downloadPercent}%` }}
                                    />
                                </div>
                                <span className="progress-text">
                                    {downloadPercent.toFixed(0)}%
                                </span>
                            </div>
                        )}

                        {isReady && (
                            <p className="update-ready">
                                ✅ Download complete! Click "Install & Restart" to apply the update.
                            </p>
                        )}
                    </div>

                    <div className="modal-footer">
                        {!isReady && !isDownloading && (
                            <>
                                <button
                                    className="btn-secondary"
                                    onClick={() => onOpenReleasePage(updateInfo.url || '')}
                                    disabled={!updateInfo.url}
                                >
                                    <MdOpenInNew /> View Release
                                </button>
                                {updateInfo.asset_url && (
                                    <button
                                        className="btn-primary"
                                        onClick={onDownload}
                                    >
                                        <MdDownload /> Download Update
                                    </button>
                                )}
                            </>
                        )}

                        {isReady && (
                            <button
                                className="btn-primary"
                                onClick={onApply}
                            >
                                Install & Restart
                            </button>
                        )}

                        <button className="btn-secondary" onClick={onClose}>
                            Later
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
