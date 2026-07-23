import DOMPurify from 'dompurify'

// Explicit allowlist of tags a markdown-to-HTML renderer legitimately produces.
// Excludes: img, video, audio, iframe, svg, object, embed, form, input, button, canvas, math
// — no media elements that could be used as tracking pixels or rogue resource loads.
const BOT_TAGS = [
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'div', 'span',
]

// Omitting 'style' and 'src' prevents CSS-based data exfiltration and rogue resource loads.
const BOT_ATTR = ['href', 'target', 'rel', 'class']

/** Sanitize bot HTML (markdown output). No img/media/form/interactive elements. */
export function sanitizeBot(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: BOT_TAGS,
    ALLOWED_ATTR: BOT_ATTR,
  })
}

/** Sanitize user input — strips all HTML tags, keeps text content only. */
export function sanitizeUser(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], KEEP_CONTENT: true })
}
