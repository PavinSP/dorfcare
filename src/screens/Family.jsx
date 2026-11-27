import { useState } from 'react'
import { CHANNELS, MUNICIPALITIES, REGION_NAME } from '../data/seed'
import { DAY_I18N, TYPE_LABEL_I18N, useLang } from '../i18n'
import { classifyRequest } from '../lib/matching'
import { actions, useStore } from '../store'
import { dayMode } from '../lib/rotation'

// Family channel: adult children far away (Peter in München, Erika in Frankfurt) keep an eye on a parent
// who may not own a smartphone. They only see what the parent agreed to share — never medical details.

const L = {
  de: {
    viewAs: 'Ansicht als',
    shares: '🔒 {name} teilt Check-ins und Hilfe-Anfragen mit Ihnen. {name} kann das jederzeit beenden.',
    noConsent: '🔒 {name} hat (noch) nicht zugestimmt, Informationen mit Ihnen zu teilen.',
    hello: 'Hallo {name}',
    sub: '{parent} · {town} · Sie: {city}',
    today: 'Heute',
    ok: '✅ {name} hat sich gemeldet',
    okVia: 'per {channel}',
    at: 'um {time}',
    help: '🙋 {name} hat heute um Hilfe gebeten',
    helpSub: 'Den Stand sehen Sie unten bei den Meldungen.',
    notYet: '⏳ Noch keine Meldung heute',
    notYetSub: 'Clara ruft um 09:30 noch einmal an. Um 10:00 wird die Dorf-Koordinatorin informiert.',
    alerts: 'Meldungen',
    noAlerts: 'Keine Meldungen heute.',
    medPrivacy: '🩺 Medizinische Details werden nur mit Ärzten und Pflegekräften geteilt.',
    missed: 'Noch kein Check-in heute',
    missedSub: 'Clara ruft um 09:30 an · Koordinatorin wird um 10:00 informiert',
    alarm: 'Hausnotruf-Alarm',
    alarmKind: { sos: 'Notrufknopf gedrückt', 'no-daily-press': 'Täglicher OK-Knopf nicht gedrückt' },
    alarmStatus: { incoming: 'Notrufzentrale kümmert sich', talking: 'Im Gespräch mit der Zentrale', 'called-112': '112 alarmiert', 'keyholder-sent': 'Schlüsselträger unterwegs', 'family-informed': 'Familie informiert', resolved: 'Erledigt' },
    req: { open: 'Suche nach Helfer ({n} gefragt)', accepted: 'Angenommen von {name}', completed: 'Erledigt von {name}', escalated: 'Niemand frei — Koordinatorin kümmert sich' },
    reqBy: 'angefragt von {by}',
    weekly: 'wöchentlich',
    medQueued: 'Rückruf von Pflege/Arzt angefragt',
    medDone: 'Pflege/Arzt hat zurückgerufen',
    callOut: '☎️ Check-in-Anruf',
    callIn: '☎️ Anruf bei der Hotline',
    helpers: 'Wer hilft {name}',
    noHelpers: 'Noch keine festen Helfer.',
    visits: '{n} Besuche · seit {since}',
    fav: 'Lieblingshelfer',
    thank: '💌 Danke sagen',
    thanked: 'Dankeschön an {name} gesendet ✓',
    appts: 'Termine',
    noAppts: 'Keine Termine gebucht.',
    book: 'Arzttermin für {name} buchen',
    booked: '📅 Gebucht: {a}',
    arrange: 'Hilfe für {name} organisieren',
    placeholder: 'Was wird gebraucht? z. B. Fahrt zum Arzt am Montag',
    category: 'Kategorie:',
    medNote: ' — geht an Pflege/Arzt, nicht an Ehrenamtliche.',
    emTitle: '❓ Ist das ein Notfall?',
    emBody: 'DorfConnect entscheidet das nicht. Wenn ja: rufen Sie sofort 112 und nennen Sie die Adresse: {address}.',
    call112: '📞 Jetzt 112 anrufen',
    pressAlarm: 'oder: {name} kann den Notrufknopf am Handgelenk drücken.',
    callParent: 'oder: {name} direkt anrufen ({phone}).',
    notEm: 'Nein, kein Notfall',
    agreed: 'Ich habe das mit {name} abgesprochen.',
    repeat: 'Jede Woche wiederholen',
    send: 'Anfrage senden',
    sent: '✅ Gesendet! Helfer in der Nähe wurden gefragt. Hier sehen Sie, wer zusagt.',
    sentMed: '✅ Gesendet! Eine Pflegekraft oder ein Arzt ruft {name} zurück.',
    quick: [
      ['🚗', 'Fahrt zum Arzt', 'Fahrt zum Arzttermin am Montag für {name}.'],
      ['🛒', 'Einkaufen', 'Einkauf für {name}: Milch, Brot und Obst.'],
      ['🏠', 'Haushalt', 'Hilfe im Garten und Müll rausbringen bei {name}.'],
      ['☕', 'Gesellschaft', 'Ein Besuch auf einen Kaffee, {name} ist oft allein.'],
    ],
    premium: '🏠 DorfConnect pro Haushalt',
    premiumPrice: '3,99 € / Monat',
    premiumList: ['Clara, Check-ins, Hilfe von Nachbarn und Fahrten organisieren', 'Sofort-Nachricht an die Familie bei Alarm oder fehlendem Check-in', 'Alle Familienmitglieder inklusive', 'SOS und 112 sind immer kostenlos'],
    hypothesis: 'Oft zahlt die Familie · Pflege läuft wie bisher über die Versicherung',
    interested: 'Interesse melden',
    thanksInterest: 'Danke! Wir melden uns (keine Zahlung).',
    noFamily: 'Noch keine Familienmitglieder verknüpft.',
  },
  en: {
    viewAs: 'View as',
    shares: '🔒 {name} shares check-ins and help requests with you. {name} can stop this any time.',
    noConsent: '🔒 {name} has not (yet) agreed to share information with you.',
    hello: 'Hi {name}',
    sub: '{parent} · {town} · you: {city}',
    today: 'Today',
    ok: '✅ {name} checked in',
    okVia: 'via {channel}',
    at: 'at {time}',
    help: '🙋 {name} asked for help today',
    helpSub: 'See the progress in the alerts below.',
    notYet: '⏳ No check-in yet today',
    notYetSub: 'Clara calls again at 09:30. The village coordinator is informed at 10:00.',
    alerts: 'Alerts',
    noAlerts: 'No alerts today.',
    medPrivacy: '🩺 Medical details are only shared with doctors and nurses.',
    missed: 'No check-in yet today',
    missedSub: 'Clara calls at 09:30 · coordinator informed at 10:00',
    alarm: 'Alarm button (Hausnotruf)',
    alarmKind: { sos: 'Alarm button pressed', 'no-daily-press': 'Daily OK button not pressed' },
    alarmStatus: { incoming: 'Call centre is handling it', talking: 'Talking to the call centre', 'called-112': '112 called', 'keyholder-sent': 'Keyholder on the way', 'family-informed': 'Family informed', resolved: 'Resolved' },
    req: { open: 'Looking for a helper ({n} asked)', accepted: 'Accepted by {name}', completed: 'Completed by {name}', escalated: 'Nobody free — the coordinator is on it' },
    reqBy: 'requested by {by}',
    weekly: 'weekly',
    medQueued: 'Nurse/doctor call-back requested',
    medDone: 'Nurse/doctor called back',
    callOut: '☎️ Check-in call',
    callIn: '☎️ Call to the hotline',
    helpers: 'Who helps {name}',
    noHelpers: 'No regular helpers yet.',
    visits: '{n} visits · since {since}',
    fav: 'Favourite helper',
    thank: '💌 Say thank you',
    thanked: 'Thank-you note sent to {name} ✓',
    appts: 'Appointments',
    noAppts: 'No appointments booked.',
    book: 'Book a doctor slot for {name}',
    booked: '📅 Booked: {a}',
    arrange: 'Arrange help for {name}',
    placeholder: 'What is needed? e.g. a ride to the doctor on Monday',
    category: 'Category:',
    medNote: ' — goes to a nurse/doctor, not to volunteers.',
    emTitle: '❓ Is this an emergency?',
    emBody: 'DorfConnect does not decide this. If yes: call 112 now and give the address: {address}.',
    call112: '📞 Call 112 now',
    pressAlarm: 'or: {name} can press the alarm button on the wrist.',
    callParent: 'or: call {name} directly ({phone}).',
    notEm: 'No, not an emergency',
    agreed: 'I agreed this with {name}.',
    repeat: 'Repeat every week',
    send: 'Send request',
    sent: '✅ Sent! Nearby volunteers were asked. You will see here who accepts.',
    sentMed: '✅ Sent! A nurse or doctor will call {name} back.',
    quick: [
      ['🚗', 'Ride to the doctor', 'A ride to the doctor appointment on Monday for {name}.'],
      ['🛒', 'Shopping', 'Groceries for {name}: milk, bread and fruit.'],
      ['🏠', 'Household', 'Help in the garden and taking out the bins for {name}.'],
      ['☕', 'Company', 'A visit for coffee and a chat, {name} is often alone.'],
    ],
    premium: '🏠 DorfConnect per household',
    premiumPrice: '€3.99 / month',
    premiumList: ['Clara, check-ins, help from neighbours and rides', 'Instant family alerts for alarms or missed check-ins', 'All family members included', 'SOS and 112 are always free'],
    hypothesis: 'Often paid by the family · care stays billed to insurance',
    interested: "I'm interested",
    thanksInterest: 'Thanks! We will be in touch (no payment).',
    noFamily: 'No family members linked yet.',
  },
}

const fill = (s, vars = {}) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
const first = (name) => name?.split(' ')[0] ?? ''

export default function Family() {
  const state = useStore()
  const { lang } = useLang()
  const d = L[lang] ?? L.en
  const members = state.residents.flatMap((r) => (r.family ?? []).map((f) => ({ ...f, residentId: r.id })))
  const [memberId, setMemberId] = useState(members[0]?.id)
  const member = members.find((m) => m.id === memberId) ?? members[0]
  if (!member) return <p className="text-slate-500">{d.noFamily}</p>
  const r = state.residents.find((x) => x.id === member.residentId)
  const name = first(r.name)

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-1 text-sm">
        <span className="text-slate-500">{d.viewAs}:</span>
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => setMemberId(m.id)}
            className={`rounded-full px-3 py-1 ${m.id === member.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
          >
            {first(m.name)} ({lang === 'de' ? m.relationDe : m.relation} · {first(state.residents.find((x) => x.id === m.residentId).name)})
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-[2.75rem] border-[6px] border-slate-800 bg-slate-50 shadow-2xl">
        <div className="relative flex items-center justify-between bg-white px-7 pb-1 pt-2 text-xs font-semibold text-slate-800">
          <span>9:41</span>
          <span className="absolute left-1/2 top-1.5 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-900" />
          <span>5G 🔋</span>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <h1 className="text-2xl font-bold">{fill(d.hello, { name: first(member.name) })} 👋</h1>
            <p className="text-sm text-slate-500">{fill(d.sub, { parent: r.name, town: MUNICIPALITIES[r.municipality]?.name ?? REGION_NAME, city: member.city })}</p>
          </div>

          <p className={`rounded-2xl p-3 text-sm ${member.consent ? 'bg-indigo-50 text-indigo-900' : 'bg-slate-100 text-slate-600'}`}>
            {fill(member.consent ? d.shares : d.noConsent, { name })}
          </p>

          {member.consent && (
            <>
              <TodayStatus r={r} state={state} d={d} lang={lang} />
              <Alerts r={r} state={state} d={d} lang={lang} />
              <Helpers key={r.id} r={r} state={state} d={d} />
              <Appointments r={r} state={state} d={d} lang={lang} />
              <ArrangeHelp key={`${r.id}-${lang}`} r={r} member={member} d={d} lang={lang} />
            </>
          )}
          <Premium d={d} />
        </div>
      </div>
    </div>
  )
}

const fmtTime = (t, lang) => new Date(t).toLocaleTimeString(lang === 'de' ? 'de-DE' : 'en-GB', { hour: '2-digit', minute: '2-digit' })

function Section({ title, children, className = '' }) {
  return (
    <section className={`rounded-2xl ${/\bbg-/.test(className) ? '' : 'bg-white'} p-4 shadow-sm ring-1 ring-slate-100 ${className}`}>
      {title && <h2 className="mb-2 font-semibold">{title}</h2>}
      {children}
    </section>
  )
}

function TodayStatus({ r, state, d, lang }) {
  const name = first(r.name)
  if (r.lastCheckIn === 'today-ok') {
    const ch = CHANNELS[r.lastCheckInVia]
    const t = r.lastCheckInAt ?? state.calls.find((c) => c.residentId === r.id && c.purpose === 'checkin')?.t
    return (
      <Section className="bg-green-50 ring-green-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-700">{d.today}</p>
        <p className="mt-1 text-2xl font-bold text-green-800">{fill(d.ok, { name })}</p>
        <p className="mt-1 text-green-800">
          {ch && `${ch.icon} ${fill(d.okVia, { channel: ch[lang] })}`}{t ? ` ${fill(d.at, { time: fmtTime(t, lang) })}` : ''}
        </p>
      </Section>
    )
  }
  if (r.lastCheckIn === 'today-help')
    return (
      <Section className="bg-orange-50 ring-orange-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{d.today}</p>
        <p className="mt-1 text-2xl font-bold text-orange-800">{fill(d.help, { name })}</p>
        <p className="mt-1 text-sm text-orange-800">{d.helpSub}</p>
      </Section>
    )
  return (
    <Section className="bg-amber-50 ring-amber-200">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{d.today}</p>
      <p className="mt-1 text-2xl font-bold text-amber-900">{d.notYet}</p>
      <p className="mt-1 text-sm text-amber-900">{d.notYetSub}</p>
    </Section>
  )
}

function Alerts({ r, state, d, lang }) {
  const vname = (id) => first(state.volunteers.find((v) => v.id === id)?.name)
  const items = []

  if (!r.lastCheckIn) items.push({ key: 'missed', t: Infinity, icon: '⏳', title: d.missed, sub: d.missedSub, tone: 'amber' })

  for (const a of state.alarms.filter((x) => x.residentId === r.id)) {
    const last = a.steps[a.steps.length - 1]
    items.push({
      key: a.id, t: last?.t ?? a.t, alarm: true, icon: '🔴',
      title: `${d.alarm}: ${d.alarmKind[a.kind] ?? a.kind}`,
      sub: `→ ${last?.text ?? ''}`,
      status: d.alarmStatus[a.status] ?? a.status,
      steps: a.steps,
    })
  }

  for (const q of state.requests.filter((x) => x.residentId === r.id)) {
    const t = q.completedAt ?? q.acceptedAt ?? q.createdAt
    const status = fill(d.req[q.status] ?? q.status, { n: q.notified?.length ?? 0, name: vname(q.assignedTo) })
    const ch = CHANNELS[q.via]
    items.push({
      key: q.id, t, icon: q.status === 'completed' ? '🎉' : q.status === 'accepted' ? '🤝' : '🙋',
      title: `${TYPE_LABEL_I18N[lang][q.type] ?? q.type}${q.recurring ? ` · ${d.weekly}` : ''}`,
      sub: `${status}${q.by ? ` · ${fill(d.reqBy, { by: q.by })}` : ''}${ch ? ` · ${ch.icon}` : ''}`,
      tone: q.status === 'escalated' ? 'orange' : q.status === 'completed' ? 'green' : 'slate',
    })
  }

  for (const m of state.medicalQueue.filter((x) => x.residentId === r.id))
    items.push({ key: m.id, t: m.createdAt, icon: '🩺', title: m.status === 'answered' ? d.medDone : d.medQueued, sub: d.medPrivacy, tone: 'violet' })

  for (const c of state.calls.filter((x) => x.residentId === r.id))
    items.push({ key: c.id, t: c.t, icon: '', title: c.direction === 'outbound' ? d.callOut : d.callIn, sub: c.result, tone: 'slate' })

  items.sort((a, b) => b.t - a.t)

  const TONE = {
    amber: 'bg-amber-50 text-amber-900', orange: 'bg-orange-50 text-orange-900', green: 'bg-green-50 text-green-900',
    violet: 'bg-violet-50 text-violet-900', slate: 'bg-slate-50 text-slate-800',
  }

  return (
    <Section title={`🔔 ${d.alerts}`}>
      {items.length === 0 && <p className="text-sm text-slate-400">{d.noAlerts}</p>}
      <div className="space-y-2">
        {items.map((it) =>
          it.alarm ? (
            <div key={it.key} className="rounded-xl border-2 border-red-500 bg-red-50 p-3 text-red-900">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{it.icon} {it.title}</p>
                <span className="shrink-0 text-xs">{fmtTime(it.t, lang)}</span>
              </div>
              <p className="mt-1 font-semibold">{it.sub}</p>
              <p className="mt-1 inline-block rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">{it.status}</p>
              <ol className="mt-2 space-y-0.5 border-l-2 border-red-200 pl-2 text-xs text-red-800">
                {it.steps.map((s, i) => <li key={i}>{fmtTime(s.t, lang)} · {s.text}</li>)}
              </ol>
            </div>
          ) : (
            <div key={it.key} className={`rounded-xl p-3 text-sm ${TONE[it.tone]}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{it.icon} {it.title}</p>
                {Number.isFinite(it.t) && <span className="shrink-0 text-xs opacity-70">{fmtTime(it.t, lang)}</span>}
              </div>
              {it.sub && <p className="mt-0.5 text-xs">{it.sub}</p>}
            </div>
          ),
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">{d.medPrivacy}</p>
    </Section>
  )
}

function Helpers({ r, state, d }) {
  const [thanked, setThanked] = useState([])
  const helpers = Object.entries(r.bonds ?? {})
    .filter(([, b]) => b.visits > 0)
    .sort((a, b) => b[1].visits - a[1].visits)
  return (
    <Section title={`🤝 ${fill(d.helpers, { name: first(r.name) })}`}>
      {helpers.length === 0 && <p className="text-sm text-slate-400">{d.noHelpers}</p>}
      {helpers.map(([vid, b]) => {
        const v = state.volunteers.find((x) => x.id === vid)
        if (!v) return null
        const done = thanked.includes(vid)
        return (
          <div key={vid} className="flex items-center justify-between gap-2 py-1.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 font-bold text-white">{v.name[0]}</span>
              <div>
                <p className="font-medium leading-tight">
                  {first(v.name)} {b.favourite && <span title={d.fav}>❤️</span>}
                </p>
                <p className="text-xs text-slate-500">{fill(d.visits, { n: b.visits, since: b.since })}</p>
              </div>
            </div>
            {done ? (
              <span className="text-xs text-green-700">{fill(d.thanked, { name: first(v.name) })}</span>
            ) : (
              <button onClick={() => setThanked((x) => [...x, vid])} className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
                {d.thank}
              </button>
            )}
          </div>
        )
      })}
    </Section>
  )
}

function Appointments({ r, state, d, lang }) {
  const [open, setOpen] = useState(false)
  const dayName = (day) => DAY_I18N[lang][day] ?? day
  const mine = state.rotation.flatMap((day) =>
    day.slots.filter((s) => s.bookedBy === r.id).map((s) => `${dayName(day.day)} ${s.time} · ${day.who}`),
  )
  return (
    <Section title={`📅 ${d.appts}`}>
      {mine.length === 0 && <p className="text-sm text-slate-400">{d.noAppts}</p>}
      {mine.map((a) => <p key={a} className="mb-1 rounded-xl bg-blue-50 p-2 text-sm text-blue-900">{fill(d.booked, { a })}</p>)}
      <button onClick={() => setOpen((o) => !o)} className="mt-2 w-full rounded-xl bg-blue-600 py-2 text-sm font-semibold text-white">
        {fill(d.book, { name: first(r.name) })} {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {state.rotation.map((day, di) => {
            const free = day.slots.map((s, si) => ({ ...s, si })).filter((s) => !s.bookedBy).slice(0, 3)
            return (
              <div key={day.day} className="rounded-xl border border-slate-200 p-2 text-sm">
                <p className="font-medium">{dayName(day.day)} · {day.who}</p>
                <p className="text-xs text-slate-500">{dayMode(day, lang).label}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {free.map((s) => (
                    <button key={s.time} onClick={() => { actions.bookSlot(di, s.si, r.id); setOpen(false) }} className="rounded-lg bg-blue-100 px-2 py-1 text-blue-900 hover:bg-blue-200">
                      {s.time}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

function ArrangeHelp({ r, member, d, lang }) {
  const name = first(r.name)
  const [text, setText] = useState('')
  const [notEmergency, setNotEmergency] = useState(false) // the family member's own answer, never inferred
  const [agreed, setAgreed] = useState(false)
  const [recurring, setRecurring] = useState(false)
  const [sent, setSent] = useState(null)
  const type = text.trim() ? classifyRequest(text, { askedAlready: notEmergency }) : null

  const submit = () => {
    actions.createRequest(r.id, text, type, { recurring: type !== 'medical' && recurring, via: 'family', by: `${first(member.name)} (${member.relation})` })
    setSent(type === 'medical' ? fill(d.sentMed, { name }) : d.sent)
    setText(''); setAgreed(false); setRecurring(false); setNotEmergency(false)
  }

  return (
    <Section title={`🙋 ${fill(d.arrange, { name })}`}>
      {sent && <p className="mb-2 rounded-xl bg-green-50 p-3 text-sm text-green-800">{sent}</p>}
      <div className="grid grid-cols-2 gap-2">
        {d.quick.map(([icon, label, phrase]) => (
          <button key={label} onClick={() => { setText(fill(phrase, { name })); setNotEmergency(false); setSent(null) }} className="rounded-xl bg-slate-100 p-2 text-left text-sm hover:bg-slate-200">
            {icon} {label}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setSent(null) }}
        rows={2}
        placeholder={d.placeholder}
        className="mt-2 w-full rounded-xl border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
      />

      {type === 'emergency' && (
        <div className="mt-2 space-y-2 rounded-xl bg-red-50 p-3 text-sm text-red-900">
          <p className="font-bold">{d.emTitle}</p>
          <p>{fill(d.emBody, { address: r.address })}</p>
          <a href="tel:112" className="block rounded-xl bg-red-600 py-2 text-center font-semibold text-white">{d.call112}</a>
          <p className="text-xs">{r.devices?.alarmButton ? fill(d.pressAlarm, { name }) : fill(d.callParent, { name, phone: r.phone })}</p>
          <button onClick={() => setNotEmergency(true)} className="w-full rounded-xl bg-white py-2 font-medium text-slate-700 ring-1 ring-slate-300">{d.notEm}</button>
        </div>
      )}

      {type && type !== 'emergency' && (
        <div className="mt-2 space-y-2">
          <p className="rounded-xl bg-indigo-50 p-2 text-sm text-indigo-900">
            {d.category} <b>{TYPE_LABEL_I18N[lang][type]}</b>{type === 'medical' && d.medNote}
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4" />
            {fill(d.agreed, { name })}
          </label>
          {type !== 'medical' && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-4 w-4" />
              {d.repeat}
            </label>
          )}
          <button disabled={!agreed} onClick={submit} className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white disabled:opacity-40">
            {d.send}
          </button>
        </div>
      )}
    </Section>
  )
}

function Premium({ d }) {
  const [interested, setInterested] = useState(false)
  return (
    <Section className="border-2 border-dashed border-indigo-300">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">{d.premium}</h2>
        <span className="font-bold text-indigo-700">{d.premiumPrice}</span>
      </div>
      <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
        {d.premiumList.map((x) => <li key={x}>{x}</li>)}
      </ul>
      <p className="mt-2 inline-block rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">{d.hypothesis}</p>
      <button onClick={() => setInterested(true)} disabled={interested} className="mt-2 w-full rounded-xl bg-slate-100 py-2 text-sm text-slate-700 disabled:text-green-700">
        {interested ? d.thanksInterest : d.interested}
      </button>
    </Section>
  )
}
