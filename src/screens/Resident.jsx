import { useEffect, useRef, useState } from 'react'
import CommunityMap from '../components/CommunityMap'
import { TYPE_LABEL, VILLAGE_NAME } from '../data/seed'
import { classifyRequest, formatDistance, haversineKm } from '../lib/matching'
import { canListen, listen, speak, stopSpeaking } from '../lib/speech'
import { actions, useStore } from '../store'

const ME = 'maria'

export default function Resident() {
  const state = useStore()
  const me = state.residents.find((r) => r.id === ME)
  const [view, setView] = useState('home')

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="overflow-hidden rounded-[2.5rem] border-8 border-slate-900 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-slate-900 px-6 py-1.5 text-xs text-white">
          <span>09:00</span><span>DorfConnect</span><span>🔋 82%</span>
        </div>
        <div className="min-h-[640px] p-5">
          {view === 'home' && <Home me={me} state={state} go={setView} />}
          {view === 'help' && <Help me={me} go={setView} />}
          {view === 'doctor' && <Doctor state={state} go={setView} />}
          {view === 'sos' && <Sos me={me} go={setView} />}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">Resident view · large text, voice first, works on any smartphone</p>
    </div>
  )
}

function Home({ me, state, go }) {
  const myRequest = state.requests.find((q) => q.residentId === ME && q.status !== 'completed')
  const lastDone = state.requests.find((q) => q.residentId === ME && q.status === 'completed')
  const myAppointments = state.rotation.flatMap((d) => d.slots.filter((s) => s.bookedBy === ME).map((s) => `${d.day} ${s.time} · ${d.who}`))
  const myMedical = state.medicalQueue.find((m) => m.residentId === ME)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-500">Freitag, 27. November · {VILLAGE_NAME}</p>
        <h1 className="text-3xl font-bold">Guten Morgen, {me.name.split(' ')[0]}! 👋</h1>
        <p className="mt-1 text-lg text-slate-600">Wie geht es Ihnen heute?</p>
      </div>

      {me.lastCheckIn === 'today-ok' && (
        <div className="rounded-2xl bg-green-50 p-4 text-green-800">
          ✅ Danke! Your family can see you are doing well today.
        </div>
      )}

      {myRequest && <RequestStatus q={myRequest} state={state} />}
      {!myRequest && lastDone && (
        <div className="rounded-2xl bg-amber-50 p-4 text-amber-900">
          🎉 {state.volunteers.find((v) => v.id === lastDone.assignedTo)?.name.split(' ')[0]} helped you today. A thank-you was sent!
        </div>
      )}
      {myMedical && (
        <div className="rounded-2xl bg-violet-50 p-4 text-violet-900">
          🩺 {myMedical.status === 'answered' ? 'The doctor has called you back.' : 'A nurse/doctor will call you back today.'}
        </div>
      )}
      {myAppointments.map((a) => (
        <div key={a} className="rounded-2xl bg-blue-50 p-4 text-blue-900">📅 Termin: {a}</div>
      ))}

      <div className="space-y-3 pt-2">
        <BigButton className="bg-green-600 text-white" onClick={() => actions.checkIn(ME)}>😊 Mir geht es gut</BigButton>
        <BigButton className="border-2 border-slate-300 bg-white" onClick={() => go('help')}>🎙️ Ich brauche Hilfe</BigButton>
        <BigButton className="border-2 border-slate-300 bg-white" onClick={() => go('doctor')}>📅 Arzttermin finden</BigButton>
        <BigButton className="bg-red-600 py-7 text-white" onClick={() => go('sos')}>📞 SOS — Notfall</BigButton>
      </div>
    </div>
  )
}

function RequestStatus({ q, state }) {
  const helper = state.volunteers.find((v) => v.id === q.assignedTo)
  const me = state.residents.find((r) => r.id === ME)
  if (q.status === 'open')
    return (
      <div className="rounded-2xl bg-orange-50 p-4 text-orange-900">
        <p className="font-semibold">⏳ Looking for a helper…</p>
        <p className="text-sm">{q.notified.length} trusted volunteers nearby were asked. Your address stays private.</p>
      </div>
    )
  if (q.status === 'escalated')
    return <div className="rounded-2xl bg-orange-50 p-4 text-orange-900">📞 No volunteer is free right now — the village coordinator will call you.</div>
  return (
    <div className="space-y-2 rounded-2xl bg-teal-50 p-4 text-teal-900">
      <p className="text-lg font-semibold">🤝 {helper.name.split(' ')[0]} is coming to help!</p>
      <p className="text-sm">{TYPE_LABEL[q.type]} · {formatDistance(haversineKm(helper, me))} away · reliability {helper.reliability}/100 · ✔ verified</p>
      <CommunityMap state={state} mode="resident" viewerId={ME} height={200} />
    </div>
  )
}

function Help({ me, go }) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [consent, setConsent] = useState(true)
  const [lang, setLang] = useState('de-DE')
  const stopRef = useRef(null)
  const type = text.trim() ? classifyRequest(text) : null

  const toggleMic = () => {
    if (listening) { stopRef.current?.(); return }
    setListening(true)
    stopRef.current = listen({ lang, onText: setText, onEnd: () => setListening(false) })
  }

  const quick = [
    ['🛒', 'Einkaufen', 'Ich brauche Hilfe beim Einkaufen, Milch und Brot.'],
    ['🚗', 'Fahrt zum Arzt', 'Ich brauche eine Fahrt zum Arzttermin am Montag.'],
    ['📱', 'Handy', 'Mein Handy funktioniert nicht, ich kann keine Videoanrufe machen.'],
    ['☕', 'Gesellschaft', 'Ich bin heute allein und würde gern reden.'],
  ]

  const submit = () => {
    actions.createRequest(me.id, text, type)
    go('home')
  }

  return (
    <div className="space-y-4">
      <Back go={go} />
      <h2 className="text-2xl font-bold">Wobei brauchen Sie Hilfe?</h2>

      <button
        onClick={canListen ? toggleMic : undefined}
        className={`mx-auto flex h-36 w-36 flex-col items-center justify-center rounded-full text-5xl text-white shadow-lg transition ${listening ? 'animate-pulse bg-red-500' : 'bg-teal-600 hover:bg-teal-700'}`}
      >
        🎙️
        <span className="mt-1 text-sm font-medium">{listening ? 'Listening…' : canListen ? 'Tap & speak' : 'Type below'}</span>
      </button>
      <div className="flex justify-center gap-2 text-xs">
        {['de-DE', 'en-US'].map((l) => (
          <button key={l} onClick={() => setLang(l)} className={`rounded-full px-3 py-1 ${lang === l ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>{l.slice(0, 2).toUpperCase()}</button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="…or type here"
        className="w-full rounded-2xl border-2 border-slate-200 p-3 text-lg focus:border-teal-500 focus:outline-none"
      />

      <div className="grid grid-cols-2 gap-2">
        {quick.map(([icon, label, phrase]) => (
          <button key={label} onClick={() => setText(phrase)} className="rounded-xl bg-slate-100 p-3 text-left text-base hover:bg-slate-200">
            {icon} {label}
          </button>
        ))}
      </div>

      {type === 'emergency' ? (
        <div className="space-y-2 rounded-2xl bg-red-50 p-4 text-red-900">
          <p className="font-bold">⚠️ This sounds like an emergency.</p>
          <p className="text-sm">Emergencies go straight to 112, not to volunteers.</p>
          <BigButton className="bg-red-600 text-white" onClick={() => go('sos')}>📞 SOS — Notfall</BigButton>
        </div>
      ) : (
        type && (
          <>
            <p className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900">
              Understood as: <b>{TYPE_LABEL[type]}</b>
              {type === 'medical' && ' — a nurse or doctor will call you back (not a volunteer).'}
            </p>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5" />
              Share my exact address only with the one volunteer who accepts. Removed when done.
            </label>
            <BigButton disabled={!consent} className="bg-teal-600 text-white disabled:opacity-40" onClick={submit}>Hilfe anfragen</BigButton>
          </>
        )
      )}
    </div>
  )
}

function Doctor({ state, go }) {
  return (
    <div className="space-y-4">
      <Back go={go} />
      <h2 className="text-2xl font-bold">Doctors visiting this week</h2>
      <p className="text-sm text-slate-500">Doctors from neighbouring villages take turns in our Gemeindehaus.</p>
      {state.rotation.map((d, di) => {
        const free = d.slots.map((s, si) => ({ ...s, si })).filter((s) => !s.bookedBy)
        return (
          <div key={d.day} className="rounded-2xl border border-slate-200 p-4">
            <p className="font-semibold">{d.day} · {d.who}</p>
            <p className="text-sm text-slate-500">{d.service}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {free.length === 0 && <span className="text-sm text-slate-400">Fully booked</span>}
              {free.slice(0, 4).map((s) => (
                <button key={s.time} onClick={() => { actions.bookSlot(di, s.si, ME); go('home') }} className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">
                  {s.time}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Sos({ me, go }) {
  const announcement =
    `Automatische Notfallmeldung. Patientin: ${me.name}, ${me.age} Jahre. ` +
    `Adresse: ${me.address}. Vorerkrankungen: Herzinsuffizienz, Diabetes Typ 2. ` +
    `Allergie: Penicillin. Notfallkontakt: ${me.emergencyContact.split('·')[0]}. Die Patientin kann eventuell nicht sprechen.`

  const logged = useRef(false)
  useEffect(() => {
    if (!logged.current) { logged.current = true; actions.sos(me.id) }
    speak(announcement)
    return stopSpeaking
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-red-600 p-5 text-white">
        <p className="text-sm uppercase tracking-wide opacity-80">Simulation — no real call placed</p>
        <p className="mt-1 text-3xl font-bold">📞 Calling 112…</p>
        <p className="mt-1">You don't need to speak. Your details are being read out.</p>
      </div>

      <div className="space-y-2 rounded-2xl border-2 border-red-200 p-4 text-sm">
        <Row k="Name" v={`${me.name}, ${me.age}`} />
        <Row k="Address" v={me.address} />
        <Row k="Location" v={`${me.lat.toFixed(5)}, ${me.lng.toFixed(5)} (phone GPS / AML)`} />
        <Row k="Medical" v={me.medical} />
        <Row k="Emergency contact" v={`${me.emergencyContact} — notified ✔`} />
      </div>

      <button onClick={() => speak(announcement)} className="w-full rounded-xl bg-slate-100 p-3">🔊 Replay announcement</button>
      <BigButton className="border-2 border-slate-300 bg-white" onClick={() => { stopSpeaking(); go('home') }}>Abbrechen — mir geht es gut</BigButton>
      <p className="text-xs text-slate-500">
        Real-world: integration with official channels (112, AML location, nora app) requires approval. German rules (§4 NotrufV) require a
        human action to start an emergency call — the SOS button press is that action. Volunteers never delay professional response.
      </p>
    </div>
  )
}

const Row = ({ k, v }) => (
  <div className="flex gap-3"><span className="w-32 shrink-0 font-semibold text-slate-500">{k}</span><span>{v}</span></div>
)

const Back = ({ go }) => (
  <button onClick={() => go('home')} className="text-lg text-teal-700">← Zurück</button>
)

function BigButton({ className = '', children, ...props }) {
  return (
    <button {...props} className={`w-full rounded-2xl px-5 py-5 text-xl font-semibold shadow-sm transition active:scale-[0.98] ${className}`}>
      {children}
    </button>
  )
}
