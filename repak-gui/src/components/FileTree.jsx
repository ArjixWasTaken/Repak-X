import React, { useState, useMemo } from 'react';
import { FaFolder, FaFolderOpen, FaFile } from 'react-icons/fa';

const TreeNode = ({ name, node, level = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isFolder = node.type === 'folder';

  const handleToggle = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div>
      <div 
        onClick={handleToggle} 
        style={{ paddingLeft: `${level * 20}px`, cursor: isFolder ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '5px' }}
        className="tree-node"
      >
        {isFolder ? (isOpen ? <FaFolderOpen color="#4a9eff" /> : <FaFolder color="#4a9eff" />) : <FaFile color="#ccc" />}
        <span>{name}</span>
      </div>
      {isFolder && isOpen && (
        <div>
          {Object.entries(node.children)
            .sort(([aName, aNode], [bName, bNode]) => {
              // Sort folders before files
              if (aNode.type !== bNode.type) {
                return aNode.type === 'folder' ? -1 : 1;
              }
              return aName.localeCompare(bName); // Sort alphabetically
            })
            .map(([childName, childNode]) => (
              <TreeNode key={childName} name={childName} node={childNode} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree = ({ files }) => {
  const [expanded, setExpanded] = useState(new Set());

  const buildTree = (filesArr) => {
    const root = {};
    filesArr.forEach(f => {
      const path = typeof f === 'string' ? f : (f.path || '');
      const parts = path.split(/[/\\]/).filter(Boolean);
      let node = root;
      parts.forEach((part, idx) => {
        if (!node[part]) node[part] = { __children: {}, __isFile: idx === parts.length - 1, __meta: idx === parts.length - 1 ? f : undefined };
        node = node[part].__children;
      });
    });
    return root;
  };

  const tree = useMemo(() => buildTree(files || []), [files]);

  const toggle = (key) => {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded(next);
  };

  const renderNodes = (nodeObj, parentKey = '') => {
    return Object.entries(nodeObj).map(([name, obj]) => {
      const key = parentKey ? `${parentKey}/${name}` : name;
      const hasChildren = Object.keys(obj.__children).length > 0;
      const isFile = !!obj.__isFile;
      return (
        <div key={key} className="tree-node">
          <div
            className={`node-label ${isFile ? 'file' : 'folder'}`}
            onClick={() => !isFile && toggle(key)}
            title={isFile && obj.__meta && obj.__meta.path ? obj.__meta.path : name}
          >
            {!isFile ? (
              <span className="caret">{expanded.has(key) ? '▾' : '▸'}</span>
            ) : (
              <span className="caret-placeholder" />
            )}
            <span className="node-name">{name}</span>
          </div>

          {hasChildren && expanded.has(key) && (
            <div className="children">
              {renderNodes(obj.__children, key)}
            </div>
          )}
        </div>
      )
    });
  };

  return (
    <div className="file-tree" role="tree">
      {Object.keys(tree).length === 0 ? (
        <div className="empty">No files</div>
      ) : (
        renderNodes(tree)
      )}
    </div>
  );
};

export default FileTree;