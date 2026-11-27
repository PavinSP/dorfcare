import { useState } from 'react'
import CommunityMap from '../components/CommunityMap'
import { Card } from '../components/ui'
import { CARE_ROUTING, MUNICIPALITIES, NURSE_TASKS } from '../data/seed'
import { useLang } from '../i18n'
import { formatDistance, haversineKm } from '../lib/matching'
import { actions, useStore } from '../store'

// Professional side: nurses from EXISTING care services. No points, no volunteer notifications.
const T = {
  de: {
    signedIn: 'Angemeldet als',
    area: 'Einsatzgebiet',
    hours: 'Arbeitszeit',
    workload: 'Auslastung heute',
    visits: 'Besuche',
    accepting: 'Nimmt neue Besuche an',
    notAccepting: 'Nimmt keine neuen Besuche an',
    registered: 'Über Ihren Pflegedienst registriert, nicht als Ehrenamt · Abrechnung über Kranken-/Pflegekasse',
    newReq: '📥 Neue Anfragen',
    noReq: 'Keine neuen Anfragen. Sie bekommen nur Anfragen in Ihrem Einsatzgebiet, solange Sie Kapazität haben.',
    pausedReq: 'Sie nehmen gerade keine neuen Besuche an.',
    from: 'Angefragt von',
    away: 'entfernt',
    accept: 'Annehmen',
    decline: 'Keine Kapazität',
    route: '🧭 Heutige Tour',
    noRoute: 'Noch keine Besuche geplant.',
    directions: '🧭 Route',
    startCall: '📹 Videosprechstunde starten',
    markDone: '✔ Erledigt',
    shortNote: 'Kurze Notiz (optional)',
    withDoctor: 'mit Arzt per Video',
    inCall: 'Videosprechstunde läuft',
    map: '🗺️ Pflegedienste im Netzwerk',
    who: '🧩 Wer macht was',
    whoSub: 'Ehrenamtliche machen nie medizinische Aufgaben. Die App stellt keine Diagnosen — das entscheidet der Arzt.',
    done: 'Heute erledigt',
    privacy: '🔒 Pflegevertrag: Name und Adresse sichtbar, medizinische Details nur kurz.',
  },
  en: {
    signedIn: 'Signed in as',
    area: 'Service area',
    hours: 'Working hours',
    workload: "Today's workload",
    visits: 'visits',
    accepting: 'Accepting new visits',
    notAccepting: 'Not accepting new visits',
    registered: 'Registered through your care service, not as a volunteer · paid via care/health insurance',
    newReq: '📥 New requests',
    noReq: "No new requests. You only get requests inside your service area while you have capacity.",
    pausedReq: "You're not accepting new visits right now.",
    from: 'Requested by',
    away: 'away',
    accept: 'Accept',
    decline: 'No capacity',
    route: "🧭 Today's route",
    noRoute: 'No visits scheduled yet.',
    directions: '🧭 Directions',
    startCall: '📹 Start tele-consult',
    markDone: '✔ Mark done',
    shortNote: 'Short note (optional)',
    withDoctor: 'with doctor by video',
    inCall: 'Tele-consult live',
    map: '🗺️ Care services in the network',
    who: '🧩 Who does what',
    whoSub: 'Volunteers never do medical tasks. The app never diagnoses — the doctor decides.',
    done: 'Done today',
    privacy: '🔒 Care contract: name and address visible, medical detail kept short.',
  },
}

const SOURCE = {
  de: { doctor: '🩺 Arzt', coordinator: '🧭 Koordination', family: '👪 Familie', resident: '👵 Bewohnerin', hausnotruf: '🔴 Hausnotruf' },
  en: { doctor: '🩺 Doctor', coordinator: '🧭 Coordinator', family: '👪 Family', resident: '👵 Resident', hausnotruf: '🔴 Alarm service' },
}

const WHO = {
  volunteer: { icon: '🙋', de: 'Ehrenamt', en: 'Volunteer', cls: 'bg-green-50 text-green-800' },
  nurse: { icon: '👩‍⚕️', de: 'Pflegekraft', en: 'Nurse', cls: 'bg-violet-50 text-violet-800' },
  'nurse+doctor': { icon: '👩‍⚕️+🩺', de: 'Pflege + Arzt', en: 'Nurse + doctor', cls: 'bg-indigo-50 text-indigo-800' },
  doctor: { icon: '🩺', de: 'Arzt', en: 'Doctor', cls: 'bg-blue-50 text-blue-800' },
  112: { icon: '🚑', de: 'Notruf 112', en: 'Call 112', cls: 'bg-red-50 text-red-800' },
}

const byTime = (a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99')

export default function Nurse() {
  const state = useStore()
  const { lang } = useLang()
  const t = T[lang] ?? T.en
  const [meId, setMeId] = useState('lena')
  const me = state.nurses.find((n) => n.id === meId) ?? state.nurses[0]
  const resident = (id) => state.residents.find((r) => r.id === id)
  const offered = state.nurseVisits.filter((v) => v.status === 'offered' && v.nurseId === me.id)
  const route = state.nurseVisits.filter((v) => (v.status === 'scheduled' || v.status === 'in-call') && v.nurseId === me.id).sort(byTime)
  const done = state.nurseVisits.filter((v) => v.status === 'done' && v.nurseId === me.id)
  const pct = Math.min(100, Math.round((me.booked / me.capacity) * 100))

  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <Card>
          <p className="text-xs text-slate-500">{t.signedIn}</p>
          <select aria-label={t.signedIn} value={me.id} onChange={(e) => setMeId(e.target.value)} className="-ml-1 bg-transparent text-xl font-bold">
            {state.nurses.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          <p className="text-sm text-slate-600">{me.qualification} · <b>{me.service}</b></p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <Info k="📍" v={MUNICIPALITIES[me.municipality]?.name ?? '—'} />
            <Info k={t.area} v={`${me.serviceAreaKm} km`} />
            <Info k={t.hours} v={me.hours} />
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500">
              <span>{t.workload}</span>
              <span><b className="text-slate-800">{me.booked}/{me.capacity}</b> {t.visits}</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-violet-600'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <button
            role="switch"
            aria-checked={me.accepting}
            onClick={() => actions.setNurseAccepting(me.id, !me.accepting)}
            className={`mt-3 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium ${me.accepting ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            <span>{me.accepting ? t.accepting : t.notAccepting}</span>
            <span className={`flex h-5 w-9 items-center rounded-full p-0.5 ${me.accepting ? 'justify-end bg-white/40' : 'justify-start bg-slate-300'}`}>
              <span className="h-4 w-4 rounded-full bg-white shadow" />
            </span>
          </button>
          <p className="mt-2 rounded-lg bg-violet-50 px-2 py-1.5 text-xs text-violet-900">💼 {t.registered}</p>
        </Card>

        <Card>
          <h3 className="font-semibold">{t.newReq}</h3>
          {offered.length === 0 && <p className="mt-2 text-sm text-slate-500">{me.accepting ? t.noReq : t.pausedReq}</p>}
          <div className="mt-3 space-y-3">
            {offered.map((v) => {
              const r = resident(v.residentId)
              return (
                <div key={v.id} className="rounded-xl border-2 border-violet-200 bg-violet-50 p-3 text-sm">
                  <p className="font-semibold">{NURSE_TASKS[v.task]?.[lang] ?? v.task}</p>
                  <p className="mt-0.5"><b>{r.name}</b>, {r.age} · {MUNICIPALITIES[r.municipality]?.name} · {formatDistance(v.km ?? haversineKm(me, r))} {t.away}</p>
                  {v.text && <p className="mt-1 text-slate-700">“{v.text}”</p>}
                  <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded bg-white px-1.5 py-0.5 text-slate-600 ring-1 ring-slate-200">{t.from}: {SOURCE[lang]?.[v.source] ?? v.source}{v.by ? ` (${v.by})` : ''}</span>
                    {v.withDoctor && <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-800">👩‍⚕️+🩺 {t.withDoctor}</span>}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => actions.nurseRespond(v.id, true)} className="flex-1 rounded-lg bg-violet-600 py-2 font-semibold text-white">{t.accept}</button>
                    <button onClick={() => actions.nurseRespond(v.id, false)} className="flex-1 rounded-lg bg-white py-2 text-slate-600 ring-1 ring-slate-300">{t.decline}</button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold">{t.route}</h3>
          {route.length === 0 && <p className="mt-2 text-sm text-slate-500">{t.noRoute}</p>}
          <div className="mt-3 space-y-3">
            {route.map((v) => <RouteStop key={v.id} v={v} r={resident(v.residentId)} state={state} lang={lang} t={t} />)}
          </div>
          <p className="mt-3 text-[11px] text-slate-400">{t.privacy}</p>
        </Card>

        {done.length > 0 && (
          <Card>
            <h3 className="font-semibold">✅ {t.done}</h3>
            {done.map((v) => (
              <p key={v.id} className="mt-1 text-sm text-slate-600">
                ✔ {resident(v.residentId)?.name} · {NURSE_TASKS[v.task]?.[lang] ?? v.task}{v.note ? ` — ${v.note}` : ''}
              </p>
            ))}
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="mb-2 font-semibold">{t.map}</h3>
          <CommunityMap state={state} mode="community" height={560} />
        </div>
        <WhoDoesWhat lang={lang} t={t} />
      </div>
    </div>
  )
}

function RouteStop({ v, r, state, lang, t }) {
  const [note, setNote] = useState('')
  const tele = v.withDoctor || v.task === 'telemed'
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`
  return (
    <div className={`rounded-xl border p-3 text-sm ${v.status === 'in-call' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-semibold">🕘 {v.time ?? '—'} · {r.name}</p>
        {v.status === 'in-call' && <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">● {t.inCall}</span>}
      </div>
      <p className="text-slate-600">{NURSE_TASKS[v.task]?.[lang] ?? v.task}{tele ? ` · ${t.withDoctor}` : ''}</p>
      {v.text && <p className="text-xs text-slate-500">“{v.text}”</p>}
      <p className="mt-1">🏠 {r.address}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={directions} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-900 px-3 py-1.5 text-white">{t.directions}</a>
        {tele && v.status === 'scheduled' && (
          <button onClick={() => actions.startTeleconsult(v.id)} className="rounded-lg bg-indigo-600 px-3 py-1.5 font-semibold text-white">{t.startCall}</button>
        )}
      </div>
      {tele && v.status === 'in-call' && <TeleconsultPanel visit={v} state={state} viewer="nurse" />}
      {!tele && (
        <div className="mt-2 flex gap-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.shortNote} className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-sm ring-1 ring-slate-300" />
          <button onClick={() => actions.completeNurseVisit(v.id, note.trim())} className="rounded-lg bg-teal-600 px-3 py-1.5 font-semibold text-white">{t.markDone}</button>
        </div>
      )}
    </div>
  )
}

const TC = {
  de: { onSite: 'vor Ort', remote: 'per Video', note: 'Notiz des Arztes', placeholder: 'z. B. Blutdruck 165/95 gemessen, Ramipril angepasst, Kontrolle in 3 Tagen', end: '⏹ Beenden & dokumentieren', sim: 'Simulation · keine echte Videoverbindung', join: 'Sie sind zugeschaltet' },
  en: { onSite: 'on site', remote: 'by video', note: "Doctor's note", placeholder: 'e.g. BP measured 165/95, Ramipril adjusted, re-check in 3 days', end: '⏹ End & document', sim: 'Simulation · no real video connection', join: "You're in the call" },
}

/** Simulated assisted tele-consult: nurse at the resident's home + remote doctor. Used on the Nurse and Doctor screens. */
export function TeleconsultPanel({ visit, state, viewer = 'nurse' }) {
  const { lang } = useLang()
  const t = TC[lang] ?? TC.en
  const [note, setNote] = useState('')
  const nurse = state.nurses.find((n) => n.id === visit.nurseId)
  const r = state.residents.find((x) => x.id === visit.residentId)
  // The remote doctor: today's rotation doctor if today is a video day, otherwise the tele-medicine doctor.
  const today = state.rotation.find((d) => d.day === new Date().toLocaleDateString('en-US', { weekday: 'long' }))
  const doctor = today && today.place === null && today.who.startsWith('Dr.') ? today.who : 'Dr. Yilmaz (remote)'
  return (
    <div className="mt-3 rounded-xl bg-slate-900 p-3 text-white">
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-lg bg-slate-700 p-3 text-center ${viewer === 'nurse' ? 'ring-2 ring-violet-400' : ''}`}>
          <p className="text-3xl">👩‍⚕️👵</p>
          <p className="mt-1 text-xs font-semibold">{nurse?.name ?? '—'}</p>
          <p className="text-[10px] opacity-70">{t.onSite} · {r?.name}</p>
        </div>
        <div className={`rounded-lg bg-slate-700 p-3 text-center ${viewer === 'doctor' ? 'ring-2 ring-blue-400' : ''}`}>
          <p className="text-3xl">🩺</p>
          <p className="mt-1 text-xs font-semibold">{doctor}</p>
          <p className="text-[10px] opacity-70">{t.remote}{viewer === 'doctor' ? ` · ${t.join}` : ''}</p>
        </div>
      </div>
      <label className="mt-3 block text-xs opacity-80">{t.note}</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={t.placeholder}
        className="mt-1 w-full rounded-lg bg-white p-2 text-sm text-slate-900"
      />
      <button onClick={() => actions.completeNurseVisit(visit.id, note.trim())} className="mt-2 w-full rounded-lg bg-red-600 py-2 text-sm font-semibold">{t.end}</button>
      <p className="mt-1 text-center text-[10px] opacity-50">{t.sim}</p>
    </div>
  )
}

function WhoDoesWhat({ lang, t }) {
  return (
    <Card>
      <h3 className="font-semibold">{t.who}</h3>
      <table className="mt-2 w-full text-sm">
        <tbody>
          {CARE_ROUTING.map((row) => {
            const w = WHO[row.who]
            return (
              <tr key={row.task} className="border-t border-slate-100">
                <td className="py-1.5 pr-2">{lang === 'de' ? row.taskDe : row.task}</td>
                <td className="py-1.5 text-right">
                  <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${w?.cls ?? ''}`}>{w ? `${w.icon} ${w[lang] ?? w.en}` : row.who}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500">{t.whoSub}</p>
    </Card>
  )
}

const Info = ({ k, v }) => (
  <div className="rounded-xl bg-slate-50 px-1 py-2">
    <p className="font-semibold text-slate-800">{v}</p>
    <p className="text-[10px] text-slate-500">{k}</p>
  </div>
)
