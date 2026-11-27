import { useEffect, useRef, useState } from 'react'
import CommunityMap from '../components/CommunityMap'
import { MUNICIPALITIES, REGION_NAME } from '../data/seed'
import { DAY_I18N, TYPE_LABEL_I18N, useLang } from '../i18n'
import { classifyRequest, formatDistance, haversineKm } from '../lib/matching'
import { canListen, listen, speak, stopSpeaking } from '../lib/speech'
import { actions, useStore } from '../store'
import Companion from './Companion'

export default function Resident() {
  const state = useStore()
  const { t } = useLang()
  const [meId, setMeId] = useState('maria')
  const me = state.residents.find((r) => r.id === meId)
  const [view, setView] = useState('home')

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-1 text-sm">
        <span className="text-slate-500">{t('demoAs')}:</span>
        {state.residents.map((r) => (
          <button
            key={r.id}
            onClick={() => { setMeId(r.id); setView('home') }}
            className={`rounded-full px-3 py-1 ${r.id === meId ? 'bg-teal-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
          >
            {r.name.split(' ')[0]}, {r.age}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-[2.5rem] border-8 border-slate-900 bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-slate-900 px-6 py-1.5 text-xs text-white">
          <span>09:00</span><span>DorfConnect</span><span>🔋 82%</span>
        </div>
        <div className="min-h-[640px] p-5">
          {view === 'home' && <Home me={me} state={state} go={setView} />}
          {view === 'help' && <Help me={me} go={setView} />}
          {view === 'companion' && <Companion me={me} go={setView} />}
          {view === 'doctor' && <Doctor me={me} state={state} go={setView} />}
          {view === 'sos' && <Sos me={me} go={setView} />}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">{t('phoneCaption')}</p>
    </div>
  )
}

function Home({ me, state, go }) {
  const { t, lang, locale } = useLang()
  const myRequest = state.requests.find((q) => q.residentId === me.id && q.status !== 'completed')
  const lastDone = state.requests.find((q) => q.residentId === me.id && q.status === 'completed')
  const myAppointments = state.rotation.flatMap((d) =>
    d.slots.filter((s) => s.bookedBy === me.id).map((s) => `${DAY_I18N[lang][d.day] ?? d.day} ${s.time} · ${d.who}`),
  )
  const myMedical = state.medicalQueue.find((m) => m.residentId === me.id)
  const [now] = useState(() => new Date())
  const today = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-500">{today} · {MUNICIPALITIES[me.municipality]?.name ?? REGION_NAME}</p>
        <h1 className="text-3xl font-bold">{t('greeting', { name: me.name.split(' ')[0] })}</h1>
        <p className="mt-1 text-lg text-slate-600">{t('howAreYou')}</p>
        <p className="mt-1 text-xs text-slate-400">{me.support} · {t('everyday')}</p>
      </div>

      {me.lastCheckIn === 'today-ok' && <div className="rounded-2xl bg-green-50 p-4 text-green-800">{t('checkedIn')}</div>}

      {myRequest && <RequestStatus q={myRequest} me={me} state={state} />}
      {!myRequest && lastDone && !lastDone.residentRating && <RateCard q={lastDone} state={state} />}
      {!myRequest && lastDone?.residentRating && (
        <div className="rounded-2xl bg-amber-50 p-4 text-amber-900">
          {t('helpedYou', { name: state.volunteers.find((v) => v.id === lastDone.assignedTo)?.name.split(' ')[0] })}
        </div>
      )}
      {me.weeklyVisit && <div className="rounded-2xl bg-teal-50 p-4 text-teal-900">{t('weeklyVisit')}</div>}
      <MyHelpers me={me} state={state} />
      {myMedical && (
        <div className="rounded-2xl bg-violet-50 p-4 text-violet-900">
          {myMedical.status === 'answered' ? t('medAnswered') : t('medWaiting')}
        </div>
      )}
      {myAppointments.map((a) => (
        <div key={a} className="rounded-2xl bg-blue-50 p-4 text-blue-900">{t('appointment', { a })}</div>
      ))}

      <div className="space-y-3 pt-2">
        <BigButton className="bg-green-600 text-white" onClick={() => actions.checkIn(me.id)}>{t('btnWell')}</BigButton>
        <BigButton className="border-2 border-slate-300 bg-white" onClick={() => go('help')}>{t('btnHelp')}</BigButton>
        <BigButton className="border-2 border-teal-300 bg-teal-50 text-teal-900" onClick={() => go('companion')}>{t('btnCompanion')}</BigButton>
        <BigButton className="border-2 border-slate-300 bg-white" onClick={() => go('doctor')}>{t('btnDoctor')}</BigButton>
        <BigButton className="bg-red-600 py-7 text-white" onClick={() => go('sos')}>{t('btnSos')}</BigButton>
      </div>
    </div>
  )
}

function RequestStatus({ q, me, state }) {
  const { t, lang } = useLang()
  const helper = state.volunteers.find((v) => v.id === q.assignedTo)
  if (q.status === 'open')
    return (
      <div className="rounded-2xl bg-orange-50 p-4 text-orange-900">
        <p className="font-semibold">{t('looking')}</p>
        <p className="text-sm">{t('askedN', { n: q.notified.length })}</p>
      </div>
    )
  if (q.status === 'escalated') return <div className="rounded-2xl bg-orange-50 p-4 text-orange-900">{t('escalated')}</div>
  return (
    <div className="space-y-2 rounded-2xl bg-teal-50 p-4 text-teal-900">
      <p className="text-lg font-semibold">{t('coming', { name: helper.name.split(' ')[0] })}</p>
      {me.bonds[helper.id]?.visits > 0 && (
        <p className="text-sm font-medium">{t('knownHelper', { name: helper.name.split(' ')[0], n: me.bonds[helper.id].visits })}</p>
      )}
      <p className="text-sm">
        {t('comingMeta', { type: TYPE_LABEL_I18N[lang][q.type], dist: formatDistance(haversineKm(helper, me)), rel: helper.reliability })}
      </p>
      <CommunityMap state={state} mode="resident" viewerId={me.id} height={200} />
    </div>
  )
}

function Help({ me, go }) {
  const { t, lang, speechLang } = useLang()
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [consent, setConsent] = useState(true)
  const [recurring, setRecurring] = useState(false)
  const [notEmergency, setNotEmergency] = useState(false) // the person's own answer, never inferred
  const stopRef = useRef(null)
  const type = text.trim() ? classifyRequest(text, { askedAlready: notEmergency }) : null

  const toggleMic = () => {
    if (listening) { stopRef.current?.(); return }
    setListening(true)
    stopRef.current = listen({ lang: speechLang, onText: setText, onEnd: () => setListening(false) })
  }

  const submit = () => {
    actions.createRequest(me.id, text, type, { recurring })
    go('home')
  }

  return (
    <div className="space-y-4">
      <Back go={go} />
      <h2 className="text-2xl font-bold">{t('helpTitle')}</h2>

      <button
        onClick={canListen ? toggleMic : undefined}
        className={`mx-auto flex h-36 w-36 flex-col items-center justify-center rounded-full text-5xl text-white shadow-lg transition ${listening ? 'animate-pulse bg-red-500' : 'bg-teal-600 hover:bg-teal-700'}`}
      >
        🎙️
        <span className="mt-1 text-sm font-medium">{listening ? t('listening') : canListen ? t('tapSpeak') : t('typeBelow')}</span>
      </button>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder={t('typeHere')}
        className="w-full rounded-2xl border-2 border-slate-200 p-3 text-lg focus:border-teal-500 focus:outline-none"
      />

      <div className="grid grid-cols-2 gap-2">
        {t('quick').map(([icon, label, phrase]) => (
          <button key={label} onClick={() => setText(phrase)} className="rounded-xl bg-slate-100 p-3 text-left text-base hover:bg-slate-200">
            {icon} {label}
          </button>
        ))}
      </div>

      {type === 'emergency' ? (
        <div className="space-y-2 rounded-2xl bg-red-50 p-4 text-red-900">
          <p className="font-bold">{t('emergencyTitle')}</p>
          <p className="text-sm">{t('emergencyBody')}</p>
          <BigButton className="bg-red-600 text-white" onClick={() => go('sos')}>{t('btnSos')}</BigButton>
          <button onClick={() => setNotEmergency(true)} className="w-full rounded-xl bg-white py-3 text-base font-medium text-slate-700 ring-1 ring-slate-300">
            {t('notEmergency')}
          </button>
        </div>
      ) : (
        type && (
          <>
            <p className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900">
              {t('understoodAs')} <b>{TYPE_LABEL_I18N[lang][type]}</b>
              {type === 'medical' && t('medicalNote')}
            </p>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5" />
              {t('consent')}
            </label>
            {type !== 'medical' && (
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="h-5 w-5" />
                {t('repeatWeekly')}
              </label>
            )}
            <BigButton disabled={!consent} className="bg-teal-600 text-white disabled:opacity-40" onClick={submit}>{t('submit')}</BigButton>
          </>
        )
      )}
    </div>
  )
}

function Doctor({ me, state, go }) {
  const { t, lang } = useLang()
  return (
    <div className="space-y-4">
      <Back go={go} />
      <h2 className="text-2xl font-bold">{t('doctorsTitle')}</h2>
      <p className="text-sm text-slate-500">{t('doctorsSub')}</p>
      {state.rotation.map((d, di) => {
        const free = d.slots.map((s, si) => ({ ...s, si })).filter((s) => !s.bookedBy)
        return (
          <div key={d.day} className="rounded-2xl border border-slate-200 p-4">
            <p className="font-semibold">{DAY_I18N[lang][d.day] ?? d.day} · {d.who}</p>
            <p className="text-sm text-slate-500">{lang === 'de' ? d.serviceDe ?? d.service : d.service}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {free.length === 0 && <span className="text-sm text-slate-400">{t('fullyBooked')}</span>}
              {free.slice(0, 4).map((s) => (
                <button key={s.time} onClick={() => { actions.bookSlot(di, s.si, me.id); go('home') }} className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700">
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
  const { t, lang, speechLang } = useLang()
  const medical = lang === 'de' ? me.medicalDe ?? me.medical : me.medical
  const contact = me.emergencyContact.split('·')[0].trim()
  const announcement = t('announcement', { name: me.name, age: me.age, address: me.address, medical, contact })

  const logged = useRef(false)
  useEffect(() => {
    if (!logged.current) { logged.current = true; actions.sos(me.id) }
    speak(announcement, speechLang)
    return stopSpeaking
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-red-600 p-5 text-white">
        <p className="text-sm uppercase tracking-wide opacity-80">{t('simulation')}</p>
        <p className="mt-1 text-3xl font-bold">{t('calling')}</p>
        <p className="mt-1">{t('noSpeak')}</p>
      </div>

      <div className="space-y-2 rounded-2xl border-2 border-red-200 p-4 text-sm">
        <Row k={t('rName')} v={`${me.name}, ${me.age}`} />
        <Row k={t('rAddress')} v={me.address} />
        <Row k={t('rLocation')} v={`${me.lat.toFixed(5)}, ${me.lng.toFixed(5)} (GPS / AML)`} />
        <Row k={t('rMedical')} v={medical} />
        <Row k={t('rContact')} v={`${me.emergencyContact} — ${t('notified')}`} />
      </div>

      <button onClick={() => speak(announcement, speechLang)} className="w-full rounded-xl bg-slate-100 p-3">{t('replay')}</button>
      <BigButton className="border-2 border-slate-300 bg-white" onClick={() => { stopSpeaking(); go('home') }}>{t('cancelOk')}</BigButton>
      <p className="text-xs text-slate-500">{t('sosLegal')}</p>
    </div>
  )
}

function MyHelpers({ me, state }) {
  const { t } = useLang()
  const helpers = Object.entries(me.bonds ?? {})
    .filter(([, b]) => b.visits > 0)
    .sort((a, b) => b[1].visits - a[1].visits)
  if (!helpers.length) return null
  return (
    <div className="rounded-2xl border-2 border-amber-100 p-4">
      <p className="mb-2 font-semibold">{t('myHelpers')}</p>
      {helpers.map(([vid, b]) => {
        const v = state.volunteers.find((x) => x.id === vid)
        return (
          <div key={vid} className="flex items-center justify-between gap-2 py-1">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-lg font-bold text-white">{v.name[0]}</span>
              <div>
                <p className="text-lg font-medium leading-tight">{v.name.split(' ')[0]}</p>
                <p className="text-xs text-slate-500">{t('visitsN', { n: b.visits, since: b.since })}</p>
              </div>
            </div>
            <button
              onClick={() => actions.setFavourite(me.id, vid, !b.favourite)}
              aria-label={b.favourite ? t('favOn') : t('favOff')}
              title={b.favourite ? t('favOn') : t('favOff')}
              className={`rounded-full px-3 py-1.5 text-2xl ${b.favourite ? 'bg-rose-50' : 'opacity-40 grayscale'}`}
            >
              ❤️
            </button>
          </div>
        )
      })}
    </div>
  )
}

function RateCard({ q, state }) {
  const { t } = useLang()
  const helper = state.volunteers.find((v) => v.id === q.assignedTo)
  const [stars, setStars] = useState(0)
  const [again, setAgain] = useState(false)
  const [tags, setTags] = useState([])
  const TAGS = [['punctual', t('tagPunctual')], ['kind', t('tagKind')], ['helpful', t('tagHelpful')]]
  const toggle = (k) => setTags((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))
  return (
    <div className="space-y-3 rounded-2xl bg-amber-50 p-4 text-amber-900">
      <p className="text-lg font-semibold">{t('rateTitle', { name: helper.name.split(' ')[0] })}</p>
      <div className="flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} aria-label={`${n} stars`} onClick={() => setStars(n)} className={`text-4xl transition ${n <= stars ? 'scale-110' : 'opacity-30 grayscale'}`}>⭐</button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {TAGS.map(([k, label]) => (
          <button key={k} onClick={() => toggle(k)} className={`rounded-full px-3 py-1 text-sm ${tags.includes(k) ? 'bg-amber-500 text-white' : 'bg-white ring-1 ring-amber-200'}`}>{label}</button>
        ))}
      </div>
      <label className="flex items-center justify-center gap-2 text-sm">
        <input type="checkbox" checked={again} onChange={(e) => setAgain(e.target.checked)} className="h-5 w-5" />
        {t('preferAgain', { name: helper.name.split(' ')[0] })}
      </label>
      <button disabled={!stars} onClick={() => { actions.rateVolunteer(q.id, stars, tags); if (again) actions.setFavourite(q.residentId, helper.id, true) }} className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-white disabled:opacity-40">
        {t('rateSend')}
      </button>
    </div>
  )
}

const Row = ({ k, v }) => (
  <div className="flex gap-3"><span className="w-32 shrink-0 font-semibold text-slate-500">{k}</span><span>{v}</span></div>
)

function Back({ go }) {
  const { t } = useLang()
  return <button onClick={() => go('home')} className="text-lg text-teal-700">{t('back')}</button>
}

function BigButton({ className = '', children, ...props }) {
  return (
    <button {...props} className={`w-full rounded-2xl px-5 py-5 text-xl font-semibold shadow-sm transition active:scale-[0.98] ${className}`}>
      {children}
    </button>
  )
}
