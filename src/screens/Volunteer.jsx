import { useState } from 'react'
import CommunityMap, { MapLegend } from '../components/CommunityMap'
import { Card } from '../components/ui'
import { POINTS_FOR_TYPE, TYPE_LABEL } from '../data/seed'
import { formatDistance, haversineKm } from '../lib/matching'
import { actions, useStore } from '../store'

export default function Volunteer() {
  const state = useStore()
  const [meId, setMeId] = useState('anna')
  const me = state.volunteers.find((v) => v.id === meId)
  const incoming = state.requests.filter((q) => q.status === 'open' && q.notified.includes(meId))
  const mine = state.requests.find((q) => q.status === 'accepted' && q.assignedTo === meId)
  const history = state.requests.filter((q) => q.status === 'completed' && q.assignedTo === meId)

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Signed in as</p>
              <select value={meId} onChange={(e) => setMeId(e.target.value)} className="-ml-1 bg-transparent text-xl font-bold">
                {state.volunteers.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs ${me.verified ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
              {me.verified ? '✔ ID verified' : 'Verification pending'}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat n={`${me.reliability}`} l="Reliability" />
            <Stat n={me.completed} l="Helped" />
            <Stat n={me.points} l="Points" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-sm">
            {['available', 'busy', 'offline'].map((s) => (
              <button
                key={s}
                onClick={() => actions.setVolunteerStatus(meId, s)}
                className={`rounded-lg py-2 capitalize ${me.status === s ? (s === 'available' ? 'bg-green-600 text-white' : 'bg-white shadow') : ''}`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Busy or offline? No problem — you are never penalised for saying no.</p>
        </Card>

        {mine && <ActiveTask q={mine} state={state} me={me} />}

        <Card>
          <h3 className="font-semibold">🔔 Requests near you</h3>
          {!me.verified && <p className="mt-2 text-sm text-slate-500">You'll receive requests once your identity is verified.</p>}
          {me.verified && me.status !== 'available' && !mine && <p className="mt-2 text-sm text-slate-500">Set yourself to Available to receive requests.</p>}
          {me.verified && me.status === 'available' && incoming.length === 0 && <p className="mt-2 text-sm text-slate-500">All quiet. We'll notify you when a neighbour needs help.</p>}
          <div className="mt-3 space-y-3">
            {incoming.map((q) => {
              const r = state.residents.find((x) => x.id === q.residentId)
              return (
                <div key={q.id} className="rounded-xl border-2 border-red-200 bg-red-50 p-3">
                  <div className="flex justify-between text-sm">
                    <b>{TYPE_LABEL[q.type]}</b>
                    <span className="text-amber-700">+{POINTS_FOR_TYPE[q.type]} pts</span>
                  </div>
                  <p className="mt-1 text-slate-700">“{q.text}”</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Resident, {r.age} · ~{formatDistance(haversineKm(me, q.approx))} away · exact address shared after you accept
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => actions.acceptRequest(q.id, meId)} className="flex-1 rounded-lg bg-green-600 py-2 font-semibold text-white">Accept</button>
                    <button onClick={() => actions.declineRequest(q.id, meId)} className="flex-1 rounded-lg bg-white py-2 text-slate-600 ring-1 ring-slate-300">Can't right now</button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Rewards state={state} me={me} />

        {history.length > 0 && (
          <Card>
            <h3 className="font-semibold">History</h3>
            {history.map((q) => (
              <p key={q.id} className="mt-1 text-sm text-slate-600">✔ {TYPE_LABEL[q.type]} · +{q.points} pts</p>
            ))}
          </Card>
        )}
      </div>

      <div className="space-y-2">
        <CommunityMap state={state} mode="volunteer" viewerId={meId} height={640} />
        <MapLegend />
      </div>
    </div>
  )
}

function ActiveTask({ q, state, me }) {
  const r = state.residents.find((x) => x.id === q.residentId)
  const directions = `https://www.google.com/maps/dir/?api=1&origin=${me.lat},${me.lng}&destination=${r.lat},${r.lng}&travelmode=walking`
  return (
    <Card className="border-2 border-teal-500">
      <p className="text-xs font-semibold uppercase text-teal-700">Your active task</p>
      <h3 className="text-lg font-bold">{TYPE_LABEL[q.type]} for {r.name}</h3>
      <p className="text-sm text-slate-600">“{q.text}”</p>
      <div className="mt-3 rounded-xl bg-teal-50 p-3 text-sm">
        <p>🏠 <b>{r.address}</b></p>
        <p>📞 {r.phone}</p>
        <p className="mt-1 text-xs text-teal-800">🔒 Shared only with you, only until the task is done. No medical data shown.</p>
      </div>
      <div className="mt-3 flex gap-2">
        <a href={directions} target="_blank" rel="noreferrer" className="flex-1 rounded-lg bg-slate-900 py-2 text-center text-white">🧭 Directions</a>
        <button onClick={() => actions.completeRequest(q.id)} className="flex-1 rounded-lg bg-teal-600 py-2 font-semibold text-white">Mark done</button>
      </div>
    </Card>
  )
}

function Rewards({ state, me }) {
  return (
    <Card>
      <h3 className="font-semibold">🎁 Rewards from local sponsors</h3>
      <div className="mt-2 space-y-2">
        {state.rewards.map((rw) => (
          <div key={rw.id} className="flex items-center justify-between gap-2 text-sm">
            <span>{rw.name}<br /><span className="text-xs text-slate-500">by {rw.sponsor}</span></span>
            <button
              disabled={me.points < rw.cost}
              onClick={() => actions.redeem(me.id, rw.id)}
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
            >
              {rw.cost} pts
            </button>
          </div>
        ))}
      </div>
    </Card>
  )
}

const Stat = ({ n, l }) => (
  <div className="rounded-xl bg-slate-50 py-2">
    <p className="text-2xl font-bold">{n}</p>
    <p className="text-xs text-slate-500">{l}</p>
  </div>
)
