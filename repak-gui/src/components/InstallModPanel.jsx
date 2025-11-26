import { useState } from 'react'
import './InstallModPanel.css'

export default function InstallModPanel({ mods, onInstall, onCancel }) {
  const [filterEnabled, setFilterEnabled] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState(new Set())
  const [modSettings, setModSettings] = useState(
    mods.reduce((acc, mod, idx) => {
      acc[idx] = {
        fixMesh: mod.auto_fix_mesh || false,
        fixTexture: mod.auto_fix_texture || false,
        fixSerializeSize: mod.auto_fix_serialize_size || false,
        toRepak: mod.auto_to_repak || false,
        customName: '',
        selectedTags: []
      }
      return acc
    }, {})
  )

  // Get unique mod types
  const allTypes = [...new Set(mods.map(m => m.mod_type))].sort()

  // Filter mods by selected types
  const filteredMods = filterEnabled && selectedTypes.size > 0
    ? mods.filter((mod, idx) => selectedTypes.has(mod.mod_type))
    : mods

  const toggleType = (type) => {
    const newTypes = new Set(selectedTypes)
    if (newTypes.has(type)) {
      newTypes.delete(type)
    } else {
      newTypes.add(type)
    }
    setSelectedTypes(newTypes)
  }

  const selectAllTypes = () => {
    setSelectedTypes(new Set(allTypes))
  }

  const clearAllTypes = () => {
    setSelectedTypes(new Set())
  }

  const updateModSetting = (idx, key, value) => {
    setModSettings(prev => ({
      ...prev,
      [idx]: { ...prev[idx], [key]: value }
    }))
  }

  const handleInstall = () => {
    // Prepare mods with their settings
    const modsToInstall = mods.map((mod, idx) => ({
      ...mod,
      ...modSettings[idx]
    }))
    onInstall(modsToInstall)
  }

  return (
    <div className="install-mod-overlay">
      <div className="install-mod-panel">
        <div className="install-header">
          <h2>Install Mods</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        {/* Filter UI */}
        <div className="filter-section">
          <label>
            <input
              type="checkbox"
              checked={filterEnabled}
              onChange={(e) => setFilterEnabled(e.target.checked)}
            />
            Enable filtering
          </label>

          {filterEnabled && (
            <div className="filter-types">
              <span>Show types:</span>
              {allTypes.map(type => (
                <label key={type} className="type-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedTypes.has(type)}
                    onChange={() => toggleType(type)}
                  />
                  {type}
                </label>
              ))}
              <button onClick={selectAllTypes} className="btn-link">Select All</button>
              <button onClick={clearAllTypes} className="btn-link">Clear All</button>
            </div>
          )}
        </div>

        {/* Mods Table */}
        <div className="mods-table-container">
          <table className="mods-table">
            <thead>
              <tr>
                <th>Mod Name</th>
                <th>Type</th>
                <th>Fix Mesh</th>
                <th>Fix Texture</th>
                <th>Fix SerializeSize</th>
                <th>To Repak</th>
              </tr>
            </thead>
            <tbody>
              {filteredMods.map((mod, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      type="text"
                      placeholder={mod.mod_name}
                      value={modSettings[idx]?.customName || ''}
                      onChange={(e) => updateModSetting(idx, 'customName', e.target.value)}
                      className="mod-name-input"
                    />
                  </td>
                  <td>{mod.mod_type}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={modSettings[idx]?.fixMesh || false}
                      onChange={(e) => updateModSetting(idx, 'fixMesh', e.target.checked)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={modSettings[idx]?.fixTexture || false}
                      onChange={(e) => updateModSetting(idx, 'fixTexture', e.target.checked)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={modSettings[idx]?.fixSerializeSize || false}
                      onChange={(e) => updateModSetting(idx, 'fixSerializeSize', e.target.checked)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={modSettings[idx]?.toRepak || false}
                      onChange={(e) => updateModSetting(idx, 'toRepak', e.target.checked)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="install-actions">
          <button onClick={handleInstall} className="btn-install">
            Install {filteredMods.length} Mod(s)
          </button>
          <button onClick={onCancel} className="btn-cancel">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
