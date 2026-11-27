import { useState } from 'react'
import { Card } from '../components/ui'
import { CHANNELS } from '../data/seed'
import { useLang } from '../i18n'
import { formatDistance, haversineKm } from '../lib/matching'
import { speak } from '../lib/speech'
import { actions, useStore } from '../store'

// Hausnotruf channel: DorfConnect partners with a regional home-emergency provider.
// The provider's HUMAN operator decides everything; DorfConnect adds check-in sharing, keyholders and the family loop.

const PROVIDER = 'NotrufPartner Mainfranken (Demo)'
const GENDER = { helmut: 'm', gertrud: 'f' }

const D = {
  de: {
    homeTitle: '🏠 Zuhause — Hausnotruf-Gerät',
    homeSub: 'Basisstation mit Lautsprecher + Funk-Armband. Kein Smartphone nötig.',
    pick: 'Bewohner:in',
    base: 'Basisstation',
    connected: 'Verbunden mit {p}',
    wrist: 'Funk-Armband',
    sos: 'SOS',
    sosHint: 'Drücken = Alarm an die Notrufzentrale',
    daily: '✓ Tagestaste — Mir geht es gut',
    dailyOk: '✓ Heutiges OK empfangen {time}',
    noPress: 'Simulieren: keine Tagestaste bis 10:00',
    lastCheckIn: 'Letzter Check-in',
    via: 'über',
    ciOk: '✅ heute, geht gut', ciHelp: '🙋 hat um Hilfe gebeten', ciNone: '⚠ heute noch keine Meldung',
    activeAlarm: '🔴 Alarm läuft — die Zentrale ist informiert',
    centreTitle: '🎧 Partner-Notrufzentrale',
    centreSub: 'Operator-Ansicht · ein Mensch entscheidet, nicht die App',
    queue: 'Alarm-Warteschlange',
    noAlarms: 'Keine Alarme. Drücken Sie links SOS.',
    kind: { sos: '🔴 SOS-Knopf', 'no-daily-press': '⏰ Keine Tagestaste' },
    status: { incoming: 'Eingehend', talking: 'Im Gespräch', 'called-112': '112 alarmiert', 'keyholder-sent': 'Schlüsselhelfer unterwegs', 'family-informed': 'Familie informiert', resolved: 'Abgeschlossen' },
    age: 'Jahre',
    address: 'Adresse', medical: 'Medizinisch', medShared: 'geteilt im Rahmen des Hausnotruf-Vertrags',
    keyholder: 'Schlüsselhelfer (DorfConnect)', keyVerified: '✔ verifiziert', away: 'entfernt',
    family: 'Familie / Kontakt',
    actions: 'Operator-Aktionen',
    aSpeak: '1 · 🔊 Über Basisstation sprechen',
    a112: '2 · 🚑 112 anrufen (Operator entscheidet)',
    aFamily: '3 · 👪 Familie informieren',
    aClose: '4 · ✓ Alarm schließen',
    aKey: '🔑 Schlüsselhelfer schicken',
    answers: 'Antwort der Person (simuliert):',
    ansFine: '🙂 „Alles gut, aus Versehen gedrückt“',
    ansFell: '🧎 „Ich bin gestürzt, komme nicht hoch, nicht verletzt“',
    ansNone: '🔇 Keine Antwort / klingt ernst',
    confirmTitle: 'Operator-Entscheidung: 112 jetzt anrufen?',
    confirmBody: 'Übergabe an die Leitstelle: {name}, {address}. Medizinisch: {medical}.',
    confirmYes: '🚑 Ja, 112 jetzt anrufen',
    cancel: 'Abbrechen',
    simulation: 'Simulation — es wird kein echter Anruf getätigt',
    timeline: 'Verlauf',
    closed: 'Alarm abgeschlossen. Ergebnis an DorfConnect zurückgemeldet.',
    legal112: '§4 NotrufV: kein automatischer 112-Anruf. Der Mensch in der Zentrale entscheidet.',
    line: '{sal}, hier ist der Hausnotruf. Hören Sie mich? Brauchen Sie Hilfe?',
    salM: 'Herr', salF: 'Frau',
    // step texts (go into the alarm timeline + activity log)
    sSpeak: 'Operator spricht über die Basisstation',
    sFine: 'Antwort: aus Versehen gedrückt, alles gut — Alarm geschlossen',
    sFell: '{kh} (Schlüsselhelfer, {dist}) ist mit dem Schlüssel unterwegs',
    sNone: 'Keine Antwort / klingt ernst — Operator prüft 112',
    s112: 'Operator hat 112 angerufen (Simulation, kein echter Anruf) — Adresse und Vorerkrankungen übergeben',
    sKey: '{kh} (Schlüsselhelfer, {dist}) öffnet die Tür für den Rettungsdienst',
    sFamily: '{who} von DorfConnect informiert',
    sClose: 'Alarm vom Operator geschlossen — Ergebnis an DorfConnect zurückgemeldet',
    sInit: { 'Wrist button pressed': 'Armbandknopf gedrückt', 'Daily OK button not pressed by 10:00': 'Tagestaste bis 10:00 nicht gedrückt' },
    howTitle: 'So funktioniert die Partnerschaft',
    payT: '💶 Wer zahlt?',
    payB: 'Mit Pflegegrad zahlt die Pflegekasse 27 €/Monat für den Basis-Hausnotruf bei Vertragsanbietern (seit 1. Apr. 2026). Ohne Pflegegrad privat ca. 27–40 €/Monat.',
    addT: '🤝 Was DorfConnect beisteuert',
    addB: 'Teilt den täglichen Check-in-Status, stellt geprüfte Schlüsselhelfer in der Nähe, informiert die Familie und bekommt das Ergebnis zurück. Keine eigene Notrufzentrale.',
    lawT: '⚖️ Die Regel',
    lawB: '§4 NotrufV: Ein automatischer Anruf bei 112 ist verboten. Ein Mensch in der Partnerzentrale entscheidet und startet den Notruf. Die App beurteilt nie die Gesundheit.',
  },
  en: {
    homeTitle: '🏠 At home — alarm device',
    homeSub: 'Base station with loudspeaker + wireless wrist button. No smartphone needed.',
    pick: 'Resident',
    base: 'Base station',
    connected: 'Connected to {p}',
    wrist: 'Wrist button',
    sos: 'SOS',
    sosHint: 'Press = alarm to the call centre',
    daily: "✓ Daily OK — I'm fine",
    dailyOk: "✓ Today's OK received {time}",
    noPress: 'Simulate: no daily press by 10:00',
    lastCheckIn: 'Last check-in',
    via: 'via',
    ciOk: '✅ today, doing well', ciHelp: '🙋 asked for help', ciNone: '⚠ no check-in yet today',
    activeAlarm: '🔴 Alarm active — the call centre has been notified',
    centreTitle: '🎧 Partner call centre',
    centreSub: 'Operator view · a human decides, not the app',
    queue: 'Alarm queue',
    noAlarms: 'No alarms. Press SOS on the left.',
    kind: { sos: '🔴 SOS button', 'no-daily-press': '⏰ No daily OK' },
    status: { incoming: 'Incoming', talking: 'Talking', 'called-112': '112 called', 'keyholder-sent': 'Keyholder on the way', 'family-informed': 'Family informed', resolved: 'Closed' },
    age: 'years',
    address: 'Address', medical: 'Medical', medShared: 'shared under the Hausnotruf contract',
    keyholder: 'Keyholder (DorfConnect)', keyVerified: '✔ verified', away: 'away',
    family: 'Family / contact',
    actions: 'Operator actions',
    aSpeak: '1 · 🔊 Speak via base station',
    a112: '2 · 🚑 Call 112 (operator decides)',
    aFamily: '3 · 👪 Inform family',
    aClose: '4 · ✓ Close alarm',
    aKey: '🔑 Send keyholder',
    answers: 'Resident answers (simulated):',
    ansFine: '🙂 "I\'m fine, pressed by mistake"',
    ansFell: '🧎 "I fell, can\'t get up, not hurt"',
    ansNone: '🔇 No answer / sounds serious',
    confirmTitle: 'Operator decision: call 112 now?',
    confirmBody: 'Handover to dispatch: {name}, {address}. Medical: {medical}.',
    confirmYes: '🚑 Yes, call 112 now',
    cancel: 'Cancel',
    simulation: 'Simulation — no real call',
    timeline: 'Timeline',
    closed: 'Alarm closed. Outcome reported back to DorfConnect.',
    legal112: '§4 NotrufV: no automatic 112 call. The human operator decides.',
    line: '{sal}, this is your home emergency service. Can you hear me? Do you need help?',
    salM: 'Mr', salF: 'Mrs',
    sSpeak: 'Operator speaking via base station',
    sFine: 'Answer: pressed by mistake, all fine — alarm closed',
    sFell: '{kh} (keyholder, {dist}) is on the way with the key',
    sNone: 'No answer / sounds serious — operator considering 112',
    s112: 'Operator called 112 (simulation, no real call) — address and medical info handed over',
    sKey: '{kh} (keyholder, {dist}) opens the door for paramedics',
    sFamily: '{who} informed by DorfConnect',
    sClose: 'Alarm closed by operator — outcome reported back to DorfConnect',
    sInit: {},
    howTitle: 'How the partnership works',
    payT: '💶 Who pays?',
    payB: 'With a care grade, the care insurance (Pflegekasse) pays €27/month for the basic Hausnotruf with contracted providers (since 1 Apr 2026). Otherwise about €27–40/month privately.',
    addT: '🤝 What DorfConnect adds',
    addB: 'Shares the daily check-in status, provides vetted keyholder volunteers nearby, informs family and gets the alarm outcome back. No emergency centre of its own.',
    lawT: '⚖️ The rule',
    lawB: '§4 NotrufV: an automatic call to 112 is forbidden. A human operator in the partner call centre decides and starts the call. The app never judges health.',
  },
}

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')

const STATUS_STYLE = {
  incoming: 'bg-red-600 text-white',
  talking: 'bg-amber-100 text-amber-900',
  'called-112': 'bg-red-100 text-red-800',
  'keyholder-sent': 'bg-blue-100 text-blue-800',
  'family-informed': 'bg-violet-100 text-violet-800',
  resolved: 'bg-green-100 text-green-800',
}

export default function Hausnotruf() {
  const state = useStore()
  const { lang, speechLang } = useLang()
  const L = D[lang] ?? D.en
  const locale = lang === 'de' ? 'de-DE' : 'en-GB'
  const time = (t, sec = false) => new Date(t).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', ...(sec ? { second: '2-digit' } : {}) })

  const withButton = state.residents.filter((r) => r.devices?.alarmButton)
  const [resId, setResId] = useState(withButton[0]?.id)
  const r = withButton.find((x) => x.id === resId) ?? withButton[0]
  const alarms = [...(state.alarms ?? [])].sort((a, b) => b.t - a.t)
  const [selId, setSelId] = useState(null)
  const sel = alarms.find((a) => a.id === selId) ?? alarms[0]
  // local operator UI phase per alarm: 'answers' (after speaking) | 'confirm112'
  const [phase, setPhase] = useState({})
  const ph = sel ? phase[sel.id] : null
  const setPh = (p) => setPhase((x) => ({ ...x, [sel.id]: p }))

  const raise = (kind) => {
    const id = actions.hausnotrufAlarm(r.id, kind)
    setSelId(id)
  }
  const okEntry = r && state.log.find((l) => l.text.startsWith(`✅ ${r.name} checked in (button)`))
  const myActive = r && alarms.find((a) => a.residentId === r.id && a.status !== 'resolved')

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ---------- LEFT: device at home ---------- */}
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">{L.homeTitle}</h2>
            <p className="text-xs text-slate-500">{L.homeSub}</p>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-sm">
            <span className="text-slate-500">{L.pick}:</span>
            {withButton.map((x) => (
              <button
                key={x.id}
                onClick={() => setResId(x.id)}
                className={`rounded-full px-3 py-1 ${x.id === r?.id ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
              >
                {x.name.split(' ')[0]}, {x.age}
              </button>
            ))}
          </div>

          {r && (
            <>
              {/* base station */}
              <div className="rounded-3xl bg-gradient-to-b from-slate-100 to-slate-300 p-4 shadow-inner ring-1 ring-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{L.base}</span>
                  <span className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className={`h-2.5 w-2.5 rounded-full ${myActive ? 'animate-pulse bg-red-500' : 'bg-green-500'}`} />
                    {fill(L.connected, { p: PROVIDER })}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-4">
                  <div className="grid grid-cols-5 gap-1 rounded-xl bg-slate-700 p-2">
                    {Array.from({ length: 15 }, (_, i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-slate-400" />)}
                  </div>
                  <button
                    onClick={() => actions.checkIn(r.id, 'button')}
                    className="rounded-2xl bg-green-600 px-3 py-4 text-lg font-bold text-white shadow-md active:translate-y-0.5"
                  >
                    {L.daily}
                  </button>
                </div>
                {okEntry && r.lastCheckIn === 'today-ok' && (
                  <p className="mt-2 rounded-lg bg-green-50 px-3 py-1.5 text-sm font-semibold text-green-800">{fill(L.dailyOk, { time: time(okEntry.t) })}</p>
                )}
              </div>

              {/* wrist button */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{L.wrist}</span>
                <div className="relative flex items-center">
                  <div className="absolute left-1/2 h-10 w-72 -translate-x-1/2 rounded-full bg-slate-700" />
                  <button
                    onClick={() => raise('sos')}
                    aria-label="SOS"
                    className="relative flex h-36 w-36 items-center justify-center rounded-full border-8 border-slate-800 bg-red-600 text-3xl font-black text-white shadow-[0_8px_0_#7f1d1d] transition active:translate-y-1 active:shadow-[0_3px_0_#7f1d1d]"
                  >
                    {L.sos}
                  </button>
                </div>
                <span className="text-xs text-slate-500">{L.sosHint}</span>
              </div>

              <button onClick={() => raise('no-daily-press')} className="w-full rounded-lg px-3 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
                ⏰ {L.noPress}
              </button>

              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                <p>
                  <b>{L.lastCheckIn}:</b>{' '}
                  {r.lastCheckIn === 'today-ok' ? L.ciOk : r.lastCheckIn === 'today-help' ? L.ciHelp : L.ciNone}
                  {r.lastCheckIn && r.lastCheckInVia && (
                    <span className="text-slate-500"> · {L.via} {CHANNELS[r.lastCheckInVia]?.icon} {CHANNELS[r.lastCheckInVia]?.[lang] ?? r.lastCheckInVia}</span>
                  )}
                </p>
                {myActive && <p className="mt-1 font-semibold text-red-700">{L.activeAlarm}</p>}
              </div>
            </>
          )}
        </Card>

        {/* ---------- RIGHT: partner call centre ---------- */}
        <div className="overflow-hidden rounded-2xl bg-slate-900 text-slate-100 shadow-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-700 px-4 py-3">
            <div>
              <h2 className="text-lg font-bold">{L.centreTitle}</h2>
              <p className="text-xs text-slate-400">{PROVIDER} · {L.centreSub}</p>
            </div>
            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] text-amber-300">{L.simulation}</span>
          </div>
          <div className="grid gap-0 md:grid-cols-[200px_1fr]">
            <div className="border-b border-slate-700 p-3 md:border-b-0 md:border-r">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{L.queue}</p>
              {alarms.length === 0 && <p className="text-sm text-slate-500">{L.noAlarms}</p>}
              <div className="space-y-2">
                {alarms.map((a) => {
                  const ar = state.residents.find((x) => x.id === a.residentId)
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelId(a.id)}
                      className={`w-full rounded-lg p-2 text-left text-sm ${a.id === sel?.id ? 'bg-slate-700 ring-2 ring-teal-400' : 'bg-slate-800 hover:bg-slate-700'} ${a.status === 'incoming' ? 'animate-pulse ring-2 ring-red-500' : ''}`}
                    >
                      <p className="font-semibold">{ar?.name}</p>
                      <p className="text-xs text-slate-400">{L.kind[a.kind]} · {time(a.t)}</p>
                      <span className={`mt-1 inline-block rounded px-1.5 text-[11px] ${STATUS_STYLE[a.status]}`}>{L.status[a.status] ?? a.status}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="p-4">
              {sel ? (
                <AlarmDetail key={sel.id} a={sel} state={state} L={L} lang={lang} speechLang={speechLang} ph={ph} setPh={setPh} time={time} />
              ) : (
                <p className="text-sm text-slate-500">{L.noAlarms}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- BOTTOM: partnership ---------- */}
      <div>
        <h3 className="mb-2 font-semibold">{L.howTitle}</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {[[L.payT, L.payB], [L.addT, L.addB], [L.lawT, L.lawB]].map(([t, b]) => (
            <Card key={t}>
              <p className="font-semibold">{t}</p>
              <p className="mt-1 text-sm text-slate-600">{b}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function AlarmDetail({ a, state, L, lang, speechLang, ph, setPh, time }) {
  const r = state.residents.find((x) => x.id === a.residentId)
  const kh = state.volunteers.find((v) => v.id === r?.hausnotruf?.keyHolder)
  const dist = kh ? formatDistance(haversineKm(kh, r)) : ''
  const khName = kh?.name.split(' ')[0]
  const fam = r.family?.[0]
  const famLabel = fam ? `${fam.name} (${lang === 'de' ? fam.relationDe : fam.relation}, ${fam.city})` : r.emergencyContact
  const medical = lang === 'de' ? r.medicalDe : r.medical
  const closed = a.status === 'resolved'

  const update = (status, text) => actions.hausnotrufUpdate(a.id, status, text)
  const onSpeak = () => {
    const sal = `${GENDER[r.id] === 'f' ? L.salF : L.salM} ${r.name.split(' ').slice(-1)[0]}`
    speak(fill(L.line, { sal }), speechLang)
    update('talking', L.sSpeak)
    setPh('answers')
  }

  const btn = 'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold disabled:opacity-40'

  return (
    <div className="space-y-4">
      {/* resident card */}
      <div className="rounded-xl bg-slate-800 p-3 text-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-base font-bold">{r.name}, {r.age} {L.age}</p>
          <span className={`rounded px-1.5 text-[11px] ${STATUS_STYLE[a.status]}`}>{L.status[a.status]}</span>
        </div>
        <p className="mt-1"><span className="text-slate-400">{L.address}:</span> {r.address}</p>
        <p><span className="text-slate-400">{L.medical}:</span> {medical} <span className="text-[11px] text-slate-500">({L.medShared})</span></p>
        {kh && (
          <p><span className="text-slate-400">{L.keyholder}:</span> 🔑 {kh.name} · {dist} {L.away} · {L.keyVerified}</p>
        )}
        <p><span className="text-slate-400">{L.family}:</span> {famLabel}</p>
      </div>

      {/* operator actions */}
      {closed ? (
        <p className="rounded-lg bg-green-900/40 p-3 text-sm text-green-300">✓ {L.closed}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{L.actions}</p>
          <button onClick={onSpeak} className={`${btn} bg-teal-600 text-white hover:bg-teal-500`}>{L.aSpeak}</button>

          {ph === 'answers' && (
            <div className="space-y-1.5 rounded-lg border border-slate-600 p-2">
              <p className="text-xs text-slate-400">{L.answers}</p>
              <button onClick={() => { update('resolved', L.sFine); setPh(null) }} className={`${btn} bg-slate-700 font-normal hover:bg-slate-600`}>{L.ansFine}</button>
              <button onClick={() => { update('keyholder-sent', fill(L.sFell, { kh: khName, dist })); setPh(null) }} disabled={!kh} className={`${btn} bg-slate-700 font-normal hover:bg-slate-600`}>{L.ansFell}</button>
              <button onClick={() => { update('talking', L.sNone); setPh('confirm112') }} className={`${btn} bg-slate-700 font-normal hover:bg-slate-600`}>{L.ansNone}</button>
            </div>
          )}

          {ph === 'confirm112' ? (
            <div className="space-y-2 rounded-lg border-2 border-red-500 bg-red-950/40 p-3 text-sm">
              <p className="font-bold text-red-200">{L.confirmTitle}</p>
              <p className="text-slate-300">{fill(L.confirmBody, { name: r.name, address: r.address, medical })}</p>
              <p className="rounded bg-amber-400/20 px-2 py-1 text-xs font-semibold text-amber-300">⚠ {L.simulation}</p>
              <div className="flex gap-2">
                <button onClick={() => { update('called-112', L.s112); setPh(null) }} className="flex-1 rounded-lg bg-red-600 py-2 font-bold text-white hover:bg-red-500">{L.confirmYes}</button>
                <button onClick={() => setPh(null)} className="rounded-lg px-3 py-2 ring-1 ring-slate-500">{L.cancel}</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setPh('confirm112')} disabled={a.status === 'called-112'} className={`${btn} bg-red-700 text-white hover:bg-red-600`}>{L.a112}</button>
          )}
          <p className="text-[11px] text-slate-500">{L.legal112}</p>

          <div className="grid gap-2 sm:grid-cols-3">
            {kh && (
              <button onClick={() => update('keyholder-sent', fill(L.sKey, { kh: khName, dist }))} disabled={a.status === 'keyholder-sent'} className={`${btn} bg-blue-700 text-white hover:bg-blue-600`}>{L.aKey}</button>
            )}
            <button onClick={() => update('family-informed', fill(L.sFamily, { who: famLabel }))} className={`${btn} bg-violet-700 text-white hover:bg-violet-600`}>{L.aFamily}</button>
            <button onClick={() => { update('resolved', L.sClose); setPh(null) }} className={`${btn} bg-green-700 text-white hover:bg-green-600`}>{L.aClose}</button>
          </div>
        </div>
      )}

      {/* timeline */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{L.timeline}</p>
        <ol className="space-y-1.5 border-l-2 border-slate-600 pl-3 text-sm">
          {a.steps.map((s, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full bg-teal-400" />
              <span className="mr-2 font-mono text-xs text-slate-400">{time(s.t, true)}</span>
              {L.sInit[s.text] ?? s.text}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
