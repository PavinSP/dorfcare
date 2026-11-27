import { useState } from 'react'
import { Card } from '../components/ui'
import { MUNICIPALITIES, NURSE_TASKS, ROOM_CHECKS } from '../data/seed'
import { dayMode } from '../lib/rotation'
import { DAY_I18N, useLang } from '../i18n'
import { actions, useStore } from '../store'
import { TeleconsultPanel } from './Nurse'

const T = {
  de: {
    kSlots: 'Termine diese Woche gebucht',
    kNurses: 'Pflegekräfte nehmen heute an',
    kFree: 'freie Besuche',
    kOpen: 'Offene medizinische Fragen',
    kVisits: 'Pflegebesuche heute geplant',
    rotTitle: 'Der Arzt kommt ins Dorf — Wochenplan',
    rotSub: 'Ärztinnen und Ärzte geben Stunden frei, DorfConnect verteilt sie auf die Gemeindehäuser. Bewohner buchen Termine.',
    video: '📹 Video',
    home: '🏠 Hausbesuche',
    free: 'frei',
    queue: '🩺 Rückruf-Liste',
    queueSub: 'Medizinische Fragen landen hier — nie bei Ehrenamtlichen. Die App stellt keine Diagnose, Sie entscheiden.',
    noQ: 'Keine offenen Fragen.',
    history: 'Vorgeschichte (nur Arzt)',
    videoCall: '📹 Videoanruf',
    sendNurse: '👩‍⚕️ Pflege schicken',
    task: 'Auftrag',
    handled: 'Bearbeitet',
    called: '📹 Zurückgerufen',
    offered: 'angefragt bei {n} · wartet auf Antwort',
    scheduled: '{n} kommt heute um {time}',
    incall: '📹 Videosprechstunde läuft ({n} vor Ort)',
    done: '✅ Erledigt',
    unassigned: '⚠️ Keine Pflegekapazität frei — Koordination informiert',
    tele: '📹 Videosprechstunden',
    teleSub: 'Pflegekraft beim Patienten zu Hause, Sie per Video zugeschaltet.',
    noTele: 'Noch keine. Wählen Sie bei „Pflege schicken“ die assistierte Videosprechstunde.',
    join: 'Beitreten',
    leave: 'Ausblenden',
    dropTitle: '🏠 Sprechstunde der Dorfkümmerin am selben Vormittag',
    dropBody: 'Die Koordinatorin ({c}) bietet eine offene Sprechstunde an, während Sie Patienten sehen — Bewohner können direkt nach dem Termin eine Heimfahrt, Einkauf oder Besuch organisieren.',
    sitesTitle: '🏛️ Gemeindehaus-Sprechstunden: Genehmigung & Raum',
    sitesSub: 'Regelmäßige Sprechstunden in einem anderen Ort brauchen vorher die Genehmigung der KV (Zweigpraxis). Bis dahin läuft der Tag automatisch als Video + Pflege zu Hause — für Patienten entsteht keine Lücke.',
    roomTitle: 'Raum-Checkliste (stellt die Gemeinde)',
    submit: '📨 Bei der KV beantragen',
    submitHint: 'Erst wenn die Raum-Checkliste vollständig ist.',
    approve: '✅ Genehmigung erhalten (Demo)',
    withdraw: 'Zurückziehen',
    running: 'Sprechstunde vor Ort läuft.',
    demoNote: 'Demo-Status · es existiert kein echter Antrag.',
  },
  en: {
    kSlots: 'Slots booked this week',
    kNurses: 'Nurses accepting today',
    kFree: 'free visits',
    kOpen: 'Open medical questions',
    kVisits: 'Nurse visits scheduled today',
    rotTitle: 'The doctor comes to the villages — weekly rotation',
    rotSub: 'Doctors publish the hours they can give. DorfConnect spreads them across the village halls and residents book slots.',
    video: '📹 Video',
    home: '🏠 Home visits',
    free: 'free',
    queue: '🩺 Call-back queue',
    queueSub: 'Medical questions are routed here — never to volunteers. The app never diagnoses; you decide.',
    noQ: 'No open questions.',
    history: 'History (doctor-only)',
    videoCall: '📹 Video call',
    sendNurse: '👩‍⚕️ Send nurse',
    task: 'Task',
    handled: 'Handled',
    called: '📹 Called back',
    offered: 'offered to {n} · waiting for reply',
    scheduled: '{n} visits today at {time}',
    incall: '📹 Tele-consult live ({n} on site)',
    done: '✅ Done',
    unassigned: '⚠️ No nurse capacity — coordinator informed',
    tele: '📹 Tele-consults',
    teleSub: 'Nurse at the patient’s home, you join by video.',
    noTele: 'None yet. Choose the assisted tele-consult under “Send nurse”.',
    join: 'Join',
    leave: 'Hide',
    dropTitle: '🏠 Drop-in hour shares your morning',
    dropBody: 'The coordinator ({c}) runs a help desk while you see patients — residents can arrange a ride home, shopping or a visit right after their appointment.',
    sitesTitle: '🏛️ Village-hall consultations: approval & room',
    sitesSub: 'Regular consultation hours in another village need KV approval first (branch practice). Until then the day automatically runs as video + nurse at home — no gap for patients.',
    roomTitle: 'Room checklist (provided by the municipality)',
    submit: '📨 Apply to the KV',
    submitHint: 'Only once the room checklist is complete.',
    approve: '✅ Approval received (demo)',
    withdraw: 'Withdraw',
    running: 'In-person consultations running.',
    demoNote: 'Demo status · no real application exists.',
  },
}

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')

const STATUS_CLS = {
  offered: 'bg-amber-100 text-amber-900',
  scheduled: 'bg-violet-100 text-violet-900',
  'in-call': 'bg-red-100 text-red-800',
  done: 'bg-green-100 text-green-800',
  unassigned: 'bg-orange-100 text-orange-900',
}

/** Human-readable status of a nurse visit, e.g. "offered to Lena Vogt". */
function visitStatus(v, state, t) {
  if (!v) return ''
  const n = state.nurses.find((x) => x.id === v.nurseId)?.name ?? '—'
  if (v.status === 'offered') return fill(t.offered, { n })
  if (v.status === 'scheduled') return fill(t.scheduled, { n, time: v.time })
  if (v.status === 'in-call') return fill(t.incall, { n })
  if (v.status === 'done') return `${t.done}${v.note ? ` · ${v.note}` : ''}`
  return t.unassigned
}

export default function Doctor() {
  const state = useStore()
  const { lang } = useLang()
  const t = T[lang] ?? T.en
  const name = (id) => state.residents.find((r) => r.id === id)?.name ?? id
  const totalSlots = state.rotation.reduce((n, d) => n + d.slots.length, 0)
  const booked = state.rotation.reduce((n, d) => n + d.slots.filter((s) => s.bookedBy).length, 0)
  const waiting = state.medicalQueue.filter((m) => m.status === 'waiting')
  const handled = state.medicalQueue.filter((m) => m.status !== 'waiting')
  const accepting = state.nurses.filter((n) => n.accepting)
  const freeCap = accepting.reduce((sum, n) => sum + Math.max(0, n.capacity - n.booked), 0)
  const visitsToday = state.nurseVisits.filter((v) => ['scheduled', 'in-call', 'done'].includes(v.status)).length
  const tele = state.nurseVisits.filter((v) => v.withDoctor)

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi n={`${booked}/${totalSlots}`} l={t.kSlots} />
        <Kpi n={`${accepting.length}/${state.nurses.length}`} l={`${t.kNurses} · ${freeCap} ${t.kFree}`} />
        <Kpi n={waiting.length} l={t.kOpen} accent={waiting.length > 0} />
        <Kpi n={visitsToday} l={t.kVisits} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card>
            <h2 className="text-lg font-bold">{t.rotTitle}</h2>
            <p className="text-sm text-slate-500">{t.rotSub}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {state.rotation.map((d) => {
                const m = dayMode(d, lang)
                return (
                  <div key={d.day} className="rounded-xl border border-slate-200 p-3">
                    <p className="font-semibold">{lang === 'de' ? DAY_I18N.de[d.day] ?? d.day : d.day}</p>
                    <p className={`text-sm font-semibold ${m.mode === 'video-fallback' ? 'text-indigo-700' : 'text-teal-700'}`}>{m.label}</p>
                    <p className="text-sm text-blue-700">{d.who}</p>
                    <p className="mb-2 text-xs text-slate-500">{m.note || m.statusLabel}</p>
                    {d.slots.map((s) => (
                      <div key={s.time} className={`mb-1 rounded-md px-2 py-1 text-xs ${s.bookedBy ? 'bg-blue-100 text-blue-900' : 'bg-slate-50 text-slate-400'}`}>
                        {s.time} · {s.bookedBy ? name(s.bookedBy) : t.free}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </Card>

          <SitesCard state={state} t={t} lang={lang} />

          <Card className="border-2 border-indigo-200">
            <h3 className="font-semibold">{t.tele}</h3>
            <p className="text-xs text-slate-500">{t.teleSub}</p>
            {tele.length === 0 && <p className="mt-3 text-sm text-slate-400">{t.noTele}</p>}
            <div className="mt-3 space-y-3">
              {tele.map((v) => <TeleRow key={v.id} v={v} state={state} t={t} lang={lang} />)}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <h3 className="font-semibold">{t.queue}</h3>
            <p className="text-xs text-slate-500">{t.queueSub}</p>
            {waiting.length === 0 && <p className="mt-3 text-sm text-slate-400">{t.noQ}</p>}
            {waiting.map((m) => <QueueItem key={m.id} m={m} state={state} t={t} lang={lang} />)}
            {handled.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold uppercase text-slate-400">{t.handled}</p>
                {handled.map((m) => {
                  const v = state.nurseVisits.find((x) => x.id === m.nurseVisitId)
                  return (
                    <div key={m.id} className="mt-2 text-sm">
                      <p><b>{name(m.residentId)}</b> · <span className="text-slate-500">“{m.text}”</span></p>
                      <p className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs ${m.status === 'answered' ? 'bg-slate-100 text-slate-700' : STATUS_CLS[v?.status] ?? ''}`} data-testid="medical-status">
                        {m.status === 'answered' ? t.called : `👩‍⚕️ ${NURSE_TASKS[v?.task]?.[lang] ?? ''}: ${visitStatus(v, state, t)}`}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {state.dropIn && (
            <Card className="border-2 border-teal-200">
              <h3 className="font-semibold">{t.dropTitle}</h3>
              <p className="mt-1 text-sm text-slate-600">
                <b>{lang === 'de' ? state.dropIn.dayDe ?? state.dropIn.day : state.dropIn.day} {state.dropIn.time}</b> · {state.dropIn.place}.{' '}
                {fill(t.dropBody, { c: state.coordinator?.name })}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

const SITE_CHIP = {
  'not-applied': 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-green-100 text-green-800',
}

/** Village-hall days: room readiness (municipality) → KV application → approval. Until approved: video + nurse fallback. */
function SitesCard({ state, t, lang }) {
  const days = state.rotation.map((d, i) => ({ d, i })).filter(({ d }) => d.site?.route === 'branch')
  return (
    <Card className="border-2 border-amber-200">
      <h3 className="font-semibold">{t.sitesTitle}</h3>
      <p className="text-xs text-slate-500">{t.sitesSub}</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {days.map(({ d, i }) => {
          const m = dayMode(d, lang)
          return (
            <div key={d.day} className="rounded-xl border border-slate-200 p-3 text-sm" data-testid={`site-${d.place}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{MUNICIPALITIES[d.place]?.name} · {lang === 'de' ? DAY_I18N.de[d.day] : d.day}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${SITE_CHIP[d.site.status]}`}>{m.statusLabel}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{m.mode === 'in-person' ? t.running : m.label}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">{t.roomTitle}</p>
              <ul className="mt-1 space-y-1">
                {ROOM_CHECKS.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-start gap-2 text-xs">
                      <input type="checkbox" className="mt-0.5" checked={d.site.checks.includes(c.id)} disabled={d.site.status !== 'not-applied'} onChange={() => actions.toggleRoomCheck(i, c.id)} />
                      <span>{c[lang] ?? c.en}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {d.site.status === 'not-applied' && (
                  <>
                    <button disabled={!m.roomReady} onClick={() => actions.setSiteStatus(i, 'pending')} className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">{t.submit}</button>
                    {!m.roomReady && <p className="w-full text-[11px] text-slate-400">{t.submitHint}</p>}
                  </>
                )}
                {d.site.status === 'pending' && (
                  <>
                    <button onClick={() => actions.setSiteStatus(i, 'approved')} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white">{t.approve}</button>
                    <button onClick={() => actions.setSiteStatus(i, 'not-applied')} className="rounded-lg px-3 py-1.5 text-xs text-slate-600 ring-1 ring-slate-300">{t.withdraw}</button>
                  </>
                )}
                {d.site.status === 'approved' && (
                  <button onClick={() => actions.setSiteStatus(i, 'not-applied')} className="rounded-lg px-3 py-1.5 text-xs text-slate-600 ring-1 ring-slate-300">{t.withdraw}</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">{t.demoNote}</p>
    </Card>
  )
}

function QueueItem({ m, state, t, lang }) {
  const [task, setTask] = useState('assessment')
  const r = state.residents.find((x) => x.id === m.residentId)
  if (!r) return null
  return (
    <div className="mt-3 rounded-xl bg-violet-50 p-3 text-sm">
      <p><b>{r.name}</b>, {r.age} · {MUNICIPALITIES[r.municipality]?.name}</p>
      <p className="text-slate-700">“{m.text}”</p>
      <p className="mt-1 text-xs text-slate-500">{t.history}: {lang === 'de' ? r.medicalDe ?? r.medical : r.medical}</p>
      <label className="mt-2 block text-xs text-slate-500">
        {t.task}
        <select aria-label={t.task} value={task} onChange={(e) => setTask(e.target.value)} className="mt-0.5 w-full rounded-lg bg-white px-2 py-1.5 text-sm text-slate-800 ring-1 ring-violet-200">
          {Object.entries(NURSE_TASKS).map(([k, v]) => <option key={k} value={k}>{v[lang] ?? v.en}</option>)}
        </select>
      </label>
      <div className="mt-2 flex gap-2">
        <button onClick={() => actions.answerMedical(m.id)} className="flex-1 rounded-lg bg-violet-600 py-1.5 text-white">{t.videoCall}</button>
        <button
          onClick={() => actions.requestNurseVisit(m.residentId, { task, text: m.text, source: 'doctor', medicalId: m.id })}
          className="flex-1 rounded-lg bg-white py-1.5 ring-1 ring-violet-300"
        >
          {t.sendNurse}
        </button>
      </div>
    </div>
  )
}

function TeleRow({ v, state, t, lang }) {
  const [joined, setJoined] = useState(false)
  const r = state.residents.find((x) => x.id === v.residentId)
  return (
    <div className={`rounded-xl border p-3 text-sm ${v.status === 'in-call' ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p><b>{r?.name}</b>, {r?.age} · {MUNICIPALITIES[r?.municipality]?.name}</p>
        {v.status === 'in-call' && (
          <button onClick={() => setJoined((j) => !j)} className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white">
            {joined ? t.leave : `📹 ${t.join}`}
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">{NURSE_TASKS[v.task]?.[lang] ?? v.task}{v.text ? ` · “${v.text}”` : ''}</p>
      <p className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs ${STATUS_CLS[v.status] ?? ''}`}>{visitStatus(v, state, t)}</p>
      {joined && v.status === 'in-call' && <TeleconsultPanel visit={v} state={state} viewer="doctor" />}
    </div>
  )
}

const Kpi = ({ n, l, accent }) => (
  <div className={`rounded-2xl p-4 shadow-sm ${accent ? 'bg-violet-600 text-white' : 'bg-white'}`}>
    <p className="text-2xl font-bold">{n}</p>
    <p className={`text-xs ${accent ? 'text-violet-50' : 'text-slate-500'}`}>{l}</p>
  </div>
)
