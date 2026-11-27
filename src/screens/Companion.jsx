import {
  ConversationProvider,
  useConversationClientTool,
  useConversationControls,
  useConversationMode,
  useConversationStatus,
} from '@elevenlabs/react'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n'
import { createOfflineCompanion } from '../lib/companionOffline'
import { classifyRequest } from '../lib/matching'
import { canListen, listen, speak, stopSpeaking } from '../lib/speech'
import { actions, useStore } from '../store'

// Set in .env.local → VITE_ELEVENLABS_AGENT_ID=agent_xxx  (see docs/elevenlabs-nurse-agent.md)
const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID
// Only enable if you turned on "language" + "first message" overrides in the agent's Security tab.
const ALLOW_OVERRIDES = import.meta.env.VITE_ELEVENLABS_ALLOW_OVERRIDES === 'true'

/*
  Safety layers
  1. The agent's system prompt (docs/elevenlabs-nurse-agent.md): companion only, no diagnosis, no medication advice.
  2. THIS app independently scans every resident utterance for red flags and shows SOS — even if the agent misses it.
  3. The agent can only act through 3 narrow client tools: suggest_emergency, request_volunteer, request_nurse_callback.
*/

export default function Companion({ me, go }) {
  const { t, lang } = useLang()
  const state = useStore()
  const [messages, setMessages] = useState([])
  const [alert, setAlert] = useState(null) // 'sos' | 'volunteer' | 'nurse'
  const bottom = useRef(null)

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages])

  const addMessage = (role, text) => {
    if (!text?.trim()) return
    setMessages((m) => [...m, { role, text }])
    if (role === 'user' && classifyRequest(text) === 'emergency') setAlert('sos') // safety layer 2
  }

  const handleAction = (kind, task = '') => {
    if (kind === 'sos') { setAlert('sos'); return 'The red SOS button is now shown on screen. Ask the resident to press it.' }
    if (kind === 'nurse') {
      actions.createRequest(me.id, task || (lang === 'de' ? 'Rückruf gewünscht (Gespräch mit Clara)' : 'Call-back requested (chat with Clara)'), 'medical')
      setAlert('nurse')
      return 'Nurse call-back requested. A nurse or doctor will call today.'
    }
    if (kind === 'volunteer') {
      const type = classifyRequest(task)
      if (type === 'emergency') { setAlert('sos'); return 'This sounds like an emergency. The SOS button is shown instead.' }
      const finalType = type === 'other' || type === 'medical' ? 'companionship' : type
      actions.createRequest(me.id, task || (lang === 'de' ? 'Möchte Gesellschaft auf einen Kaffee' : 'Would like some company for a coffee'), finalType)
      setAlert('volunteer')
      return 'Volunteer request sent. Nearby trusted volunteers have been notified.'
    }
    return 'Unknown action.'
  }

  const appointment = state.rotation.flatMap((d) => d.slots.filter((s) => s.bookedBy === me.id).map((s) => `${d.day} ${s.time} with ${d.who}`))[0]
  const context = [
    `Daily check-in today: ${me.lastCheckIn === 'today-ok' ? 'doing well' : me.lastCheckIn === 'today-help' ? 'asked for help' : 'not yet'}.`,
    appointment ? `Upcoming doctor appointment: ${appointment}.` : 'No doctor appointment booked.',
    'Lives alone in the village. Enjoys gardening and music.', // fictional
  ].join(' ')

  return (
    <div className="flex h-full flex-col space-y-3">
      <button onClick={() => { stopSpeaking(); go('home') }} className="self-start text-lg text-teal-700">{t('back')}</button>

      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-3xl">👩‍⚕️</div>
        <div>
          <h2 className="text-2xl font-bold">{t('cTitle')}</h2>
          <p className="text-sm text-slate-500">{t('cSub')}</p>
        </div>
      </div>
      <span className={`self-start rounded-full px-2 py-0.5 text-xs ${AGENT_ID ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>
        {AGENT_ID ? t('cLive') : t('cDemo')}
      </span>

      {alert === 'sos' && (
        <div className="space-y-2 rounded-2xl bg-red-50 p-3 text-red-900">
          <p className="font-bold">{t('cSosBanner')}</p>
          <button onClick={() => { stopSpeaking(); go('sos') }} className="w-full rounded-2xl bg-red-600 py-4 text-xl font-semibold text-white">{t('btnSos')}</button>
          <button onClick={() => setAlert(null)} className="w-full rounded-xl bg-white py-2 text-base text-slate-700 ring-1 ring-slate-300">{t('cNotNow')}</button>
        </div>
      )}
      {alert === 'volunteer' && <div className="rounded-2xl bg-teal-50 p-3 text-teal-900">{t('cVolunteer')}</div>}
      {alert === 'nurse' && <div className="rounded-2xl bg-violet-50 p-3 text-violet-900">{t('medWaiting')}</div>}

      {AGENT_ID ? (
        <ConversationProvider agentId={AGENT_ID}>
          <LiveSession me={me} context={context} onMessage={addMessage} onAction={handleAction} />
        </ConversationProvider>
      ) : (
        <OfflineSession me={me} onMessage={addMessage} onAction={handleAction} />
      )}

      <div className="max-h-64 min-h-24 space-y-2 overflow-y-auto rounded-2xl bg-slate-50 p-3">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-base ${m.role === 'user' ? 'ml-auto bg-teal-600 text-white' : 'bg-white shadow-sm'}`}>
            {m.text}
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <p className="text-xs text-slate-500">🛡️ {t('cSafety')}</p>
    </div>
  )
}

// ---------------- ElevenLabs live voice agent ----------------

function LiveSession({ me, context, onMessage, onAction }) {
  const { t, lang } = useLang()
  const { startSession, endSession } = useConversationControls()
  const { status, message } = useConversationStatus()
  const { isSpeaking } = useConversationMode()
  const [err, setErr] = useState(null)

  // Narrow client tools — names must match the tools configured on the agent.
  useConversationClientTool('suggest_emergency', () => onAction('sos'))
  useConversationClientTool('request_volunteer', ({ task }) => onAction('volunteer', String(task ?? '')))
  useConversationClientTool('request_nurse_callback', ({ question }) => onAction('nurse', String(question ?? '')))

  useEffect(() => () => endSession(), [endSession])

  const firstName = me.name.split(' ')[0]
  const start = async () => {
    setErr(null)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setErr('Microphone permission denied')
      return
    }
    startSession({
      dynamicVariables: {
        resident_name: firstName,
        preferred_language: lang === 'de' ? 'German' : 'English',
        today_context: context,
      },
      ...(ALLOW_OVERRIDES && {
        overrides: {
          agent: {
            language: lang,
            firstMessage: lang === 'de' ? `Hallo ${firstName}, hier ist Schwester Clara. Wie geht es Ihnen heute?` : `Hello ${firstName}, it's Nurse Clara. How are you today?`,
          },
        },
      }),
      onMessage: ({ message: text, role }) => onMessage(role === 'user' ? 'user' : 'agent', text),
      onError: (m) => { console.warn('[Clara] error', m); setErr(String(m)) },
      onDisconnect: (d) => { console.info('[Clara] disconnected', d); if (d?.reason === 'error') setErr(d.message) },
      onStatusChange: ({ status: s }) => console.info('[Clara] status', s),
    })
  }

  const connected = status === 'connected'
  const label = status === 'connecting' ? t('cConnecting') : connected ? (isSpeaking ? t('cSpeaking') : t('cListening')) : t('cIdle')

  return (
    <div className="space-y-2 text-center">
      <div className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full text-5xl transition ${connected ? (isSpeaking ? 'scale-110 bg-teal-500' : 'bg-teal-200') : 'bg-slate-200'} ${connected && isSpeaking ? 'animate-pulse' : ''}`}>
        👩‍⚕️
      </div>
      <p className="text-sm text-slate-600">{label}</p>
      {connected ? (
        <button onClick={() => endSession()} className="w-full rounded-2xl border-2 border-slate-300 py-4 text-xl font-semibold">{t('cEnd')}</button>
      ) : (
        <button onClick={start} disabled={status === 'connecting'} className="w-full rounded-2xl bg-teal-600 py-4 text-xl font-semibold text-white disabled:opacity-50">{t('cStart')}</button>
      )}
      {(err || (status === 'error' && message)) && <p className="text-xs text-red-600">{t('cError', { msg: err || message })}</p>}
    </div>
  )
}

// ---------------- Offline fallback (no API key / no Wi-Fi) ----------------

function OfflineSession({ me, onMessage, onAction }) {
  const { t, lang, speechLang } = useLang()
  const firstName = me.name.split(' ')[0]
  const [brain] = useState(() => createOfflineCompanion(firstName))
  const [draft, setDraft] = useState('')
  const [listening, setListening] = useState(false)
  const draftRef = useRef('')
  const greeted = useRef(false)

  useEffect(() => {
    if (greeted.current) return
    greeted.current = true
    const hello = lang === 'de' ? `Hallo ${firstName}, hier ist Schwester Clara. Wie geht es Ihnen heute?` : `Hello ${firstName}, it's Nurse Clara. How are you today?`
    onMessage('agent', hello)
    speak(hello, speechLang)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const send = (text) => {
    if (!text.trim()) return
    onMessage('user', text)
    setDraft('')
    draftRef.current = ''
    const { reply, action, task } = brain(text, lang)
    setTimeout(() => {
      onMessage('agent', reply)
      speak(reply, speechLang)
      if (action) onAction(action, task ?? text)
    }, 500)
  }

  const mic = () => {
    if (listening) return
    stopSpeaking()
    setListening(true)
    listen({
      lang: speechLang,
      onText: (x) => { draftRef.current = x; setDraft(x) },
      onEnd: () => { setListening(false); send(draftRef.current) },
    })
  }

  return (
    <div className="space-y-2">
      {canListen && (
        <button onClick={mic} className={`w-full rounded-2xl py-4 text-xl font-semibold text-white ${listening ? 'animate-pulse bg-red-500' : 'bg-teal-600'}`}>
          {listening ? `🎙️ ${t('cListening')}` : t('cStart')}
        </button>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send(draft) }} className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('cType')} className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 px-3 py-2 text-base focus:border-teal-500 focus:outline-none" />
        <button className="rounded-xl bg-slate-900 px-4 text-white">{t('cSend')}</button>
      </form>
    </div>
  )
}
