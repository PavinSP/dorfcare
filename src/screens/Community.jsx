import CommunityMap, { MapLegend } from '../components/CommunityMap'
import { Card } from '../components/ui'
import { VILLAGE_NAME } from '../data/seed'
import { actions, useStore } from '../store'

const FLAG_LABEL = { lonely: '😔 lonely', struggling: '🧺 struggling with daily tasks', unwell: '🤒 seemed unwell', 'home-safety': '⚠️ home safety' }
const avg = (r) => (r.count ? (r.sum / r.count).toFixed(1) : '–')

export default function Community() {
  const state = useStore()
  const available = state.volunteers.filter((v) => v.status === 'available' && v.verified).length
  const open = state.requests.filter((q) => q.status === 'open' || q.status === 'escalated').length
  const done = state.requests.filter((q) => q.status === 'completed').length
  const checkedIn = state.residents.filter((r) => r.lastCheckIn).length
  const leaderboard = [...state.volunteers].filter((v) => v.verified).sort((a, b) => b.points - a.points)
  const needsSupport = state.residents.filter((r) => r.flags.some((f) => !f.handled))

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi n={available} l="Volunteers available now" color="text-green-600" />
        <Kpi n={open} l="Open help requests" color="text-red-600" />
        <Kpi n={done} l="Completed today" color="text-teal-600" />
        <Kpi n={`${checkedIn}/${state.residents.length}`} l="Daily check-ins" color="text-blue-600" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold">{VILLAGE_NAME} — live community map</h2>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">{available} available</span>
          </div>
          <CommunityMap state={state} mode="community" height={560} />
          <MapLegend />
          <p className="text-xs text-slate-500">🔒 Residents' homes are never shown here. Requests appear as an approximate area only.</p>
        </div>

        <div className="space-y-5">
          <Card className="border-2 border-amber-200">
            <h3 className="font-semibold">💛 Needs more everyday support</h3>
            <p className="text-xs text-slate-500">From volunteers' private visit notes — not emergencies.</p>
            {needsSupport.length === 0 && <p className="mt-2 text-sm text-slate-400">Nobody flagged right now.</p>}
            {needsSupport.map((r) => (
              <div key={r.id} className="mt-3 rounded-xl bg-amber-50 p-3 text-sm">
                <p><b>{r.name}</b>, {r.age} <span className="text-xs text-slate-500">· {r.support}</span></p>
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
            <h3 className="font-semibold">☀️ Morning check-ins (09:00)</h3>
            {state.residents.map((r) => {
              const s = r.lastCheckIn
              return (
                <div key={r.id} className="mt-2 flex items-center justify-between text-sm">
                  <span>{r.name}, {r.age}</span>
                  {s === 'today-ok' && <span className="text-green-700">✅ doing well</span>}
                  {s === 'today-help' && <span className="text-orange-600">🙋 asked for help</span>}
                  {!s && <span className="rounded bg-amber-100 px-2 text-amber-800">⚠ no reply — call {r.emergencyContact.split(' (')[0].split(' ·')[0]}</span>}
                </div>
              )
            })}
            <p className="mt-2 text-xs text-slate-500">No reply → 2nd reminder → contact person → coordinator. Not a medical diagnosis.</p>
          </Card>

          <Card>
            <h3 className="font-semibold">🏆 Volunteer leaderboard</h3>
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
