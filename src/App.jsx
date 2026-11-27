import { useEffect, useState } from 'react'
import Community from './screens/Community'
import Doctor from './screens/Doctor'
import Family from './screens/Family'
import Hausnotruf from './screens/Hausnotruf'
import Landline from './screens/Landline'
import Resident from './screens/Resident'
import Volunteer from './screens/Volunteer'
import { setLang, useLang } from './i18n'
import { actions, useStore } from './store'

// Role is kept in the URL hash (#resident, #volunteer…) so each browser window can show a different role.
const ROLES = [
  { id: 'resident', label: '👵 Resident', C: Resident },
  { id: 'landline', label: '☎️ Landline', C: Landline },
  { id: 'hausnotruf', label: '🔴 Alarm button', C: Hausnotruf },
  { id: 'family', label: '👪 Family', C: Family },
  { id: 'volunteer', label: '🙋 Volunteer', C: Volunteer },
  { id: 'doctor', label: '🩺 Doctor', C: Doctor },
  { id: 'community', label: '🗺️ Community', C: Community },
]

const fromHash = () => ROLES.find((r) => `#${r.id}` === window.location.hash)?.id ?? 'resident'

export default function App() {
  const [role, setRole] = useState(fromHash)
  const state = useStore()
  const { lang } = useLang()
  const openCount = state.requests.filter((q) => q.status === 'open').length

  useEffect(() => {
    const onHash = () => setRole(fromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const { C } = ROLES.find((r) => r.id === role)

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-[1000] border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-lg text-white">♥</span>
            <div>
              <p className="font-bold leading-tight">DorfConnect</p>
              <p className="hidden text-xs text-slate-500 2xl:block">Your village. Your care. Your community.</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-wrap gap-1">
            {ROLES.map((r) => (
              <a
                key={r.id}
                href={`#${r.id}`}
                className={`relative rounded-lg px-2.5 py-2 text-sm font-medium ${role === r.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {r.label}
                {r.id === 'volunteer' && openCount > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 text-[10px] text-white">{openCount}</span>
                )}
              </a>
            ))}
          </nav>
          <a href="/options.html" title="Team options" aria-label="Team options" className="rounded-lg px-2 py-2 text-lg hover:bg-slate-100">📋</a>
          <a href="/business.html" title="Business case" aria-label="Business case" className="rounded-lg px-2 py-2 text-lg hover:bg-slate-100">💼</a>
          <div className="flex rounded-lg bg-slate-100 p-1 text-sm">
            {[['de', '🇩🇪 DE'], ['en', '🇬🇧 EN']].map(([l, label]) => (
              <button key={l} onClick={() => setLang(l)} className={`rounded-md px-2 py-1 ${lang === l ? 'bg-white font-semibold shadow' : 'text-slate-500'}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => { actions.reset(); fetch('/api/phone-events', { method: 'DELETE' }).catch(() => {}) }} className="rounded-lg px-3 py-2 text-sm text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50">
            ↺ Reset demo
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <C />
      </main>

      <footer className="pb-6 text-center text-xs text-slate-400">
        Prototype · all residents, providers, addresses, rewards and statistics are fictional · no real emergency calls are placed
      </footer>
    </div>
  )
}
