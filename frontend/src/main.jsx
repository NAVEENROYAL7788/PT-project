import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// 🔒 Safety: Ensure standalone mode is active by default on every load.
// This prevents ERR_CONNECTION_REFUSED from :4000 when the backend is not running.
// Users can opt-in to live backend via Settings if they start the Express server.
localStorage.removeItem('documind_live_backend')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
