export function htmlToSpeechText(html: string): string {
  if (typeof document !== 'undefined') {
    const el = document.createElement('div')
    el.innerHTML = html
    return (el.textContent || el.innerText || '').replace(/\s+/g, ' ').trim()
  }
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function fetchBotSpeech(
  apiBaseUrl: string,
  text: string,
  lang: string,
  getAuthHeaders: () => Record<string, string>,
): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/speak`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ text: htmlToSpeechText(text).slice(0, 4096), lang }),
  })
  if (!response.ok) {
    throw new Error(`speak failed: ${response.status}`)
  }
  return response.blob()
}

let activeAudio: HTMLAudioElement | null = null
let activeUrl: string | null = null

export function stopBotSpeech(): void {
  if (activeAudio) {
    activeAudio.pause()
    activeAudio = null
  }
  if (activeUrl) {
    URL.revokeObjectURL(activeUrl)
    activeUrl = null
  }
}

export async function playBotSpeechBlob(blob: Blob): Promise<void> {
  stopBotSpeech()
  activeUrl = URL.createObjectURL(blob)
  activeAudio = new Audio(activeUrl)
  activeAudio.onended = () => stopBotSpeech()
  await activeAudio.play()
}
