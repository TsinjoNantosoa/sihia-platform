import React from 'react'
import { motion } from 'framer-motion'

type Suggestion = {
  icon: string
  label: string
}

type Props = {
  suggestions: Suggestion[]
  onSelect: (label: string) => void
}

export default function DynamicSuggestions({ suggestions, onSelect }: Props) {
  if (!suggestions || suggestions.length === 0) return null

  return (
    <motion.div 
      className="dynamic-suggestions"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <div className="suggestion-header">💡 Vous pourriez aussi aimer :</div>
      <div className="suggestion-list">
        {suggestions.map((s, i) => (
          <motion.button
            key={i}
            className="suggestion-chip"
            onClick={() => onSelect(s.label)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.2 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="chip-icon">{s.icon}</span>
            <span className="chip-label">{s.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}
