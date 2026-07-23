import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './chatbot.css'

const existingRoot = document.getElementById('root')
const mountNode = existingRoot ?? (() => {
  const el = document.createElement('div')
  el.id = 'aaa-chatbot-root'
  el.setAttribute('data-aaa-chatbot', 'true')
  document.body.appendChild(el)
  return el
})()

createRoot(mountNode).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
