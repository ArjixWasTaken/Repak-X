import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VscFolder, VscFolderOpened, VscChevronRight, VscChevronDown, VscClose, VscNewFolder } from 'react-icons/vsc';
import { MdExtension, MdCreateNewFolder } from 'react-icons/md';
import './ExtensionModOverlay.css';

type FolderRecord = {
    id: string;
    name: string;
    is_root?: boolean;
};

type TreeNode = {
    id: string;
    name: string;
    children: TreeNode[];
    isVirtual: boolean;
    fullPath?: string;
    originalName?: string;
};

type ExtensionModOverlayProps = {
    isVisible: boolean;
    filePath: string | null;
    folders?: FolderRecord[];
    onInstall: (folderId: string | null) => Promise<void>;
    onCancel: () => void;
    onCreateFolder?: (name: string) => Promise<string | null>;
};

// Simplified folder tree for the overlay (reusing logic from DropZoneOverlay)
const buildTree = (folders: FolderRecord[]) => {
    const root: any = { id: 'root', name: 'root', children: {}, isVirtual: true };
    const sortedFolders = [...folders].sort((a, b) => a.name.localeCompare(b.name));

    sortedFolders.forEach(folder => {
        const parts = folder.id.split(/[/\\]/);
        let current = root;

        parts.forEach((part, index) => {
            if (!current.children[part]) {
                current.children[part] = {
                    name: part,
                    children: {},
                    isVirtual: true,
                    fullPath: parts.slice(0, index + 1).join('/')
                };
            }
            current = current.children[part];

            if (index === parts.length - 1) {
                current.id = folder.id;
                current.isVirtual = false;
                current.originalName = folder.name;
            }
        });
    });

    return root;
};

const convertToArray = (node: any): TreeNode[] => {
    if (!node.children) return [];
    const children = Object.values(node.children).map((child: any): TreeNode => ({
        id: child.id ?? child.fullPath ?? child.name,
        name: child.name,
        children: convertToArray(child),
        isVirtual: Boolean(child.isVirtual),
        fullPath: child.fullPath,
        originalName: child.originalName
    }));
    children.sort((a, b) => a.name.localeCompare(b.name));
    return children;
};

// Folder node component
const FolderNode = ({ node, selectedFolderId, onSelect, depth = 0 }: { node: TreeNode; selectedFolderId: string | null; onSelect: (id: string | null) => void; depth?: number }) => {
    const [isOpen, setIsOpen] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedFolderId === node.id;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!node.isVirtual) {
            onSelect(node.id);
        } else {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div className="ext-folder-node">
            <div
                className={`ext-folder-item ${isSelected ? 'selected' : ''} ${node.isVirtual ? 'virtual' : ''}`}
                onClick={handleClick}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
                <span className="folder-toggle" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                    {hasChildren ? (isOpen ? <VscChevronDown /> : <VscChevronRight />) : <span style={{ width: 16 }} />}
                </span>
                <span className="folder-icon">
                    {isSelected || isOpen ? <VscFolderOpened /> : <VscFolder />}
                </span>
                <span className="folder-name">{node.name}</span>
            </div>

            {hasChildren && isOpen && (
                <div className="ext-folder-children">
                    {node.children.map(child => (
                        <FolderNode
                            key={child.fullPath || child.id}
                            node={child}
                            selectedFolderId={selectedFolderId}
                            onSelect={onSelect}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const ExtensionModOverlay = ({
    isVisible,
    filePath,
    folders = [],
    onInstall,
    onCancel,
    onCreateFolder
}: ExtensionModOverlayProps) => {
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const folderTreeRef = useRef<HTMLDivElement | null>(null);

    const rootFolder = useMemo(() => folders.find((f: FolderRecord) => f.is_root), [folders]);
    const subfolders = useMemo(() => folders.filter(f => !f.is_root), [folders]);
    const treeData = useMemo(() => {
        const root = buildTree(subfolders);
        return convertToArray(root);
    }, [subfolders]);

    // Extract filename from path
    const fileName = useMemo(() => {
        if (!filePath) return 'Unknown file';
        const parts = filePath.split(/[/\\]/);
        return parts[parts.length - 1];
    }, [filePath]);

    // Reset state when overlay becomes visible
    useEffect(() => {
        if (isVisible) {
            setSelectedFolderId(null);
            setIsInstalling(false);
        }
    }, [isVisible]);

    const handleInstall = async () => {
        if (isInstalling) return;

        setIsInstalling(true);
        try {
            await onInstall(selectedFolderId);
        } catch (err) {
            console.error('Install failed:', err);
        } finally {
            setIsInstalling(false);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        // Only close if clicking the backdrop itself
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    const handleNewFolder = async () => {
        const name = prompt('Enter new folder name:');
        if (!name || !name.trim()) return;

        setIsCreatingFolder(true);
        try {
            if (onCreateFolder) {
                const newFolderId = await onCreateFolder(name.trim());
                if (newFolderId) {
                    setSelectedFolderId(newFolderId);
                }
            }
        } catch (err) {
            console.error('Failed to create folder:', err);
        } finally {
            setIsCreatingFolder(false);
        }
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className="extension-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleBackdropClick}
                >
                    <motion.div
                        className="extension-panel"
                        initial={{ y: 50, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 50, opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                        {/* Header */}
                        <div className="extension-header">
                            <div className="extension-icon">
                                <MdExtension />
                            </div>
                            <div className="extension-title">
                                <h2>Mod from Repak X Extension</h2>
                                <p className="file-name" title={filePath ?? undefined}>{fileName}</p>
                            </div>
                            <button className="close-btn" onClick={onCancel}>
                                <VscClose />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="extension-content">
                            <div className="folder-section">
                                <div className="section-header">
                                    <MdCreateNewFolder />
                                    <span>Choose installation folder</span>
                                    <button
                                        className="btn-new-folder"
                                        onClick={handleNewFolder}
                                        disabled={isCreatingFolder}
                                        title="Create new folder"
                                    >
                                        <VscNewFolder />
                                        {isCreatingFolder ? 'Creating...' : 'New Folder'}
                                    </button>
                                </div>

                                <div className="folder-tree-container" ref={folderTreeRef}>
                                    {/* Root folder */}
                                    {rootFolder && (
                                        <div
                                            className={`ext-folder-item root-item ${selectedFolderId === rootFolder.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedFolderId(rootFolder.id)}
                                        >
                                            <span className="folder-icon"><VscFolderOpened /></span>
                                            <span className="folder-name">{rootFolder.name}</span>
                                        </div>
                                    )}

                                    {/* Subfolders */}
                                    <div className="ext-folder-tree">
                                        {treeData.map(node => (
                                            <FolderNode
                                                key={node.fullPath || node.id}
                                                node={node}
                                                selectedFolderId={selectedFolderId}
                                                onSelect={setSelectedFolderId}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {selectedFolderId && (
                                    <div className="selected-hint">
                                        Installing to: <strong>{selectedFolderId}</strong>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="extension-footer">
                            <button className="btn-cancel" onClick={onCancel}>
                                Cancel
                            </button>
                            <button
                                className={`btn-install ${isInstalling ? 'loading' : ''}`}
                                onClick={handleInstall}
                                disabled={isInstalling}
                            >
                                {isInstalling ? 'Installing...' : 'Install Mod'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ExtensionModOverlay;
