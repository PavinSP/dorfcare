import { Card } from '../components/ui'
import { actions, useStore } from '../store'

export default function Doctor() {
  const state = useStore()
  const name = (id) => state.residents.find((r) => r.id === id)?.name ?? id
  const totalSlots = state.rotation.reduce((n, d) => n + d.slots.length, 0)
  const booked = state.rotation.reduce((n, d) => n + d.slots.filter((s) => s.bookedBy).length, 0)
  const waiting = state.medicalQueue.filter((m) => m.status === 'waiting')

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi n="5" l="Doctors & nurses in the rota" />
        <Kpi n="3" l="Villages sharing them" />
        <Kpi n={`${booked}/${totalSlots}`} l="Slots booked this week" />
        <Kpi n="2 days" l="Avg. wait (was 6 weeks)" accent />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card>
          <h2 className="text-lg font-bold">Weekly doctor rotation — Gemeindehaus Lindenbach</h2>
          <p className="text-sm text-slate-500">Doctors publish the hours they can give. DorfConnect fills the rota and residents book slots.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {state.rotation.map((d) => (
              <div key={d.day} className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold">{d.day}</p>
                <p className="text-sm text-blue-700">{d.who}</p>
                <p className="mb-2 text-xs text-slate-500">{d.service}</p>
                {d.slots.map((s) => (
                  <div key={s.time} className={`mb-1 rounded-md px-2 py-1 text-xs ${s.bookedBy ? 'bg-blue-100 text-blue-900' : 'bg-slate-50 text-slate-400'}`}>
                    {s.time} {s.bookedBy ? `· ${name(s.bookedBy)}` : '· free'}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h3 className="font-semibold">🩺 Call-back queue</h3>
            <p className="text-xs text-slate-500">Medical questions are routed here — never to volunteers.</p>
            {waiting.length === 0 && <p className="mt-3 text-sm text-slate-400">No open questions.</p>}
            {waiting.map((m) => {
              const r = state.residents.find((x) => x.id === m.residentId)
              return (
                <div key={m.id} className="mt-3 rounded-xl bg-violet-50 p-3 text-sm">
                  <p><b>{r.name}</b>, {r.age}</p>
                  <p className="text-slate-700">“{m.text}”</p>
                  <p className="mt-1 text-xs text-slate-500">History (doctor-only): {r.medical}</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => actions.answerMedical(m.id)} className="flex-1 rounded-lg bg-violet-600 py-1.5 text-white">📹 Video call</button>
                    <button onClick={() => actions.answerMedical(m.id)} className="flex-1 rounded-lg bg-white py-1.5 ring-1 ring-violet-300">Send nurse</button>
                  </div>
                </div>
              )
            })}
          </Card>

          <Card>
            <h3 className="font-semibold">🤝 Remote doctor + local nurse</h3>
            <p className="mt-1 text-sm text-slate-600">
              When a resident needs a check but no doctor is in the village, the visiting nurse goes to the home and the remote doctor joins by video.
            </p>
            <div className="mt-3 rounded-xl bg-slate-900 p-4 text-center text-white">
              <p className="text-3xl">👩‍⚕️ ↔ 📹 ↔ 👨‍⚕️</p>
              <p className="mt-1 text-xs opacity-70">Nurse Lena Vogt (on site) · Dr. Yilmaz (remote)</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

const Kpi = ({ n, l, accent }) => (
  <div className={`rounded-2xl p-4 shadow-sm ${accent ? 'bg-teal-600 text-white' : 'bg-white'}`}>
    <p className="text-2xl font-bold">{n}</p>
    <p className={`text-xs ${accent ? 'text-teal-50' : 'text-slate-500'}`}>{l}</p>
  </div>
)
