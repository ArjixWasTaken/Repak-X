import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Disable default browser context menu
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root not found')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
