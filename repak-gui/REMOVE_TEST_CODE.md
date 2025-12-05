# How to Remove Temporary Test Code

## Character Data Updater Test Button

After testing the character data updater, remove the temporary test code from the Settings panel.

### File to Edit
`src/components/SettingsPanel.jsx`

### What to Remove

#### 1. Remove the state and handler (lines ~19-38)
Search for and delete the entire block:
```jsx
// ===== TEMPORARY TEST CODE - REMOVE AFTER TESTING =====
const [updateStatus, setUpdateStatus] = useState('');
const [isUpdating, setIsUpdating] = useState(false);

const handleTestCharacterUpdate = async () => {
  try {
    setIsUpdating(true);
    setUpdateStatus('Starting character data update from GitHub...');
    
    const newCount = await invoke('update_character_data_from_github');
    
    setUpdateStatus(`✓ Success! ${newCount} new skins added.`);
    setIsUpdating(false);
  } catch (error) {
    console.error('Character update failed:', error);
    setUpdateStatus(`✗ Error: ${error}`);
    setIsUpdating(false);
  }
};
// ===== END TEMPORARY TEST CODE =====
```

#### 2. Remove the UI section (lines ~167-202)
Search for and delete the entire block:
```jsx
{/* ===== TEMPORARY TEST SECTION - REMOVE AFTER TESTING ===== */}
<div className="setting-section" style={{ 
  borderTop: '2px dashed #ff9800', 
  paddingTop: '1rem',
  backgroundColor: 'rgba(255, 152, 0, 0.1)'
}}>
  <h3 style={{ color: '#ff9800' }}>🧪 TEST: Character Data Updater</h3>
  <p style={{ fontSize: '0.85rem', marginBottom: '1rem', color: '#aaa' }}>
    This section is temporary for testing the new GitHub-based character data updater.
  </p>
  <div className="setting-group">
    <button 
      onClick={handleTestCharacterUpdate} 
      disabled={isUpdating}
      style={{ 
        backgroundColor: '#ff9800',
        width: '100%'
      }}
    >
      {isUpdating ? 'Updating from GitHub...' : 'Test Update Character Data'}
    </button>
    {updateStatus && (
      <p style={{ 
        fontSize: '0.85rem', 
        marginTop: '0.5rem',
        padding: '0.5rem',
        borderRadius: '4px',
        backgroundColor: updateStatus.startsWith('✓') ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 82, 82, 0.2)',
        color: updateStatus.startsWith('✓') ? '#4CAF50' : '#ff5252'
      }}>
        {updateStatus}
      </p>
    )}
  </div>
</div>
{/* ===== END TEMPORARY TEST SECTION ===== */}
```

### Quick Search & Delete
1. Open `src/components/SettingsPanel.jsx`
2. Search for `TEMPORARY TEST CODE`
3. Delete both marked blocks
4. Save the file

That's it! The Settings panel will return to normal.
