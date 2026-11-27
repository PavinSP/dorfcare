import CommunityMap, { MapLegend } from '../components/CommunityMap'
import OnBehalfForm, { ViaBadge } from '../components/OnBehalfForm'
import { Card } from '../components/ui'
import { CHANNELS, MUNICIPALITIES, REGION_NAME, TYPE_LABEL } from '../data/seed'
import { bondStrength } from '../lib/matching'
import { actions, useStore } from '../store'

const FLAG_LABEL = { lonely: '😔 lonely', struggling: '🧺 struggling with daily tasks', unwell: '🤒 seemed unwell', 'home-safety': '⚠️ home safety' }
const avg = (r) => (r.count ? (r.sum / r.count).toFixed(1) : '–')

export default function Community() {
  const state = useStore()
  const available = state.volunteers.filter((v) => v.status === 'available' && v.verified).length
  const open = state.requests.filter((q) => q.status === 'open' || q.status === 'escalated').length
  const done = state.requests.filter((q) => q.status === 'completed').length
  const checkedIn = state.residents.filter((r) => r.lastCheckIn).length
  const verified = state.volunteers.filter((v) => v.verified)
  const leaderboard = [...verified].sort((a, b) => b.points - a.points).slice(0, 5)
  const nursesToday = (state.nurses ?? []).filter((n) => n.accepting && n.booked < n.capacity).length
  const needsSupport = state.residents.filter((r) => r.flags.some((f) => !f.handled))
  const vname = (id) => state.volunteers.find((v) => v.id === id)?.name.split(' ')[0]
  const pairs = state.residents
    .flatMap((r) => Object.entries(r.bonds ?? {}).filter(([, b]) => b.visits > 0).map(([vid, b]) => ({ r, vid, b, strength: bondStrength(b) })))
    .sort((a, b) => b.strength - a.strength)
  const alone = state.residents.filter((r) => !Object.values(r.bonds ?? {}).some((b) => b.visits > 0))
  const rname = (id) => state.residents.find((r) => r.id === id)?.name ?? id
  const rmuni = (id) => MUNICIPALITIES[state.residents.find((r) => r.id === id)?.municipality]?.name
  const activeReqs = state.requests.filter((q) => q.status !== 'completed')
  const coordFirst = state.coordinator?.name.split(' ')[0] ?? 'Coordinator'

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi n={available} l="Volunteers available now" color="text-green-600" />
        <Kpi n={open} l="Open help requests" color="text-red-600" />
        <Kpi n={done} l="Completed today" color="text-teal-600" />
        <Kpi n={`${checkedIn}/${state.residents.length}`} l="Daily check-ins" color="text-blue-600" />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
        <span className="font-semibold text-slate-800">🌐 Network</span>
        <span><b>{Object.keys(MUNICIPALITIES).length}</b> municipalities</span>
        <span><b>{available}</b> volunteers available</span>
        <span><b>{nursesToday}</b> nurses accepting today</span>
        <span><b>{open}</b> open requests</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold">{REGION_NAME} — live care network</h2>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">{available} available</span>
          </div>
          <CommunityMap state={state} mode="community" height={560} />
          <MapLegend />
          <p className="text-xs text-slate-500">🔒 Residents' homes are never shown here. Requests appear as an approximate area only.</p>
        </div>

        <div className="space-y-5">
          <Card className="border-2 border-indigo-200">
            <h3 className="font-semibold">☎️🤝 Log a request on behalf</h3>
            <p className="mb-3 text-xs text-slate-500">
              {state.coordinator?.name} · {state.coordinator?.role}. For residents without a smartphone: hotline calls, drop-in visits, family.
            </p>
            <OnBehalfForm by={`${coordFirst} (coordinator)`} via="landline" />
          </Card>

          <Card>
            <h3 className="font-semibold">📋 Help requests</h3>
            {activeReqs.length === 0 && <p className="mt-2 text-sm text-slate-400">No open requests.</p>}
            {activeReqs.map((q) => (
              <div key={q.id} className="mt-2 rounded-lg bg-slate-50 p-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span><b>{rname(q.residentId)}</b>{rmuni(q.residentId) ? <span className="text-xs text-slate-500"> ({rmuni(q.residentId)})</span> : null} · {TYPE_LABEL[q.type] ?? q.type}</span>
                  <span className={`shrink-0 text-xs ${q.status === 'escalated' ? 'text-red-600' : q.status === 'accepted' ? 'text-teal-700' : 'text-amber-700'}`}>
                    {q.status === 'accepted' ? `🤝 ${vname(q.assignedTo)}` : q.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">“{q.text}”</p>
                <p className="mt-1 flex flex-wrap gap-1">
                  <ViaBadge q={q} />
                  {(!q.via || q.via === 'app') && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">📱 via app</span>}
                  {q.recurring && <span className="rounded bg-teal-100 px-1.5 py-0.5 text-xs text-teal-800">🔁 weekly</span>}
                </p>
              </div>
            ))}
          </Card>

          {state.dropIn && (
            <Card className="border-2 border-teal-200">
              <h3 className="font-semibold">🏠 Drop-in hour (Sprechstunde der Dorfkümmerin)</h3>
              <p className="mt-1 text-sm">
                <b>{state.dropIn.day} {state.dropIn.time}</b> · {state.dropIn.place}
              </p>
              <p className="text-xs text-slate-500">{state.dropIn.note} — residents come for the doctor and can ask for help in person. No smartphone needed.</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
                <a href={`${import.meta.env.BASE_URL}hilfe-karte.html`} target="_blank" rel="noreferrer" className="rounded-lg bg-teal-600 py-2 font-semibold text-white">🖨️ Fridge card</a>
                <a href={`${import.meta.env.BASE_URL}aushang.html`} target="_blank" rel="noreferrer" className="rounded-lg bg-white py-2 font-semibold text-teal-700 ring-1 ring-teal-300">📌 Bakery notice</a>
              </div>
            </Card>
          )}

          <Card className="border-2 border-amber-200">
            <h3 className="font-semibold">💛 Needs more everyday support</h3>
            <p className="text-xs text-slate-500">From volunteers' private visit notes — not emergencies.</p>
            {needsSupport.length === 0 && <p className="mt-2 text-sm text-slate-400">Nobody flagged right now.</p>}
            {needsSupport.map((r) => (
              <div key={r.id} className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">
                <p><b>{r.name}</b>, {r.age}{MUNICIPALITIES[r.municipality] ? ` · ${MUNICIPALITIES[r.municipality].name}` : ''} <span className="text-xs text-slate-500">· {r.support}</span></p>
                {r.flags.filter((f) => !f.handled).slice(0, 3).map((f, i) => (
                  <p key={i} className="text-xs text-amber-900">{FLAG_LABEL[f.flag] ?? f.flag} — noted by {f.by}</p>
                ))}
                <button
                  onClick={() => { actions.setupWeeklyVisit(r.id); actions.createRequest(r.id, `Weekly visit: coffee, chat and help with small tasks for ${r.name.split(' ')[0]}`, 'companionship', { recurring: true }) }}
                  className="mt-2 w-full rounded-lg bg-amber-500 py-1.5 font-semibold text-white"
                >
                  Set up weekly visit
                </button>
              </div>
            ))}
          </Card>

          <Card>
            <h3 className="font-semibold">🤝 Connections</h3>
            <p className="text-xs text-slate-500">Regular pairs are matched first — familiar faces build trust.</p>
            {pairs.map(({ r, vid, b, strength }) => (
              <div key={r.id + vid} className="mt-2 text-sm">
                <div className="flex justify-between">
                  <span>{r.name.split(' ')[0]} ↔ {vname(vid)} {b.favourite ? '❤️' : ''}</span>
                  <span className="text-slate-500">{b.visits} {b.visits === 1 ? 'visit' : 'visits'}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                  <div className="h-1.5 rounded-full bg-rose-400" style={{ width: `${Math.round(strength * 100)}%` }} />
                </div>
              </div>
            ))}
            {alone.length > 0 && (
              <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                No regular helper yet: <b>{alone.map((r) => r.name.split(' ')[0]).join(', ')}</b> — consider a weekly visit.
              </p>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold">☀️ Morning check-ins (09:00)</h3>
            {state.residents.map((r) => {
              const s = r.lastCheckIn
              return (
                <div key={r.id} className="mt-2 flex items-center justify-between text-sm">
                  <span>{r.name}, {r.age}</span>
                  {s === 'today-ok' && <span className="text-green-700">✅ doing well{r.lastCheckInVia && CHANNELS[r.lastCheckInVia] ? <span title={CHANNELS[r.lastCheckInVia].en}> · {CHANNELS[r.lastCheckInVia].icon}</span> : null}</span>}
                  {s === 'today-help' && <span className="text-orange-600">🙋 asked for help</span>}
                  {!s && <span className="rounded bg-amber-100 px-2 text-amber-800">⚠ no reply — call {r.emergencyContact.split(' (')[0].split(' ·')[0]}</span>}
                </div>
              )
            })}
            <p className="mt-2 text-xs text-slate-500">{Object.values(CHANNELS).map((c) => `${c.icon} ${c.en}`).join(' · ')}</p>
            <p className="mt-1 text-xs text-slate-500">No reply → 2nd reminder → contact person → coordinator. Not a medical diagnosis.</p>
          </Card>

          <Card>
            <h3 className="font-semibold">🏆 Volunteer leaderboard <span className="text-xs font-normal text-slate-500">(top 5 of {verified.length} verified)</span></h3>
            {leaderboard.map((v, i) => (
              <div key={v.id} className="mt-2 flex justify-between text-sm">
                <span>{['🥇', '🥈', '🥉'][i] ?? '·'} {v.name}</span>
                <span className="text-slate-500">{v.points} pts · ★ {avg(v.rating)} · {v.reliability}/100</span>
              </div>
            ))}
          </Card>

          <Card>
            <h3 className="font-semibold">🔒 Requester ratings <span className="text-xs font-normal text-slate-500">(coordinator only)</span></h3>
            {state.residents.map((r) => (
              <div key={r.id} className="mt-2 flex justify-between text-sm">
                <span>{r.name}</span>
                <span className={r.rating.count && r.rating.sum / r.rating.count < 3.5 ? 'text-amber-700' : 'text-slate-500'}>
                  ★ {avg(r.rating)} ({r.rating.count})
                </span>
              </div>
            ))}
            <p className="mt-2 text-xs text-slate-500">A low score triggers a friendly coordinator call — never exclusion from help.</p>
          </Card>

          <Card>
            <h3 className="font-semibold">📜 Live activity</h3>
            <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
              {state.log.map((l, i) => (
                <div key={i} className={`rounded-lg p-2 text-xs ${l.kind === 'sos' ? 'bg-red-50 text-red-800' : 'bg-slate-50 text-slate-700'}`}>
                  <span className="text-slate-400">{new Date(l.t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} </span>
                  {l.text}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

const Kpi = ({ n, l, color }) => (
  <Card>
    <p className={`text-3xl font-bold ${color}`}>{n}</p>
    <p className="text-xs text-slate-500">{l}</p>
  </Card>
)
