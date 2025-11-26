import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { listen } from '@tauri-apps/api/event'
import { motion, AnimatePresence } from 'framer-motion'
import { IconButton, Tooltip } from '@mui/material'
import {
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material'
import ModDetailsPanel from './components/ModDetailsPanel'
import InstallModPanel from './components/InstallModPanel'
import SettingsPanel from './components/SettingsPanel'
import FileTree from './components/FileTree'
import './App.css'
import './styles/theme.css'
import logo from './assets/RepakIcon-x256.png'

// Mod Item Component
function ModItem({ mod, selectedMod, selectedMods, setSelectedMod, handleToggleModSelection, handleToggleMod, handleDeleteMod, formatFileSize }) {
  return (
    <motion.div 
      className={`mod-item ${selectedMod === mod ? 'selected' : ''} ${!mod.enabled ? 'disabled' : ''} ${selectedMods.has(mod.path) ? 'bulk-selected' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: mod.enabled ? 1 : 0.5 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mod-info">
        <Tooltip title="Select mod">
          <input
            type="checkbox"
            checked={selectedMods.has(mod.path)}
            onChange={() => handleToggleModSelection(mod)}
            onClick={(e) => e.stopPropagation()}
            className="modern-checkbox"
          />
        </Tooltip>
        <motion.span 
          className="mod-name"
          onClick={() => setSelectedMod(mod)}
          whileHover={{ color: '#4a9eff' }}
        >
          {mod.enabled ? '✓' : '✗'} {mod.custom_name || mod.path.split('\\').pop()}
        </motion.span>
        <span className="mod-size">{formatFileSize(mod.file_size)}</span>
      </div>
      
      <div className="mod-actions">
        {mod.custom_tags && mod.custom_tags.length > 0 && (
          <div className="tag-container">
            {mod.custom_tags.map(tag => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        <Tooltip title={mod.enabled ? 'Disable mod' : 'Enable mod'}>
          <motion.button 
            onClick={(e) => {
              e.stopPropagation()
              handleToggleMod(mod.path)
            }}
            className={`btn-modern ${mod.enabled ? 'btn-disable' : 'btn-enable'}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {mod.enabled ? 'Disable' : 'Enable'}
          </motion.button>
        </Tooltip>
        <Tooltip title="Delete mod">
          <motion.button 
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteMod(mod.path)
            }}
            className="btn-modern btn-danger"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Delete
          </motion.button>
        </Tooltip>
      </div>
    </motion.div>
  )
}

function App() {
  // Add these state variables
  const [globalUsmap, setGlobalUsmap] = useState('');
  const [hideSuffix, setHideSuffix] = useState(false);
  
  // Add these new state variables
  const [theme, setTheme] = useState('dark');
  const [accentColor, setAccentColor] = useState('#4a9eff');
  const [showSettings, setShowSettings] = useState(false);

  const [gamePath, setGamePath] = useState('')
  const [mods, setMods] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [gameRunning, setGameRunning] = useState(false)
  const [version, setVersion] = useState('')
  const [selectedMod, setSelectedMod] = useState(null)
  const [leftPanelWidth, setLeftPanelWidth] = useState(60) // percentage
  const [isResizing, setIsResizing] = useState(false)
  const [selectedMods, setSelectedMods] = useState(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')
  const [allTags, setAllTags] = useState([])
  const [filterTag, setFilterTag] = useState('')
  const [filterType, setFilterType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const [showInstallPanel, setShowInstallPanel] = useState(false)
  const [modsToInstall, setModsToInstall] = useState([])
  const [installLogs, setInstallLogs] = useState([])
  const [showInstallLogs, setShowInstallLogs] = useState(false)

  useEffect(() => {
    loadInitialData()
    loadTags()
    
    // Listen for install progress
    const unlisten = listen('install_progress', (event) => {
      setStatus(`Installing... ${Math.round(event.payload)}%`)
    })
    
    const unlistenComplete = listen('install_complete', () => {
      setStatus('Installation complete!')
      loadMods()
    })

    const unlistenLogs = listen('install_log', (event) => {
      setInstallLogs(prev => [...prev, event.payload])
      setShowInstallLogs(true)
    })

    // Unified file drop handler function
    const handleFileDrop = async (files) => {
      console.log('Files dropped:', files)
      const pakFiles = files.filter(f => f.toLowerCase().endsWith('.pak'))
      
      if (pakFiles.length > 0) {
        try {
          setStatus('Processing dropped files...')
          const modsData = await invoke('parse_dropped_files', { paths: pakFiles })
          console.log('Parsed mods:', modsData)
          setModsToInstall(modsData)
          setShowInstallPanel(true)
        } catch (error) {
          console.error('Parse error:', error)
          setStatus(`Error parsing files: ${error}`)
        }
      } else {
        setStatus('No PAK files found in dropped items')
      }
    }

    // Listen for Tauri drag-drop event
    const unlistenDragDrop = listen('tauri://drag-drop', (event) => {
      const files = event.payload.paths || event.payload
      handleFileDrop(files)
    })

    // Listen for Tauri file-drop event
    const unlistenFileDrop = listen('tauri://file-drop', (event) => {
      const files = event.payload.paths || event.payload
      handleFileDrop(files)
    })

    // Listen for file system changes in mods directory
    const unlistenModsChanged = listen('mods_dir_changed', () => {
      console.log('Mods directory changed, reloading...')
      loadMods()
    })

    // Add dragover event to prevent default browser behavior
    const preventDefault = (e) => {
      e.preventDefault()
      e.stopPropagation()
    }

    document.addEventListener('dragover', preventDefault)
    document.addEventListener('drop', preventDefault)

    return () => {
      // Cleanup listeners
      unlisten.then(f => f())
      unlistenComplete.then(f => f())
      unlistenDragDrop.then(f => f())
      unlistenFileDrop.then(f => f())
      unlistenLogs.then(f => f())
      unlistenModsChanged.then(f => f())
      document.removeEventListener('dragover', preventDefault)
      document.removeEventListener('drop', preventDefault)
    }
  }, [])

  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault()
      setIsDragging(true)
    }

    const handleDragLeave = (e) => {
      e.preventDefault()
      setIsDragging(false)
    }

    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', () => setIsDragging(false))

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('drop', () => setIsDragging(false))
    }
  }, [])

  const loadInitialData = async () => {
    try {
      const path = await invoke('get_game_path')
      setGamePath(path)
      
      // Start file watcher
      try {
        await invoke('start_file_watcher')
      } catch (e) {
        console.warn('Failed to start file watcher:', e)
      }

      const ver = await invoke('get_app_version')
      setVersion(ver)
      
      // Check for updates
      try {
        const update = await invoke('check_for_updates')
        if (update) {
          console.log('Update available:', update)
          setStatus(`Update available: v${update.latest} - ${update.url}`)
          // You could show a dedicated modal here if desired
        }
      } catch (e) {
        console.warn('Update check failed:', e)
      }

      await loadMods()
      await loadFolders()
      await checkGame()
    } catch (error) {
      console.error('Failed to load initial data:', error)
    }
  }

  const loadMods = async () => {
    try {
      console.log('Loading mods...')
      const modList = await invoke('get_pak_files')
      console.log('Loaded mods:', modList)
      setMods(modList)
      setStatus(`Loaded ${modList.length} mod(s)`)
    } catch (error) {
      console.error('Error loading mods:', error)
      setStatus('Error loading mods: ' + error)
    }
  }

  const loadTags = async () => {
    try {
      const tags = await invoke('get_all_tags')
      setAllTags(tags)
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  const loadFolders = async () => {
    try {
      const folderList = await invoke('get_folders')
      setFolders(folderList)
    } catch (error) {
      console.error('Failed to load folders:', error)
    }
  }

  const checkGame = async () => {
    try {
      const running = await invoke('check_game_running')
      setGameRunning(running)
    } catch (error) {
      console.error('Failed to check game status:', error)
    }
  }

  const handleAutoDetect = async () => {
    try {
      setLoading(true)
      const path = await invoke('auto_detect_game_path')
      setGamePath(path)
      setStatus('Game path detected: ' + path)
      await loadMods()
    } catch (error) {
      setStatus('Failed to auto-detect: ' + error)
    } finally {
      setLoading(false)
    }
  }

  const handleBrowseGamePath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Marvel Rivals Installation Directory'
      })
      
      if (selected) {
        await invoke('set_game_path', { path: selected })
        setGamePath(selected)
        setStatus('Game path set: ' + selected)
        await loadMods()
      }
    } catch (error) {
      setStatus('Error setting game path: ' + error)
    }
  }

  const handleInstallModClick = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'PAK Files',
          extensions: ['pak']
        }],
        title: 'Select Mods to Install'
      })
      
      if (selected && selected.length > 0) {
        const paths = Array.isArray(selected) ? selected : [selected]
        const modsData = await invoke('parse_dropped_files', { paths })
        setModsToInstall(modsData)
        setShowInstallPanel(true)
      }
    } catch (error) {
      setStatus('Error selecting mods: ' + error)
    }
  }

  const handleDeleteMod = async (modPath) => {
    if (!confirm('Are you sure you want to delete this mod?')) return
    
    try {
      await invoke('delete_mod', { path: modPath })
      setStatus('Mod deleted')
      await loadMods()
    } catch (error) {
      setStatus('Error deleting mod: ' + error)
    }
  }

  const handleToggleMod = async (modPath) => {
    try {
      const newState = await invoke('toggle_mod', { modPath })
      setStatus(newState ? 'Mod enabled' : 'Mod disabled')
      await loadMods()
    } catch (error) {
      setStatus('Error toggling mod: ' + error)
    }
  }

  const handleCreateFolder = async () => {
    const name = prompt('Enter folder name:')
    if (!name) return
    
    try {
      await invoke('create_folder', { name })
      await loadFolders()
      setStatus('Folder created')
    } catch (error) {
      setStatus('Error creating folder: ' + error)
    }
  }

  const handleDeleteFolder = async (folderId) => {
    if (!confirm('Delete this folder? Mods will not be deleted.')) return
    
    try {
      await invoke('delete_folder', { id: folderId })
      await loadFolders()
      await loadMods()
      setStatus('Folder deleted')
    } catch (error) {
      setStatus('Error deleting folder: ' + error)
    }
  }

  const handleToggleModSelection = (mod) => {
    const newSelected = new Set(selectedMods)
    if (newSelected.has(mod.path)) {
      newSelected.delete(mod.path)
    } else {
      newSelected.add(mod.path)
    }
    setSelectedMods(newSelected)
  }

  const handleSelectAll = () => {
    setSelectedMods(new Set(mods.map(m => m.path)))
  }

  const handleDeselectAll = () => {
    setSelectedMods(new Set())
  }

  const handleAssignToFolder = async (folderId) => {
    if (selectedMods.size === 0) {
      setStatus('No mods selected')
      return
    }

    try {
      for (const modPath of selectedMods) {
        await invoke('assign_mod_to_folder', { modPath, folderId })
      }
      setStatus(`Moved ${selectedMods.size} mod(s) to folder!`)
      setSelectedMods(new Set())
      await loadMods()
      await loadFolders()
    } catch (error) {
      setStatus(`Error: ${error}`)
    }
  }

  const handleAddCustomTag = async () => {
    if (!newTagInput.trim() || selectedMods.size === 0) return

    try {
      for (const modPath of selectedMods) {
        await invoke('add_custom_tag', { modPath, tag: newTagInput.trim() })
      }
      setStatus(`Added tag "${newTagInput}" to ${selectedMods.size} mod(s)`)
      setNewTagInput('')
      await loadMods()
      await loadTags()
    } catch (error) {
      setStatus(`Error: ${error}`)
    }
  }

  const handleDragStart = (e, mod) => {
    console.log('Drag started:', mod.path)
    e.dataTransfer.setData('text', mod.path)
    e.dataTransfer.setData('modpath', mod.path)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types.includes('modpath')) {
      e.dataTransfer.dropEffect = 'move'
    }
  }

  const handleDropOnFolder = async (e, folderId) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('drag-over')
    
    const modPath = e.dataTransfer.getData('modpath') || e.dataTransfer.getData('text/plain')
    console.log('Drop on folder:', folderId, 'modPath:', modPath)
    
    if (modPath) {
      try {
        console.log('Calling assign_mod_to_folder with:', { modPath, folderId })
        await invoke('assign_mod_to_folder', { modPath, folderId })
        setStatus(`Mod moved to ${folderId}!`)
        await loadMods()
        await loadFolders()
      } catch (error) {
        setStatus(`Error: ${error}`)
        console.error('Error moving mod:', error)
      }
    } else {
      console.error('No modPath in dataTransfer, types:', e.dataTransfer.types)
    }
  }

  const handleResizeStart = (e) => {
    setIsResizing(true)
    e.preventDefault()
  }

  const handleResizeMove = (e) => {
    if (!isResizing) return
    
    const containerWidth = e.currentTarget.offsetWidth || window.innerWidth
    const newLeftWidth = (e.clientX / containerWidth) * 100
    
    // Constrain between 30% and 70%
    if (newLeftWidth >= 30 && newLeftWidth <= 70) {
      setLeftPanelWidth(newLeftWidth)
    }
  }

  const handleResizeEnd = () => {
    setIsResizing(false)
  }

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isResizing])

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Compute filtered mods
  const filteredMods = mods.filter(mod => {
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const modName = (mod.custom_name || mod.path.split('\\').pop()).toLowerCase()
      if (!modName.includes(query)) return false
    }

    // Tag filter
    if (filterTag && !mod.custom_tags.includes(filterTag)) {
      return false
    }

    return true
  })

  // Group mods by folder
  const modsByFolder = {}
  modsByFolder['_root'] = filteredMods.filter(m => !m.folder_id)
  folders.forEach(folder => {
    modsByFolder[folder.id] = filteredMods.filter(m => m.folder_id === folder.id)
  })

  const toggleFolder = (folderId) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const handleInstallMods = async (modsWithSettings) => {
    try {
      setShowInstallPanel(false)
      setInstallLogs([])
      setShowInstallLogs(true)
      setStatus('Installing mods...')
      await invoke('install_mods', { mods: modsWithSettings })
      setStatus('Mods installed successfully!')
      await loadMods()
      await loadFolders()
    } catch (error) {
      setStatus(`Installation failed: ${error}`)
    }
  }

  const handleSaveSettings = (settings) => {
    setGlobalUsmap(settings.globalUsmap || '')
    setHideSuffix(settings.hideSuffix || false)
    // TODO: Save to backend state
    setStatus('Settings saved')
  }

  // Add this effect to initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedAccent = localStorage.getItem('accentColor') || '#4a9eff';
    
    handleThemeChange(savedTheme);
    handleAccentChange(savedAccent);
  }, []);

  // Add these handlers
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleAccentChange = (newAccent) => {
    setAccentColor(newAccent);
    document.documentElement.style.setProperty('--accent-primary', newAccent);
    document.documentElement.style.setProperty('--accent-secondary', newAccent);
    localStorage.setItem('accentColor', newAccent);
  };

  return (
    <div className="app">
      {/* Install Mod Panel */}
      {showInstallPanel && (
        <InstallModPanel
          mods={modsToInstall}
          onInstall={handleInstallMods}
          onCancel={() => setShowInstallPanel(false)}
        />
      )}

      {/* Settings Panel */}
        {showSettings && (
          <SettingsPanel
            settings={{
              globalUsmap,
              hideSuffix
            }}
            onSave={(settings) => {
              setGlobalUsmap(settings.globalUsmap);
              setHideSuffix(settings.hideSuffix);
              // Add any backend saving logic here
              setShowSettings(false);
            }}
            onClose={() => setShowSettings(false)}
            theme={theme}
            setTheme={handleThemeChange}
            accentColor={accentColor}
            setAccentColor={handleAccentChange}
          />
        )}

        <header className="header" style={{ display: 'flex', alignItems: 'center' }}>
          <img src={logo} alt="Repak Icon" className="repak-icon" style={{ width: '50px', height: '50px', marginRight: '10px' }} />
          <h1 style={{ margin: 0 }}>Xzant-GUI [UI TEST]</h1>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginLeft: 'auto' }}>
            <button 
              onClick={() => setShowSettings(true)} 
              className="btn-settings"
            >
              ⚙️ Settings
            </button>
            <span className="version">v{version}</span>
            {gameRunning && <span className="game-status">⚠️ Game Running</span>}
          </div>
        </header>

        <div className="container">
          {/* Game Path Section */}
        <section className="section game-path-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>Game Path</h2>
            <button onClick={handleInstallModClick} className="btn-install-mod">
              📦 Install Mod
            </button>
          </div>
          <div className="path-controls">
            <input 
              type="text" 
              value={gamePath} 
              readOnly 
              placeholder="No game path set"
              className="path-input"
            />
            <button onClick={handleAutoDetect} disabled={loading}>
              Auto Detect
            </button>
            <button onClick={handleBrowseGamePath}>
              Browse
            </button>
          </div>
        </section>

        {/* Main 2-Panel Layout */}
        <div className="main-panels" onMouseMove={handleResizeMove}>
          {/* Left Panel - Mods and Folders */}
          <div className="left-panel" style={{ width: `${leftPanelWidth}%` }}>
            {/* Mods and Folders Section */}
            <section className="section mods-section">
              <div className="section-header">
                <h2>Installed Mods ({filteredMods.length}/{mods.length})</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handleCreateFolder} className="btn-small">
                    + Folder
                  </button>
                  <button onClick={loadMods} className="btn-small">
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="filters-bar">
                <input
                  type="text"
                  placeholder="Search mods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <select 
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Tags</option>
                  {allTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                {(searchQuery || filterTag) && (
                  <button 
                    onClick={() => { setSearchQuery(''); setFilterTag(''); }}
                    className="btn-small"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Bulk Actions Bar */}
              {selectedMods.size > 0 && (
                <div className="bulk-actions-bar">
                  <span className="selected-count">{selectedMods.size} selected</span>
                  <div style={{ display: 'flex', gap: '0.5rem', flex: 1, alignItems: 'center' }}>
                    <select 
                      onChange={(e) => e.target.value && handleAssignToFolder(e.target.value)}
                      className="folder-select"
                      defaultValue=""
                    >
                      <option value="">Move to folder...</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      list="existing-tags"
                      placeholder="Add tag (type or select)..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
                      style={{ padding: '0.25rem 0.5rem', flex: 1 }}
                    />
                    <datalist id="existing-tags">
                      {allTags.map(tag => (
                        <option key={tag} value={tag} />
                      ))}
                    </datalist>
                    <button onClick={handleAddCustomTag} className="btn-small">
                      Add Tag
                    </button>
                    <button onClick={handleDeselectAll} className="btn-small">
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {mods.length > 0 && (
                <div className="select-actions">
                  <button onClick={handleSelectAll} className="btn-link">
                    Select All
                  </button>
                  {selectedMods.size > 0 && (
                    <button onClick={handleDeselectAll} className="btn-link">
                      Deselect All
                    </button>
                  )}
                </div>
              )}

              {/* Mods List with Expandable Folders */}
              <div className="mod-list">
                {filteredMods.length === 0 ? (
                  <p className="empty-state">
                    {mods.length === 0 ? 'No mods installed. Drop PAK files here to install.' : 'No mods match the current filters.'}
                  </p>
                ) : (
                  <>
                    {/* Folders */}
                    {folders.map(folder => {
                      const folderMods = modsByFolder[folder.id] || []
                      if (folderMods.length === 0) return null
                      
                      return (
                        <div key={folder.id} className="folder-group">
                          <div 
                            className="folder-header"
                            onClick={() => toggleFolder(folder.id)}
                          >
                            <span className="folder-icon">
                              {expandedFolders.has(folder.id) ? '📂' : '📁'}
                            </span>
                            <span className="folder-name">{folder.name}</span>
                            <span className="folder-count">({folderMods.length})</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteFolder(folder.id)
                              }}
                              className="btn-danger-small"
                              style={{ marginLeft: 'auto' }}
                            >
                              ×
                            </button>
                          </div>
                          
                          {expandedFolders.has(folder.id) && (
                            <div className="folder-contents">
                              {folderMods.map((mod, idx) => (
                                <ModItem 
                                  key={mod.path} 
                                  mod={mod}
                                  selectedMod={selectedMod}
                                  selectedMods={selectedMods}
                                  setSelectedMod={setSelectedMod}
                                  handleToggleModSelection={handleToggleModSelection}
                                  handleToggleMod={handleToggleMod}
                                  handleDeleteMod={handleDeleteMod}
                                  formatFileSize={formatFileSize}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    
                    {/* Root level mods (not in any folder) */}
                    {modsByFolder['_root'] && modsByFolder['_root'].length > 0 && (
                      <div className="root-mods">
                        {modsByFolder['_root'].map((mod) => (
                          <ModItem 
                            key={mod.path}
                            mod={mod}
                            selectedMod={selectedMod}
                            selectedMods={selectedMods}
                            setSelectedMod={setSelectedMod}
                            handleToggleModSelection={handleToggleModSelection}
                            handleToggleMod={handleToggleMod}
                            handleDeleteMod={handleDeleteMod}
                            formatFileSize={formatFileSize}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          </div>

          {/* Resize Handle */}
          <div 
            className="resize-handle"
            onMouseDown={handleResizeStart}
          />

          {/* Right Panel - Mod Details (Always Visible) */}
          <div className="right-panel" style={{ width: `${100 - leftPanelWidth}%` }}>
            {selectedMod ? (
              <div className="mod-details-and-contents" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <ModDetailsPanel 
                    mod={selectedMod}
                    onClose={() => setSelectedMod(null)}
                    onUpdate={loadMods}
                  />
                </div>

                <div className="selected-mod-contents" style={{ width: '360px', maxWidth: '45%', minWidth: '240px' }}>
                  <h3 style={{ marginTop: 0 }}>Contents</h3>
                  <FileTree files={selectedMod.file_contents || selectedMod.files || selectedMod.file_list || []} />
                </div>
              </div>
            ) : (
               <div className="no-selection">
                 <p>Select a mod to view details</p>
               </div>
             )}
          </div>
        </div>

        {/* Status Bar */}
        {status && (
          <div className="status-bar">
            {status}
          </div>
        )}

        {/* Installation Log Panel */}
        {showInstallLogs && (
          <div className="install-log-panel">
            <div className="log-panel-header">
              <h3>Installation Log</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setInstallLogs([])} className="btn-link">Clear</button>
                <button onClick={() => setShowInstallLogs(false)} className="btn-link">Hide</button>
              </div>
            </div>
            <div className="log-panel-content">
              {installLogs.length === 0 ? (
                <div style={{ color: '#666', padding: '0.5rem' }}>Waiting for installation...</div>
              ) : (
                installLogs.map((log, idx) => (
                  <div key={idx} className="log-panel-entry">{log}</div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>Drag & drop PAK files anywhere to install mods</p>
      </footer>
    </div>
  )
}

export default App
