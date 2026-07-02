import React from 'react'

type Reply = { icon: string; label: string }
type Props = {
  replies: Reply[]
  onSelect: (text: string) => void
  layout?: 'grid' | 'list' | 'cards' | 'pills'
}

export default function QuickReplies({ replies, onSelect, layout = 'grid' }: Props) {
  if (!replies || replies.length === 0) return null
  return (
    <div
      className={`quick-replies ${
        layout === 'list' ? 'vertical' : ''
      } ${layout === 'cards' ? 'cards' : ''} ${layout === 'pills' ? 'pills' : ''}`}
    >
      {replies.map((r, i) => (
        <button
          key={i}
          className={`quick-reply-btn ${layout === 'cards' ? 'card' : ''} ${layout === 'pills' ? 'pill' : ''}`}
          onClick={() => onSelect(r.label)}
          aria-label={r.label}
          role="button"
          tabIndex={0}
        >
          <span className="qr-icon">{r.icon}</span>
          <span className="qr-label">{r.label}</span>
        </button>
      ))}
    </div>
  )
}
