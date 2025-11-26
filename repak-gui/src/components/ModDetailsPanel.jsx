import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

export default function ModDetailsPanel({ mod, onClose, onUpdate }) {
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditingPriority, setIsEditingPriority] = useState(false)
  const [newPriority, setNewPriority] = useState(0)

  useEffect(() => {
    if (mod) {
      loadModDetails()
      setNewPriority(mod.priority || 0)
    }
  }, [mod])

  const handlePriorityChange = async () => {
     try {
        await invoke('set_mod_priority', { modPath: mod.path, priority: parseInt(newPriority) })
        setIsEditingPriority(false)
        if (onUpdate) onUpdate()
     } catch (err) {
        console.error('Failed to set priority:', err)
        setError(err.toString())
     }
  }

  const loadModDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Loading details for:', mod.path)
      const modDetails = await invoke('get_mod_details', { modPath: mod.path })
      console.log('Received details:', modDetails)
      setDetails(modDetails)
    } catch (err) {
      console.error('Failed to load mod details:', err)
      setError(err.toString())
    } finally {
      setLoading(false)
    }
  }

  if (!mod) return null

  return (
    <div className="details-panel">
      <div className="details-header">
        <h2>{mod.custom_name || mod.path.split('\\').pop()}</h2>
      </div>
      
      <div className="details-body">
        {loading ? (
          <div className="loading-state">Loading mod details...</div>
        ) : error ? (
          <div className="error-state">
            <h3>Error Loading Details</h3>
            <p>{error}</p>
            <p style={{fontSize: '0.9em', color: '#999'}}>Mod path: {mod.path}</p>
          </div>
        ) : details ? (
          <>
            <div className="detail-section">
              <h3>Mod Type</h3>
              <div className="mod-type-badge-large">{details.mod_type}</div>
              {details.is_iostore && (
                <div className="iostore-badge">IoStore Package</div>
              )}
            </div>

            <div className="detail-section">
              <h3>Information</h3>
              <div className="detail-item">
                <span className="detail-label">Files:</span>
                <span className="detail-value">{details.file_count}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Size:</span>
                <span className="detail-value">{formatFileSize(details.total_size)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Enabled:</span>
                <span className="detail-value">{mod.enabled ? 'Yes' : 'No'}</span>
              </div>
              {mod.folder_id && (
                <div className="detail-item">
                  <span className="detail-label">Folder:</span>
                  <span className="detail-value">{mod.folder_id}</span>
                </div>
              )}
            </div>

            <div className="detail-section">
              <h3>Settings</h3>
              <div className="detail-item">
                 <span className="detail-label">Load Priority:</span>
                 <div className="detail-value" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    {isEditingPriority ? (
                        <>
                           <input 
                             type="number" 
                             min="0" 
                             max="20" 
                             value={newPriority} 
                             onChange={(e) => setNewPriority(e.target.value)}
                             className="priority-input"
                             style={{width: '60px', padding: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px'}}
                           />
                           <button onClick={handlePriorityChange} className="btn-small" style={{background: 'var(--accent-primary)', color: 'white'}}>Save</button>
                           <button onClick={() => setIsEditingPriority(false)} className="btn-small">Cancel</button>
                        </>
                    ) : (
                        <>
                           <span>{mod.priority || 0} (Count of 9s)</span>
                           <button onClick={() => setIsEditingPriority(true)} className="btn-small">Edit</button>
                        </>
                    )}
                 </div>
                 <p style={{fontSize: '0.8em', color: '#888', marginTop: '4px', marginBottom: '0'}}>
                    Higher number = Higher loading priority (more 9s in suffix)
                 </p>
              </div>
              <div className="detail-item" style={{marginTop: '10px'}}>
                 <button 
                    onClick={async () => {
                        try {
                            // Use Tauri dialog to pick folder
                            const selected = await open({
                                directory: true,
                                multiple: false,
                                title: 'Select Destination Folder'
                            });
                            if (selected) {
                                await invoke('extract_pak_to_destination', { modPath: mod.path, destPath: selected });
                                alert('Extraction complete!');
                            }
                        } catch (e) {
                            console.error(e);
                            alert('Extraction failed: ' + e);
                        }
                    }}
                    className="btn-small"
                 >
                    Extract contents...
                 </button>
              </div>
            </div>
            
            {mod.custom_tags && mod.custom_tags.length > 0 && (
              <div className="detail-section">
                <h3>Tags</h3>
                <div className="tags-list">
                  {mod.custom_tags.map((tag, idx) => (
                    <span key={idx} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="detail-section">
              <h3>File Contents ({details.file_count} files)</h3>
              <div className="file-list">
                {details.files.slice(0, 100).map((file, idx) => (
                  <div key={idx} className="file-item">
                    {getFileIcon(file)} {file}
                  </div>
                ))}
                {details.files.length > 100 && (
                  <div className="file-item-more">
                    ... and {details.files.length - 100} more files
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function getFileIcon(filename) {
  if (filename.endsWith('.uasset')) return '📦'
  if (filename.endsWith('.uexp')) return '📄'
  if (filename.endsWith('.umap')) return '🗺️'
  if (filename.endsWith('.wem') || filename.endsWith('.bnk')) return '🔊'
  if (filename.endsWith('.png') || filename.endsWith('.jpg')) return '🖼️'
  return '📄'
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
