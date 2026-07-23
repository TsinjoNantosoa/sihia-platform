import React, { useState } from 'react'

type Props = {
  onRate: (rating: 'up' | 'down') => void
}

export default function Rating({ onRate }: Props) {
  // Simple informational notice replacing rating buttons
  return (
    <div className="rating">
      <span className="rating-notice">IA officielle. Évitez de partager des infos personnelles.</span>
    </div>
  )
}
