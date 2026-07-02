import React, { useRef } from 'react'

type Props = {
  onAttach: (file: File) => void
}

export default function AttachmentButtons({ onAttach }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="attachment-buttons">
      {/* Bot trigger */}
      <button className="attach-btn" title="Bots" aria-label="Bots" tabIndex={0}>🤖</button>

      {/* File attachment */}
      <button className="attach-btn" title="Fichier" aria-label="Fichier" onClick={() => fileRef.current?.click()} tabIndex={0}>
        📎
      </button>
      <input
        ref={fileRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files?.[0]) onAttach(e.target.files[0])
        }}
      />

      {/* Emoji */}
      <button className="attach-btn" title="Emoji" aria-label="Emoji" tabIndex={0}>😊</button>
    </div>
  )
}
