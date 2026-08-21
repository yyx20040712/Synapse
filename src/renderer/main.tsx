import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './shared/theme.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('找不到 #root 挂载点')
createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
