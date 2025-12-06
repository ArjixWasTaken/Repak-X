import React, { useState, useMemo, useEffect } from 'react';
import { VscFolder, VscFolderOpened, VscLibrary, VscChevronRight, VscChevronDown } from 'react-icons/vsc';
import './FileTree.css';

const buildTree = (folders) => {
  const root = { id: 'root', name: 'root', children: {}, isVirtual: true };
  
  // Sort folders by name to ensure consistent tree building
  const sortedFolders = [...folders].sort((a, b) => a.name.localeCompare(b.name));

  sortedFolders.forEach(folder => {
    // Split by '/' or '\'
    const parts = folder.name.split(/[/\\]/);
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
      
      // If this is the last part, it's the actual folder
      if (index === parts.length - 1) {
        current.id = folder.id;
        current.isVirtual = false;
        current.originalName = folder.name;
      }
    });
  });
  
  return root;
};

const convertToArray = (node) => {
  if (!node.children) return [];
  const children = Object.values(node.children).map(child => ({
    ...child,
    children: convertToArray(child)
  }));
  // Sort: folders with children first? or alphabetical?
  // Let's stick to alphabetical for now
  children.sort((a, b) => a.name.localeCompare(b.name));
  return children;
};

const FolderNode = ({ node, selectedFolderId, onSelect, onDelete, getCount, hasFilters }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  
  // Auto-expand if a child is selected
  useEffect(() => {
    const containsSelection = (n) => {
      if (n.id === selectedFolderId) return true;
      if (n.children) {
        return n.children.some(containsSelection);
      }
      return false;
    };
    if (containsSelection(node)) {
      setIsOpen(true);
    }
  }, [selectedFolderId, node]);

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleSelect = (e) => {
    e.stopPropagation();
    if (!node.isVirtual) {
      onSelect(node.id);
    } else {
      // If virtual, maybe just toggle?
      setIsOpen(!isOpen);
    }
  };

  const count = !node.isVirtual ? getCount(node.id) : 0;
  
  // Hide empty folders when filters are active (only for real folders)
  if (hasFilters && !node.isVirtual && count === 0 && !hasChildren) return null;
  // If virtual and no children visible (due to filter), we might want to hide it too?
  // But calculating that is complex. Let's rely on the fact that if children are hidden, this node will be empty.
  // Actually, if hasFilters is true, we might want to hide virtual nodes that have no visible children.
  // For now, let's just hide real empty folders.

  const isSelected = selectedFolderId === node.id;

  return (
    <div className="tree-node">
      <div 
        className={`node-content ${isSelected ? 'selected' : ''} ${node.isVirtual ? 'virtual' : ''}`}
        onClick={handleSelect}
        style={{ paddingLeft: '4px', paddingRight: '8px', opacity: node.isVirtual ? 0.8 : 1 }}
        title={node.isVirtual ? 'Virtual Folder (Group)' : node.originalName}
      >
        <span 
          className="node-toggle-icon" 
          onClick={handleToggle}
          style={{ 
            width: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            visibility: hasChildren ? 'visible' : 'hidden'
          }}
        >
          {isOpen ? <VscChevronDown /> : <VscChevronRight />}
        </span>
        
        <span className="node-icon folder-icon">
            {isSelected || (isOpen && hasChildren) ? <VscFolderOpened /> : <VscFolder />}
        </span>
        
        <span className="node-label" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
        </span>
        
        {!node.isVirtual && count !== undefined && (
            <span className="folder-count" style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '8px' }}>
                {count}
            </span>
        )}
        
        {!node.isVirtual && onDelete && (
            <button 
                className="btn-icon-small delete-folder"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(node.id);
                }}
                style={{ 
                    marginLeft: '4px', 
                    opacity: 0.5, 
                    padding: '2px',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    fontSize: '1.1em',
                    lineHeight: 1
                }}
                title="Delete folder"
            >
                ×
            </button>
        )}
      </div>
      
      {hasChildren && isOpen && (
        <div className="node-children">
          {node.children.map(child => (
            <FolderNode
                key={child.fullPath || child.id}
                node={child}
                selectedFolderId={selectedFolderId}
                onSelect={onSelect}
                onDelete={onDelete}
                getCount={getCount}
                hasFilters={hasFilters}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FolderTree = ({ folders, selectedFolderId, onSelect, onDelete, getCount, hasFilters }) => {
  const treeData = useMemo(() => {
    const root = buildTree(folders);
    return convertToArray(root);
  }, [folders]);

  return (
    <div className="file-tree" style={{ padding: 0 }}>
      {/* All Mods Root Node */}
      <div className="tree-node">
        <div 
            className={`node-content ${selectedFolderId === 'all' ? 'selected' : ''}`}
            onClick={() => onSelect('all')}
            style={{ paddingLeft: '24px', paddingRight: '8px' }}
        >
            <span className="node-icon folder-icon">
                <VscLibrary />
            </span>
            <span className="node-label">All Mods</span>
            <span className="folder-count" style={{ fontSize: '0.75rem', opacity: 0.6, marginLeft: '8px' }}>
                {getCount('all')}
            </span>
        </div>
      </div>

      {treeData.map(node => (
        <FolderNode
            key={node.fullPath || node.id}
            node={node}
            selectedFolderId={selectedFolderId}
            onSelect={onSelect}
            onDelete={onDelete}
            getCount={getCount}
            hasFilters={hasFilters}
        />
      ))}
    </div>
  );
};

export default FolderTree;
