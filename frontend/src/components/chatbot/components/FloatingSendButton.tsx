import React from 'react'

type Props = {
  onClick: () => void
}

export default function FloatingSendButton({ onClick }: Props) {
  return (
    <button className="floating-send-btn" onClick={onClick} title="Envoyer">
      ➤
    </button>
  )
}
