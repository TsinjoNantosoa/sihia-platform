import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { motion } from 'framer-motion'

type Props = {
  onSend: (text: string) => void
  placeholder?: string
}

export default function Composer({ onSend, placeholder = 'Question sur Alan Allman Associates? Poser ici !' }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const MAX_CHARS = 200

  useEffect(() => {
    // ensure initial height
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px'
      textareaRef.current.style.overflowY = 'hidden'
    }
  }, [])

  function resize() {
    const el = textareaRef.current
    if (!el) return
    const MAX = 260
    el.style.height = 'auto'
    const needed = el.scrollHeight
    const newHeight = Math.min(needed, MAX)
    el.style.height = newHeight + 'px'
    // keep internal scrolling off to avoid native scrollbar; when content
    // exceeds MAX the chat container itself should scroll.
    el.style.overflowY = 'hidden'
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value
    // Limit to MAX_CHARS
    if (text.length <= MAX_CHARS) {
      setValue(text)
      resize()
    }
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) {
        onSend(value.trim())
        setValue('')
        if (textareaRef.current) textareaRef.current.style.height = '44px'
      }
    }
  }

  function handleSend() {
    if (value.trim()) {
      onSend(value.trim())
      setValue('')
      if (textareaRef.current) {
        textareaRef.current.style.height = '44px'
        textareaRef.current.style.overflowY = 'hidden'
      }
    }
  }

  return (
    <div className="composer-row chat-input-container">
      <div className="composer-input-wrap">
        <textarea
          ref={textareaRef}
          className="composer-input"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKey}
          rows={1}
          maxLength={MAX_CHARS}
        />
        <div className="char-count">{value.length}/{MAX_CHARS}</div>
        <motion.button
          className="composer-send-btn"
          onClick={handleSend}
          aria-label="Envoyer le message"
          title="Envoyer"
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.1 }}
        >
          ➤
        </motion.button>
      </div>
    </div>
  )
}
