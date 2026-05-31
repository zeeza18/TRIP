import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            style: { background: '#18230F', color: '#F8F5EC', fontFamily: 'Inter, sans-serif', borderRadius: '10px' },
            success: { iconTheme: { primary: '#1F6F4A', secondary: '#F8F5EC' } }
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
