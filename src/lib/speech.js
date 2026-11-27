// Browser-only voice: Web Speech API (best in Chrome/Edge/Safari). Typing is always a fallback.

const Recognition =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

export const canListen = Boolean(Recognition)

/** Starts listening; returns a stop() function. */
export function listen({ lang = 'de-DE', onText, onEnd }) {
  if (!Recognition) return () => {}
  const r = new Recognition()
  r.lang = lang
  r.interimResults = true
  r.continuous = false
  r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(' '))
  r.onend = () => onEnd?.()
  r.onerror = () => onEnd?.()
  r.start()
  return () => r.stop()
}

export function speak(text, lang = 'de-DE') {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = 0.92
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}
