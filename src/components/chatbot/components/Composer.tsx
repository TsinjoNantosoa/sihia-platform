import React, { useEffect, useRef, useState, KeyboardEvent } from 'react'
import { motion } from 'framer-motion'

type Props = {
  onSend: (text: string, meta?: { fromVoice?: boolean }) => void
  placeholder?: string
  language?: 'fr' | 'en'
  apiBaseUrl?: string
  getAuthHeaders?: () => Record<string, string>
  voiceEnabled?: boolean
}

const MAX_RECORD_MS = 60_000

export default function Composer({
  onSend,
  placeholder = 'Question sur SIH IA ? Posez-la ici !',
  language = 'fr',
  apiBaseUrl = '',
  getAuthHeaders,
  voiceEnabled = true,
}: Props) {
  const [value, setValue] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const recordTimeoutRef = useRef<number | null>(null)
  const mimeTypeRef = useRef('audio/webm')
  const MAX_CHARS = 200

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px'
      textareaRef.current.style.overflowY = 'hidden'
    }
    return () => {
      if (recordTimeoutRef.current) window.clearTimeout(recordTimeoutRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
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
    el.style.overflowY = 'hidden'
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value
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

  function pickMimeType(): string {
    if (typeof MediaRecorder === 'undefined') return ''
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4'
    return ''
  }

  async function transcribeBlob(blob: Blob) {
    if (!apiBaseUrl || !getAuthHeaders) {
      setVoiceError(language === 'fr' ? 'API chatbot non configurée' : 'Chatbot API not configured')
      return
    }
    setIsTranscribing(true)
    setVoiceError(null)
    const ext = mimeTypeRef.current.includes('mp4') ? 'voice.mp4' : 'voice.webm'
    const form = new FormData()
    form.append('file', blob, ext)
    form.append('lang', language)
    try {
      const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/transcribe`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: form,
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as { detail?: string }).detail || response.statusText)
      }
      const data = (await response.json()) as { text?: string }
      const text = (data.text || '').trim()
      if (!text) {
        setVoiceError(
          language === 'fr'
            ? 'Aucune parole détectée. Réessayez.'
            : 'No speech detected. Try again.',
        )
        return
      }
      onSend(text.slice(0, MAX_CHARS), { fromVoice: true })
    } catch {
      setVoiceError(
        language === 'fr'
          ? 'Échec de la transcription vocale.'
          : 'Voice transcription failed.',
      )
    } finally {
      setIsTranscribing(false)
    }
  }

  function stopRecording() {
    if (recordTimeoutRef.current) {
      window.clearTimeout(recordTimeoutRef.current)
      recordTimeoutRef.current = null
    }
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }
    setIsRecording(false)
  }

  async function toggleRecording() {
    if (isTranscribing) return

    if (isRecording) {
      stopRecording()
      return
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError(
        language === 'fr'
          ? 'Micro non supporté par ce navigateur.'
          : 'Microphone not supported in this browser.',
      )
      return
    }

    const mime = pickMimeType()
    if (!mime) {
      setVoiceError(
        language === 'fr'
          ? 'Enregistrement audio non supporté.'
          : 'Audio recording not supported.',
      )
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      mimeTypeRef.current = mime
      chunksRef.current = []

      const recorder = new MediaRecorder(stream, { mimeType: mime })
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        mediaRecorderRef.current = null
        const blob = new Blob(chunksRef.current, { type: mime })
        chunksRef.current = []
        if (blob.size > 0) void transcribeBlob(blob)
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setVoiceError(null)
      recordTimeoutRef.current = window.setTimeout(() => stopRecording(), MAX_RECORD_MS)
    } catch {
      setVoiceError(
        language === 'fr'
          ? 'Accès micro refusé ou indisponible.'
          : 'Microphone access denied or unavailable.',
      )
    }
  }

  const micLabel = isTranscribing
    ? (language === 'fr' ? 'Transcription...' : 'Transcribing...')
    : isRecording
      ? (language === 'fr' ? 'Arrêter' : 'Stop')
      : (language === 'fr' ? 'Message vocal' : 'Voice message')

  return (
    <div className="composer-row">
      <div className="chat-input-container composer-with-voice">
        {voiceEnabled ? (
          <div className="attachment-buttons">
            <motion.button
              type="button"
              className={`attach-btn composer-mic-btn${isRecording ? ' recording' : ''}${isTranscribing ? ' transcribing' : ''}`}
              onClick={() => void toggleRecording()}
              disabled={isTranscribing}
              aria-label={micLabel}
              title={micLabel}
              whileTap={{ scale: 0.92 }}
            >
              {isTranscribing ? '…' : isRecording ? '⏹' : '🎤'}
            </motion.button>
          </div>
        ) : null}
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
            disabled={isRecording || isTranscribing}
          />
          <div className="char-count">{value.length}/{MAX_CHARS}</div>
          <motion.button
            className="composer-send-btn"
            onClick={handleSend}
            aria-label="Envoyer le message"
            title="Envoyer"
            type="button"
            disabled={isRecording || isTranscribing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.1 }}
          >
            ➤
          </motion.button>
        </div>
      </div>
      {voiceError ? (
        <p className="composer-voice-error" role="alert">
          {voiceError}
        </p>
      ) : null}
      {isRecording ? (
        <p className="composer-voice-hint" aria-live="polite">
          {language === 'fr' ? 'Enregistrement… cliquez ⏹ pour envoyer' : 'Recording… click stop to send'}
        </p>
      ) : null}
    </div>
  )
}
