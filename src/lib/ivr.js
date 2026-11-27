// Small helpers for the landline / phone channel (Landline screen + live ElevenLabs phone bridge).

import { classifyRequest } from './matching'
import { actions } from '../store'

export const DTMF_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

// Real DTMF frequency pairs, so the keypad sounds like a phone.
const FREQ = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], '*': [941, 1209], 0: [941, 1336], '#': [941, 1477] }
let audio = null

export function playDtmf(key, ms = 160) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC || !FREQ[key]) return
    audio ??= new AC()
    const gain = audio.createGain()
    gain.gain.value = 0.08
    gain.connect(audio.destination)
    for (const f of FREQ[key]) {
      const osc = audio.createOscillator()
      osc.frequency.value = f
      osc.connect(gain)
      osc.start()
      osc.stop(audio.currentTime + ms / 1000)
    }
  } catch { /* audio is optional */ }
}

/**
 * Maps a key press, a spoken answer or typed text to a menu choice.
 * kind 'menu': '1' well · '2' help · '3' coordinator.  kind 'yesno': '1' yes · '2' no.  Returns null if unclear.
 */
export function parseMenuChoice(raw, kind = 'menu') {
  const t = ` ${raw.toLowerCase().replace(/[.,!?;:„“"]/g, ' ')} `
  const has = (words) => words.some((w) => t.includes(` ${w} `) || (w.length > 4 && t.includes(w)))
  if (kind === 'yesno') {
    const yes = has(['1', 'eins', 'one', 'ja', 'yes', 'jawohl', 'bitte', 'notruf', 'emergency'])
    const no = has(['2', 'zwei', 'two', 'nein', 'no', 'nicht', 'not', 'kein', 'keine', 'keinen'])
    if (yes && no) return null // ambiguous ("kein Notruf"?) → Clara simply asks again
    return yes ? '1' : no ? '2' : null
  }
  if (has(['3', 'drei', 'three', 'kraus', 'sabine', 'koordinatorin', 'coordinator', 'mensch', 'person'])) return '3'
  if (has(['nicht gut', 'nicht so gut', 'schlecht', 'not well', 'not good', 'not so good', 'bad'])) return '2'
  if (has(['2', 'zwei', 'two', 'hilfe', 'help', 'brauche', 'need'])) return '2'
  if (has(['1', 'eins', 'one', 'gut', 'good', 'fine', 'well', 'okay', 'ok', 'prima', 'bestens'])) return '1'
  return null
}

const MALE = new Set(['helmut', 'thomas', 'lukas', 'jonas', 'peter', 'markus'])

/** "Frau Klein" / "Mrs Klein" — how Clara addresses someone on the phone. */
export function salutation(person, lang = 'de') {
  const [first, ...rest] = person.name.split(' ')
  const male = MALE.has(first.toLowerCase())
  const title = lang === 'de' ? (male ? 'Herr' : 'Frau') : male ? 'Mr' : 'Mrs'
  return `${title} ${rest.join(' ') || first}`
}

/**
 * Applies one event from the real phone line (POSTed by the ElevenLabs agent's webhook tools).
 * The agent has already asked the "do you want 112?" question on the call, so a help text is
 * classified with askedAlready: true and becomes an everyday request (never an automatic emergency).
 */
export function applyPhoneEvent(ev) {
  if (ev.type === 'checkin') {
    actions.checkIn(ev.residentId, 'landline')
    actions.logCall({ residentId: ev.residentId, direction: 'outbound', purpose: 'checkin', result: 'OK (live phone call)', transcript: [] })
  } else if (ev.type === 'help' && ev.text) {
    const type = classifyRequest(ev.text, { askedAlready: true })
    actions.createRequest(ev.residentId, ev.text, type, { via: 'landline', by: null })
    actions.logCall({
      residentId: ev.residentId, direction: 'outbound', purpose: 'help',
      result: `Help requested: ${type} (live phone call)`,
      transcript: [{ who: 'Resident', text: ev.text }],
    })
  }
}
