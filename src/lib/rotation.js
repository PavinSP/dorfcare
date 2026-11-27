// How a rotation day actually runs, given its legal status.
// A village-hall day (route 'branch') only runs in person once the KV has approved it.
// Until then it automatically runs as a video day with a nurse at home, so nothing is ever booked
// into a room that isn't allowed yet.
import { MUNICIPALITIES, ROOM_CHECKS } from '../data/seed.js'

const L = {
  de: {
    inPerson: '📍 Gemeindehaus {p} · vor Ort',
    fallback: '📹 Video + Pflege zu Hause',
    fallbackNote: 'Sprechstunde im Gemeindehaus {p} startet nach KV-Genehmigung',
    video: '📹 Videosprechstunde',
    home: '🏠 Hausbesuche (delegiert)',
    status: { 'not-applied': 'Noch nicht beantragt', pending: 'Bei der KV beantragt', approved: 'KV-genehmigt', 'not-needed': 'Keine Genehmigung nötig' },
  },
  en: {
    inPerson: '📍 Gemeindehaus {p} · in person',
    fallback: '📹 Video + nurse at home',
    fallbackNote: 'Village-hall consultations in {p} start after KV approval',
    video: '📹 Video consultation',
    home: '🏠 Home visits (delegated)',
    status: { 'not-applied': 'Not applied yet', pending: 'Applied to the KV', approved: 'KV-approved', 'not-needed': 'No approval needed' },
  },
}
const fill = (s, p) => s.replace('{p}', p)

/** → { mode: 'in-person'|'video-fallback'|'video'|'home-visits', label, note, status, statusLabel, roomReady } */
export function dayMode(day, lang = 'de') {
  const t = L[lang] ?? L.en
  const site = day.site ?? { route: day.place ? 'branch' : 'video', status: day.place ? 'approved' : 'not-needed', checks: [] }
  const p = MUNICIPALITIES[day.place]?.name ?? ''
  const base = { status: site.status, statusLabel: t.status[site.status], roomReady: roomReady(site) }
  if (site.route === 'branch') {
    return site.status === 'approved'
      ? { ...base, mode: 'in-person', label: fill(t.inPerson, p), note: '' }
      : { ...base, mode: 'video-fallback', label: t.fallback, note: fill(t.fallbackNote, p) }
  }
  if (site.route === 'home-visits') return { ...base, mode: 'home-visits', label: t.home, note: '' }
  return { ...base, mode: 'video', label: t.video, note: '' }
}

export const roomReady = (site) => ROOM_CHECKS.every((c) => site.checks?.includes(c.id))
