// Proxy requests: the coordinator, a volunteer or family logs a request ON BEHALF of a resident
// who has no smartphone (landline call, drop-in hour, neighbour at the door…).
// Rule: the app never decides something is an emergency. Red-flag words make it ASK the person logging it.

import { useState } from 'react'
import { CHANNELS } from '../data/seed'
import { TYPE_LABEL_I18N, useLang } from '../i18n'
import { classifyRequest } from '../lib/matching'
import { actions, useStore } from '../store'

const L = {
  de: {
    who: 'Für wen?',
    channel: 'Wie hat die Person uns erreicht?',
    what: 'Was wird gebraucht?',
    placeholder: 'z. B. „Frau Schneider braucht am Freitag eine Fahrt zum Arzt“',
    quick: [
      ['🛒', 'Einkauf', 'Einkauf: Brot, Milch und Medikamente aus der Apotheke'],
      ['🚗', 'Fahrt zum Arzt', 'Fahrt zum Arzt am Freitag um 10 Uhr'],
      ['🧹', 'Haushalt', 'Hilfe im Haushalt: Glühbirne wechseln und Müll rausbringen'],
      ['✉️', 'Briefe', 'Hilfe mit einem Brief von der Krankenkasse'],
      ['☕', 'Gesellschaft', 'Gesellschaft: Kaffee trinken und reden'],
    ],
    understood: 'Erkannt als:',
    medicalNote: ' — geht an Pflege/Arzt, nicht an Helfer.',
    emTitle: '⚠️ Ist das ein Notfall?',
    emBody: 'Die Nachricht enthält ein Warnwort. Die App entscheidet das nicht — bitte fragen Sie die Person.',
    emYes: 'Ja, Notfall',
    emNo: 'Nein, kein Notfall — weiter',
    emYesBody: 'Sagen Sie der Person: Jetzt auflegen und 112 wählen — oder den Notrufknopf drücken. Bei einem Besuch vor Ort: selbst 112 anrufen. Die App ruft nie selbst 112 an.',
    weekly: '🔁 Jede Woche wiederholen',
    consent: '{name} ist mit dieser Anfrage einverstanden (am Telefon / persönlich gefragt)',
    consentNeeded: 'Bitte zuerst die Zustimmung bestätigen.',
    submit: 'Anfrage für {name} erfassen',
    ok: '✅ Anfrage für {name} erfasst ({via}). Helfer in der Nähe werden benachrichtigt.',
    okMedical: '✅ Medizinische Frage von {name} an Pflege/Arzt weitergeleitet.',
    checkIn: '✅ {name} heute als OK markieren (persönlich gesehen / am Telefon gesprochen)',
    checkedIn: '✅ {name} ist heute als OK markiert ({via}).',
    loggedBy: 'Erfasst von {by}',
  },
  en: {
    who: 'For whom?',
    channel: 'How did they contact us?',
    what: 'What do they need?',
    placeholder: 'e.g. "Mrs Schneider needs a ride to the doctor on Friday"',
    quick: [
      ['🛒', 'Shopping', 'Shopping: bread, milk and medicine from the pharmacy'],
      ['🚗', 'Ride to doctor', 'Ride to the doctor on Friday at 10'],
      ['🧹', 'Household', 'Household help: change a light bulb and take out the bins'],
      ['✉️', 'Letters', 'Help with a letter from the health insurance'],
      ['☕', 'Company', 'Company: a coffee and a chat'],
    ],
    understood: 'Detected as:',
    medicalNote: ' — goes to the nurse/doctor, not to volunteers.',
    emTitle: '⚠️ Is this an emergency?',
    emBody: 'The text contains a warning word. The app does not decide this — please ask the person.',
    emYes: 'Yes, emergency',
    emNo: 'No, not an emergency — continue',
    emYesBody: 'Tell the caller: hang up now and dial 112 — or press their alarm button. If you are with them in person: call 112 yourself. The app never calls 112 on its own.',
    weekly: '🔁 Repeat every week',
    consent: '{name} agreed to this request (asked on the phone / in person)',
    consentNeeded: 'Please confirm consent first.',
    submit: 'Log request for {name}',
    ok: '✅ Request logged for {name} ({via}). Nearby volunteers are being notified.',
    okMedical: '✅ Medical question from {name} routed to the nurse/doctor queue.',
    checkIn: '✅ Mark {name} as OK today (seen in person / spoke on the phone)',
    checkedIn: '✅ {name} is marked as OK today ({via}).',
    loggedBy: 'Logged by {by}',
  },
}

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
const PROXY_CHANNELS = ['landline', 'in-person', 'family', 'volunteer', 'coordinator']

const deviceIcons = (r) =>
  [r.devices?.smartphone && '📱', r.devices?.landline && '☎️', r.devices?.alarmButton && '🔴'].filter(Boolean).join(' ')

/** "☎️ via landline · logged by Sabine (coordinator)". Renders nothing for requests the resident made in the app. */
export function ViaBadge({ q, className = '' }) {
  const { lang } = useLang()
  if (!q?.via || q.via === 'app') return null
  const c = CHANNELS[q.via]
  const label = c ? `${c.icon} ${lang === 'de' ? 'über' : 'via'} ${c[lang] ?? c.en}` : q.via
  const by = q.by ? ` · ${lang === 'de' ? 'erfasst von' : 'logged by'} ${q.by}` : ''
  return <span className={`rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-800 ${className}`}>{label}{by}</span>
}

export default function OnBehalfForm({ by, via: defaultVia = 'landline', residentId: fixedId, onDone }) {
  const state = useStore()
  const { lang } = useLang()
  const d = L[lang] ?? L.en
  const [rid, setRid] = useState(fixedId ?? state.residents[0]?.id)
  const [via, setVia] = useState(defaultVia)
  const [text, setText] = useState('')
  const [notEmergency, setNotEmergency] = useState(false) // the person's own answer, never inferred
  const [emYes, setEmYes] = useState(false)
  const [recurring, setRecurring] = useState(false)
  const [consent, setConsent] = useState(false)
  const [msg, setMsg] = useState(null)

  const r = state.residents.find((x) => x.id === (fixedId ?? rid))
  const first = r?.name.split(' ')[0] ?? ''
  const type = text.trim() ? classifyRequest(text, { askedAlready: notEmergency }) : null
  const viaLabel = CHANNELS[via]?.[lang] ?? via

  const changeText = (v) => { setText(v); setNotEmergency(false); setEmYes(false); setMsg(null) }

  const submit = () => {
    if (!consent || !type || type === 'emergency') return
    actions.createRequest(r.id, text.trim(), type, { recurring: type !== 'medical' && recurring, via, by })
    setMsg(fill(type === 'medical' ? d.okMedical : d.ok, { name: first, via: viaLabel }))
    setText(''); setConsent(false); setRecurring(false); setNotEmergency(false); setEmYes(false)
    onDone?.()
  }

  const markOk = () => {
    actions.checkIn(r.id, via)
    setMsg(fill(d.checkedIn, { name: first, via: viaLabel }))
  }

  if (!r) return null

  return (
    <div className="space-y-3 text-sm">
      {!fixedId && (
        <div>
          <p className="mb-1 text-xs font-semibold text-slate-500">{d.who}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {state.residents.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => { setRid(x.id); setMsg(null); setConsent(false) }}
                className={`rounded-lg px-2 py-1.5 text-left ${x.id === r.id ? 'bg-teal-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
              >
                <span className="font-medium">{x.name}</span> ({x.age})
                <span className="block text-xs opacity-80">{deviceIcons(x)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-500">{d.channel}</span>
        <select value={via} onChange={(e) => setVia(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5">
          {PROXY_CHANNELS.map((c) => <option key={c} value={c}>{CHANNELS[c].icon} {CHANNELS[c][lang] ?? CHANNELS[c].en}</option>)}
        </select>
      </label>

      <div>
        <span className="mb-1 block text-xs font-semibold text-slate-500">{d.what}</span>
        <textarea
          value={text}
          onChange={(e) => changeText(e.target.value)}
          rows={2}
          placeholder={d.placeholder}
          className="w-full rounded-lg border border-slate-200 p-2 focus:border-teal-500 focus:outline-none"
        />
        <div className="mt-1 flex flex-wrap gap-1.5">
          {d.quick.map(([icon, label, phrase]) => (
            <button key={label} type="button" onClick={() => changeText(phrase)} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs hover:bg-slate-200">
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {type === 'emergency' && (
        <div className="space-y-2 rounded-xl bg-red-50 p-3 text-red-900">
          <p className="font-bold">{d.emTitle}</p>
          <p className="text-xs">{d.emBody}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEmYes(true)} className="flex-1 rounded-lg bg-red-600 py-1.5 font-semibold text-white">{d.emYes}</button>
            <button type="button" onClick={() => setNotEmergency(true)} className="flex-1 rounded-lg bg-white py-1.5 text-slate-700 ring-1 ring-slate-300">{d.emNo}</button>
          </div>
          {emYes && <p className="rounded-lg bg-red-600 p-2 font-semibold text-white">📞 112 — {d.emYesBody}</p>}
        </div>
      )}

      {type && type !== 'emergency' && (
        <>
          <p className="rounded-lg bg-teal-50 p-2 text-teal-900">
            {d.understood} <b>{TYPE_LABEL_I18N[lang]?.[type] ?? type}</b>{type === 'medical' && d.medicalNote}
          </p>
          {type !== 'medical' && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4" />
              {d.weekly}
            </label>
          )}
          <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-amber-900">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4" required />
            <span>{fill(d.consent, { name: first })}</span>
          </label>
          <button
            type="button"
            disabled={!consent}
            onClick={submit}
            className="w-full rounded-lg bg-teal-600 py-2 font-semibold text-white disabled:opacity-40"
          >
            {fill(d.submit, { name: first })}
          </button>
          {!consent && <p className="text-xs text-slate-400">{d.consentNeeded}</p>}
          {by && <p className="text-xs text-slate-400">{fill(d.loggedBy, { by })} · {CHANNELS[via]?.icon} {viaLabel}</p>}
        </>
      )}

      <button type="button" onClick={markOk} className="w-full rounded-lg bg-white py-1.5 text-left text-xs text-green-800 ring-1 ring-green-300 hover:bg-green-50 px-2">
        {fill(d.checkIn, { name: first })}
      </button>

      {msg && <p className="rounded-lg bg-green-100 p-2 font-medium text-green-900">{msg}</p>}
    </div>
  )
}
