import { useEffect, useRef, useState } from 'react'
import { CHANNELS, HOTLINE } from '../data/seed'
import { TYPE_LABEL_I18N, useLang } from '../i18n'
import { applyPhoneEvent, DTMF_KEYS, parseMenuChoice, playDtmf, salutation } from '../lib/ivr'
import { classifyRequest } from '../lib/matching'
import { canListen, listen, speak, stopSpeaking } from '../lib/speech'
import { actions, useStore } from '../store'

/*
  Landline channel. Many residents aged 80+ have only a landline, so DorfConnect calls them:
  every morning at 09:00 "Clara" (an AI voice agent, disclosed as such) rings and offers a 3-key menu.
  Here it is simulated in the browser (speech synthesis + keypad + speech recognition).
  The same flow runs on a real phone number via ElevenLabs → docs/elevenlabs-phone-checkin.md.
  Safety: nothing here decides that something is an emergency, and nothing ever calls 112.
  Red-flag words only make Clara ASK; the person chooses, and dials 112 themselves.
*/

const L = {
  de: {
    title: '☎️ Festnetz: Hilfe ohne Smartphone',
    sub: 'Viele über 80 haben nur ein Festnetztelefon. Clara ruft jeden Morgen um 9 Uhr an. Tasten drücken oder einfach sprechen.',
    who: 'Bewohner mit Festnetz',
    onlyLandline: 'nur Festnetz',
    modeOut: '09:00 Kontrollanruf',
    modeIn: 'Bewohner ruft Hotline an',
    startOut: '▶ Anruf um 09:00 starten',
    startIn: (n) => `☎️ ${n} anrufen`,
    hotline: 'DorfConnect-Hotline (steht auf der Kühlschrankkarte)',
    ringing: 'Es klingelt …',
    pickUp: '📞 Abheben',
    noAnswer: '🔕 Niemand hebt ab',
    hangUp: 'Auflegen',
    again: '↺ Neuer Anruf',
    retrying: '09:00 keine Antwort … erneuter Anruf um 09:30',
    escalated: (c) => `Wieder keine Antwort. Koordinatorin ${c} ist informiert und schaut nach.`,
    say: '🎙️ Sprechen',
    listening: 'Ich höre zu …',
    typeHere: '… oder hier tippen (z. B. „1“ oder „Ich brauche Brot“)',
    send: 'Senden',
    conversation: 'Gespräch',
    noCall: 'Noch kein Anruf. Starten Sie oben den 09:00-Anruf.',
    status: { 'today-ok': '✅ Heute gemeldet', 'today-help': '🙋 Hat heute Hilfe angefragt', none: '⏳ Heute noch nicht gemeldet' },
    via: 'über',
    quickTitle: 'Schnellauswahl',
    quick: [
      ['🛒', 'Einkaufen', 'Ich brauche jemanden, der für mich einkauft, Brot und Milch.'],
      ['💊', 'Apotheke', 'Können Sie meine Medikamente aus der Apotheke holen?'],
      ['🚗', 'Fahrt zum Arzt', 'Ich brauche eine Fahrt zum Arzttermin am Mittwoch.'],
      ['☕', 'Gesellschaft', 'Ich bin so allein und würde gern mal reden.'],
      ['🤕', 'Gestürzt', 'Ich bin gestürzt.'],
    ],
    yes112: '1 · Ja, Notruf',
    no112: '2 · Nein, kein Notfall',
    sim112: 'SIMULATION: Es wird kein echter Notruf gewählt. In echt wählt die Person selbst die 112 oder drückt ihren Hausnotrufknopf. Die Partner-Notrufzentrale übernimmt.',
    log: 'Anrufprotokoll',
    noLog: 'Noch keine Anrufe.',
    out: '↗ Kontrollanruf',
    in: '↙ Hotline-Anruf',
    transcript: 'Mitschrift',
    real: 'So funktioniert es in echt',
    realBody: 'Derselbe Ablauf läuft über eine echte Telefonnummer: Ein ElevenLabs-Sprachagent („Clara“) ruft um 09:00 an (Batch-Anrufe), versteht Tasten (DTMF) und Sprache und meldet Ergebnisse per Webhook an /api/phone-events. Kein Anruf geht automatisch an die 112.',
    realDocs: 'Anleitung: docs/elevenlabs-phone-checkin.md · Testanruf: scripts/elevenlabs-call.mjs',
    live: '🟢 Echter Anruf empfangen',
    liveReady: '🟡 Telefon-Brücke bereit · wartet auf echte Anrufe',
    sim: '⚪ Simulationsmodus',
    liveHint: 'Ereignisse vom echten Telefon erscheinen hier automatisch.',
    liveApplied: 'Vom echten Telefon',
  },
  en: {
    title: '☎️ Landline: help without a smartphone',
    sub: 'Many people over 80 only have a landline. Clara calls every morning at 9. Press a key or just speak.',
    who: 'Residents with a landline',
    onlyLandline: 'landline only',
    modeOut: '09:00 check-in call',
    modeIn: 'Resident calls the hotline',
    startOut: '▶ Start the 09:00 call',
    startIn: (n) => `☎️ Call ${n}`,
    hotline: 'DorfConnect hotline (printed on the fridge card)',
    ringing: 'Ringing …',
    pickUp: '📞 Pick up',
    noAnswer: '🔕 Nobody answers',
    hangUp: 'Hang up',
    again: '↺ New call',
    retrying: 'No answer at 09:00 … calling again at 09:30',
    escalated: (c) => `Still no answer. Coordinator ${c} has been informed and will check in person.`,
    say: '🎙️ Speak',
    listening: 'Listening …',
    typeHere: '… or type here (e.g. "1" or "I need bread")',
    send: 'Send',
    conversation: 'Conversation',
    noCall: 'No call yet. Start the 09:00 call above.',
    status: { 'today-ok': '✅ Checked in today', 'today-help': '🙋 Asked for help today', none: '⏳ Not checked in yet today' },
    via: 'via',
    quickTitle: 'Quick choices',
    quick: [
      ['🛒', 'Groceries', 'I need someone to do my shopping, bread and milk.'],
      ['💊', 'Pharmacy', 'Could someone pick up my medicine from the pharmacy?'],
      ['🚗', 'Ride to doctor', 'I need a ride to my doctor appointment on Wednesday.'],
      ['☕', 'Company', 'I am so alone and would like to talk to someone.'],
      ['🤕', 'I fell', 'I fell over.'],
    ],
    yes112: '1 · Yes, emergency',
    no112: '2 · No, not an emergency',
    sim112: 'SIMULATION: no real emergency call is made. In real life the person dials 112 themselves or presses their alarm button; the partner alarm centre takes over.',
    log: 'Call log',
    noLog: 'No calls yet.',
    out: '↗ Check-in call',
    in: '↙ Hotline call',
    transcript: 'Transcript',
    real: 'How this works in real life',
    realBody: 'The same flow runs on a real phone number: an ElevenLabs voice agent ("Clara") calls at 09:00 (batch calling), understands keypad tones (DTMF) and speech, and reports results via a webhook to /api/phone-events. Nothing ever calls 112 automatically.',
    realDocs: 'Guide: docs/elevenlabs-phone-checkin.md · Test call: scripts/elevenlabs-call.mjs',
    live: '🟢 Real phone call received',
    liveReady: '🟡 Phone bridge ready · waiting for real calls',
    sim: '⚪ Simulation mode',
    liveHint: 'Events from the real phone appear here automatically.',
    liveApplied: 'From the real phone',
  },
}

/** What Clara says. Kept here so the same wording can be copied into the ElevenLabs agent. */
const CLARA = {
  de: {
    greetOut: (n, c) => `Guten Morgen ${n}, hier ist Clara, die digitale Assistentin von DorfConnect. Wenn es Ihnen gut geht, drücken Sie die 1. Wenn Sie Hilfe brauchen, die 2. Wenn Sie mit ${c} sprechen möchten, die 3. Sie können es mir auch einfach sagen.`,
    greetIn: (n, c) => `Hallo ${n}, hier ist Clara, die digitale Assistentin von DorfConnect. Wenn Sie sagen möchten, dass es Ihnen gut geht, drücken Sie die 1. Wenn Sie Hilfe brauchen, die 2. Wenn Sie mit ${c} sprechen möchten, die 3.`,
    repeat: 'Entschuldigung, das habe ich nicht verstanden. Gut: die 1. Hilfe: die 2. Koordinatorin: die 3.',
    ok: 'Schön, dass es Ihnen gut geht! Ich gebe Bescheid. Einen schönen Tag noch.',
    askHelp: 'Wobei brauchen Sie Hilfe? Sagen Sie es mir einfach.',
    ask112: 'Das klingt ernst. Möchten Sie den Notruf 112? Drücken Sie die 1 für Ja oder die 2 für Nein.',
    say112: 'Bitte legen Sie jetzt auf und wählen Sie die 112. Oder drücken Sie Ihren Notrufknopf.',
    helpOk: 'Danke. Wir finden jemanden aus dem Dorf, der Ihnen hilft. Sie bekommen einen Rückruf.',
    helpMed: 'Danke. Eine Pflegekraft oder ein Arzt ruft Sie heute zurück.',
    connect: (c) => `Einen Moment bitte, ich verbinde Sie mit ${c}.`,
    bye: 'Auf Wiederhören.',
  },
  en: {
    greetOut: (n, c) => `Good morning ${n}, this is Clara, the digital assistant from DorfConnect. If you are well, press 1. If you need help, press 2. If you would like to speak to ${c}, press 3. You can also just tell me.`,
    greetIn: (n, c) => `Hello ${n}, this is Clara, the digital assistant from DorfConnect. To let us know you are well, press 1. If you need help, press 2. To speak to ${c}, press 3.`,
    repeat: 'Sorry, I did not catch that. Well: press 1. Help: press 2. Coordinator: press 3.',
    ok: 'Lovely to hear you are well! I will let everyone know. Have a nice day.',
    askHelp: 'What do you need help with? Just tell me.',
    ask112: 'That sounds serious. Do you want emergency service 112? Press 1 for yes or 2 for no.',
    say112: 'Please hang up now and dial 112. Or press your alarm button.',
    helpOk: 'Thank you. We will find someone from the village to help you. You will get a call back.',
    helpMed: 'Thank you. A nurse or doctor will call you back today.',
    connect: (c) => `One moment please, I am connecting you to ${c}.`,
    bye: 'Goodbye.',
  },
}

// Results are stored in English (like the activity log) and translated for display.
function resultLabel(r, lang) {
  if (lang === 'en' || !r) return r
  const m = /^Help requested: (\w+)(.*)$/.exec(r)
  if (m) return `Hilfe angefragt: ${TYPE_LABEL_I18N.de[m[1]] ?? m[1]}${m[2].replace('(live phone call)', '(echtes Telefon)')}`
  return {
    OK: 'OK, geht gut',
    'OK (live phone call)': 'OK, geht gut (echtes Telefon)',
    'Connected to coordinator': 'Mit Koordinatorin verbunden',
    'No answer at 09:00 and 09:30 → coordinator informed': 'Keine Antwort um 09:00 und 09:30 → Koordinatorin informiert',
    'Asked about 112 → advised to hang up and dial 112': '112 angeboten → aufgelegt, um 112 zu wählen',
    'Hung up': 'Aufgelegt',
  }[r] ?? r
}

const PROCESSED_KEY = 'dorfconnect-phone-processed'
const readProcessed = () => {
  try { return new Set(JSON.parse(localStorage.getItem(PROCESSED_KEY) || '[]')) } catch { return new Set() }
}
const saveProcessed = (set) => {
  try { localStorage.setItem(PROCESSED_KEY, JSON.stringify([...set].slice(-300))) } catch { /* ignore */ }
}

export default function Landline() {
  const state = useStore()
  const { lang, locale } = useLang()
  const s = L[lang] ?? L.en
  const withLandline = state.residents.filter((r) => r.devices?.landline)
  const [meId, setMeId] = useState('gertrud')
  const me = withLandline.find((r) => r.id === meId) ?? withLandline[0]
  const [mode, setMode] = useState('outbound') // 'outbound' | 'inbound'
  const live = useLiveBridge(state)

  if (!me) return <p className="text-slate-500">No resident with a landline.</p>
  const status = s.status[me.lastCheckIn] ?? s.status.none

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{s.title}</h1>
          <p className="text-slate-600">{s.sub}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${live.connected ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
          {live.connected ? (live.applied.length ? s.live : s.liveReady) : s.sim}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1 text-sm">
        <span className="text-slate-500">{s.who}:</span>
        {withLandline.map((r) => (
          <button
            key={r.id}
            onClick={() => setMeId(r.id)}
            className={`rounded-full px-3 py-1 ${r.id === me.id ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
          >
            {r.name.split(' ')[0]}, {r.age}{!r.devices.smartphone && ` · ☎️ ${s.onlyLandline}`}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {['outbound', 'inbound'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-xl px-4 py-2 font-medium ${mode === m ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}
          >
            {m === 'outbound' ? `🕘 ${s.modeOut}` : `↙ ${s.modeIn}`}
          </button>
        ))}
        <span className="self-center text-sm text-slate-600">
          {me.name}: {status}
          {me.lastCheckInVia && me.lastCheckIn ? ` (${s.via} ${CHANNELS[me.lastCheckInVia]?.[lang] ?? me.lastCheckInVia})` : ''}
        </span>
      </div>

      {/* key = restart the call simulation when the person or mode changes */}
      <CallSimulator key={`${me.id}-${mode}-${lang}`} me={me} mode={mode} state={state} />

      <div className="grid gap-4 md:grid-cols-2">
        <CallLog calls={state.calls.filter((c) => c.residentId === me.id)} locale={locale} />
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-semibold">{live.connected ? (live.applied.length ? s.live : s.liveReady) : s.sim}</h2>
            <p className="text-sm text-slate-600">{s.liveHint}</p>
            {live.applied.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {live.applied.slice(0, 5).map((e) => (
                  <li key={e.id} className="rounded-lg bg-green-50 px-2 py-1 text-green-900">
                    📞 {s.liveApplied}: {state.residents.find((r) => r.id === e.residentId)?.name ?? e.residentId} · {e.type === 'checkin' ? '✅' : `🙋 „${e.text}“`}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl bg-sky-50 p-4 text-sky-950">
            <h2 className="font-semibold">💡 {s.real}</h2>
            <p className="mt-1 text-sm">{s.realBody}</p>
            <p className="mt-2 font-mono text-xs text-sky-800">{s.realDocs}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/** One simulated phone call: outbound 09:00 check-in or inbound hotline call. */
function CallSimulator({ me, mode, state }) {
  const { lang, speechLang } = useLang()
  const s = L[lang] ?? L.en
  const c = CLARA[lang] ?? CLARA.en
  const name = salutation(me, lang)
  const coordFull = state.coordinator.name
  const coord = salutation({ id: 'coordinator', name: coordFull }, lang)
  const purpose = mode === 'outbound' ? 'checkin' : 'help'

  // phase: idle → ringing → menu → (help → emergency?) → done | retry → escalated
  const [phase, setPhase] = useState('idle')
  const [lines, setLines] = useState([])
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const [lastKey, setLastKey] = useState(null)
  const [helpText, setHelpText] = useState('')
  const linesRef = useRef([])
  const stopRef = useRef(null)
  const timers = useRef([])
  const bottom = useRef(null)

  useEffect(() => () => {
    timers.current.forEach(clearTimeout)
    stopRef.current?.()
    stopSpeaking()
  }, [])
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [lines])

  const push = (who, text) => {
    linesRef.current = [...linesRef.current, { who, text }]
    setLines(linesRef.current)
  }
  const clara = (text) => { push('Clara', text); speak(text, speechLang) }
  const heard = (text) => push(me.name.split(' ')[0], text)
  const finish = (result, next = 'done') => {
    actions.logCall({ residentId: me.id, direction: mode, purpose, result, transcript: linesRef.current })
    setPhase(next)
  }
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms))

  const start = () => {
    linesRef.current = []
    setLines([])
    setHelpText('')
    if (mode === 'outbound') setPhase('ringing')
    else answer()
  }
  const answer = () => {
    setPhase('menu')
    clara(mode === 'outbound' ? c.greetOut(name, coord) : c.greetIn(name, coord))
  }
  const noAnswer = () => {
    setPhase('retry')
    later(() => finish('No answer at 09:00 and 09:30 → coordinator informed', 'escalated'), 2500)
  }
  const hangUp = () => {
    stopSpeaking()
    stopRef.current?.()
    if (['menu', 'help', 'emergency'].includes(phase)) finish('Hung up', 'ended')
    else setPhase('idle')
  }

  const submitHelp = (text, { askedAlready = false } = {}) => {
    const type = classifyRequest(text, { askedAlready })
    if (type === 'emergency') {
      setHelpText(text)
      setPhase('emergency')
      clara(c.ask112)
      return
    }
    actions.createRequest(me.id, text, type, { via: 'landline', by: null })
    clara(type === 'medical' ? c.helpMed : c.helpOk)
    finish(`Help requested: ${type}`)
  }

  // One handler for keypad presses, speech and typed text, depending on where we are in the call.
  const handle = (raw, fromKey = false) => {
    const text = raw.trim()
    if (!text) return
    if (!fromKey) heard(text)
    if (phase === 'help') return submitHelp(text)
    const choice = parseMenuChoice(text, phase === 'emergency' ? 'yesno' : 'menu')
    if (phase === 'emergency') {
      if (choice === '1') {
        clara(c.say112)
        finish('Asked about 112 → advised to hang up and dial 112', 'call112')
      } else if (choice === '2') {
        submitHelp(helpText, { askedAlready: true }) // the person said "not an emergency"
      } else clara(c.ask112)
      return
    }
    if (phase !== 'menu') return
    if (choice === '1') {
      actions.checkIn(me.id, 'landline')
      clara(c.ok)
      finish('OK')
    } else if (choice === '2') {
      setPhase('help')
      clara(c.askHelp)
    } else if (choice === '3') {
      clara(c.connect(coord))
      finish('Connected to coordinator', 'coordinator')
    } else clara(c.repeat)
  }

  const pressKey = (k) => {
    playDtmf(k)
    setLastKey(k)
    later(() => setLastKey(null), 250)
    if (phase === 'menu' || phase === 'emergency') {
      heard(`[${k}]`)
      handle(k, true)
    }
  }

  const toggleMic = () => {
    if (listening) { stopRef.current?.(); return }
    stopSpeaking()
    let heardText = ''
    setListening(true)
    stopRef.current = listen({
      lang: speechLang,
      onText: (t) => { heardText = t; setInput(t) },
      onEnd: () => {
        setListening(false)
        if (heardText) { handle(heardText); setInput('') }
      },
    })
  }

  const inCall = ['menu', 'help', 'emergency'].includes(phase)
  const display = {
    idle: mode === 'outbound' ? '09:00 · DorfConnect' : HOTLINE.display,
    ringing: `🔔 ${s.ringing}`,
    retry: '🔕 09:00 → 09:30',
    escalated: `🧭 ${coordFull}`,
    coordinator: `🔁 ${coordFull}`,
    call112: '☎️ 112 ?',
  }[phase] ?? (inCall ? '🗣️ Clara · DorfConnect' : `✓ ${c.bye}`)

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
      {/* The classic landline handset */}
      <div className="rounded-[2rem] bg-amber-100 p-4 shadow-lg ring-4 ring-amber-200">
        <div className="flex items-center justify-center gap-3">
          <span className={`text-7xl ${phase === 'ringing' || phase === 'retry' ? 'animate-bounce' : ''}`} aria-hidden>☎️</span>
          <div className="text-xs text-amber-900">
            <p className="font-semibold">{me.name}</p>
            <p>{me.devices.smartphone ? '📱 + ☎️' : `☎️ ${s.onlyLandline}`}</p>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-lime-100 px-3 py-2 text-center font-mono text-lg text-lime-950 ring-2 ring-lime-300" aria-live="polite">
          {display}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {DTMF_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => pressKey(k)}
              aria-label={`Key ${k}`}
              className={`h-14 rounded-2xl text-2xl font-bold shadow transition ${lastKey === k ? 'scale-95 bg-teal-600 text-white' : 'bg-white text-slate-800 hover:bg-amber-50'} ${['1', '2', '3'].includes(k) && phase === 'menu' ? 'ring-2 ring-teal-500' : ''}`}
            >
              {k}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-amber-900">
          {mode === 'inbound' ? `${s.hotline}: ${HOTLINE.display} (${HOTLINE.note})` : '1 = 😊 · 2 = 🙋 · 3 = 🧭'}
        </p>
      </div>

      {/* Call controls + conversation */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {(phase === 'idle' || !inCall) && phase !== 'ringing' && phase !== 'retry' && (
            <button onClick={start} className="rounded-xl bg-teal-600 px-4 py-3 text-lg font-semibold text-white hover:bg-teal-700">
              {phase === 'idle' ? (mode === 'outbound' ? s.startOut : s.startIn(HOTLINE.display)) : s.again}
            </button>
          )}
          {phase === 'ringing' && (
            <>
              <button onClick={answer} className="rounded-xl bg-green-600 px-4 py-3 text-lg font-semibold text-white">{s.pickUp}</button>
              <button onClick={noAnswer} className="rounded-xl bg-slate-200 px-4 py-3 text-lg font-semibold text-slate-800">{s.noAnswer}</button>
            </>
          )}
          {inCall && (
            <button onClick={hangUp} className="rounded-xl bg-red-100 px-4 py-3 font-semibold text-red-800">📵 {s.hangUp}</button>
          )}
        </div>

        {phase === 'retry' && <p className="animate-pulse rounded-xl bg-orange-50 p-3 text-orange-900">🔁 {s.retrying}</p>}
        {phase === 'escalated' && <p className="rounded-xl bg-orange-100 p-3 font-semibold text-orange-900">🧭 {s.escalated(coordFull)}</p>}

        <h2 className="font-semibold">{s.conversation}</h2>
        <div className="max-h-72 min-h-32 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">
          {lines.length === 0 && <p className="text-sm text-slate-500">{s.noCall}</p>}
          {lines.map((l, i) => (
            <div key={i} className={`flex ${l.who === 'Clara' ? '' : 'justify-end'}`}>
              <p className={`max-w-[85%] rounded-2xl px-3 py-2 ${l.who === 'Clara' ? 'bg-teal-100 text-teal-950' : 'bg-amber-100 text-amber-950'}`}>
                <span className="block text-xs font-semibold opacity-70">{l.who}</span>
                {l.text}
              </p>
            </div>
          ))}
          <div ref={bottom} />
        </div>

        {phase === 'emergency' && (
          <div className="grid gap-2 sm:grid-cols-2">
            <button onClick={() => pressKey('1')} className="rounded-xl bg-red-600 px-4 py-4 text-lg font-bold text-white">{s.yes112}</button>
            <button onClick={() => pressKey('2')} className="rounded-xl bg-white px-4 py-4 text-lg font-semibold text-slate-800 ring-2 ring-slate-300">{s.no112}</button>
          </div>
        )}
        {phase === 'call112' && (
          <div className="rounded-xl bg-red-50 p-4 text-red-900">
            <p className="text-xl font-bold">☎️ {c.say112}</p>
            <p className="mt-1 text-sm">{s.sim112}</p>
          </div>
        )}
        {phase === 'coordinator' && (
          <p className="rounded-xl bg-teal-50 p-4 text-lg text-teal-900">🔁 {c.connect(coordFull)}</p>
        )}

        {phase === 'help' && (
          <div>
            <p className="mb-1 text-sm text-slate-500">{s.quickTitle}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {s.quick.map(([icon, label, phrase]) => (
                <button key={label} onClick={() => handle(phrase)} className="rounded-xl bg-slate-100 p-3 text-left text-base hover:bg-slate-200">
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {inCall && (
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => { e.preventDefault(); handle(input); setInput('') }}
          >
            {canListen && (
              <button
                type="button"
                onClick={toggleMic}
                className={`rounded-xl px-4 py-3 font-semibold text-white ${listening ? 'animate-pulse bg-red-500' : 'bg-teal-600'}`}
              >
                {listening ? s.listening : s.say}
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={s.typeHere}
              className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-3 py-2 text-lg focus:border-teal-500 focus:outline-none"
            />
            <button type="submit" className="rounded-xl bg-slate-800 px-4 py-3 font-semibold text-white">{s.send}</button>
          </form>
        )}
      </div>
    </div>
  )
}

function CallLog({ calls, locale }) {
  const { lang } = useLang()
  const s = L[lang] ?? L.en
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold">📋 {s.log}</h2>
      {calls.length === 0 && <p className="mt-1 text-sm text-slate-500">{s.noLog}</p>}
      <ul className="mt-2 space-y-2">
        {calls.map((call) => (
          <li key={call.id} className="rounded-xl bg-slate-50 p-2 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <span className="font-mono text-slate-500">{new Date(call.t).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</span>
              <span className="font-medium">{call.direction === 'outbound' ? s.out : s.in}</span>
            </div>
            <p>{resultLabel(call.result, lang)}</p>
            {call.transcript?.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-slate-500">{s.transcript} ({call.transcript.length})</summary>
                <ul className="mt-1 space-y-0.5 text-xs text-slate-600">
                  {call.transcript.map((l, i) => <li key={i}><b>{l.who}:</b> {l.text}</li>)}
                </ul>
              </details>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Polls the dev-only phone bridge (vite.config.js) every 2 s.
 * 200 → "live", and every new event from the real ElevenLabs call is applied exactly once.
 * Any error → simulation mode, silently.
 */
function useLiveBridge(state) {
  const [connected, setConnected] = useState(false)
  const [applied, setApplied] = useState([])
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    let alive = true
    const mountedAt = Date.now()
    const poll = async () => {
      try {
        const res = await fetch('/api/phone-events', { cache: 'no-store' })
        const events = res.ok ? await res.json() : null
        if (!alive) return
        if (!Array.isArray(events)) { setConnected(false); return }
        setConnected(true)
        const processed = readProcessed() // re-read: another tab may have applied some already
        const fresh = []
        for (const ev of events) {
          if (processed.has(ev.id)) continue
          processed.add(ev.id)
          // Ignore stale events (e.g. from a rehearsal: older than 5 min before this screen opened) and unknown residents.
          if (ev.t < mountedAt - 5 * 60_000) continue
          if (!stateRef.current.residents.some((r) => r.id === ev.residentId)) continue
          applyPhoneEvent(ev)
          fresh.push(ev)
        }
        saveProcessed(processed)
        if (fresh.length) setApplied((a) => [...fresh.reverse(), ...a])
      } catch {
        if (alive) setConnected(false)
      }
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return { connected, applied }
}
