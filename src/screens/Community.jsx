import CommunityMap, { MapLegend } from '../components/CommunityMap'
import { Card } from '../components/ui'
import { VILLAGE_NAME } from '../data/seed'
import { useStore } from '../store'

export default function Community() {
  const state = useStore()
  const available = state.volunteers.filter((v) => v.status === 'available' && v.verified).length
  const open = state.requests.filter((q) => q.status === 'open' || q.status === 'escalated').length
  const done = state.requests.filter((q) => q.status === 'completed').length
  const checkedIn = state.residents.filter((r) => r.lastCheckIn).length
  const leaderboard = [...state.volunteers].filter((v) => v.verified).sort((a, b) => b.points - a.points)

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
                <span className="text-slate-500">{v.points} pts · {v.reliability}/100</span>
              </div>
            ))}
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
