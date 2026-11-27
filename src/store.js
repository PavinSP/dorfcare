// Shared demo state. Saved in localStorage and synced across browser tabs/windows,
// so you can open "Resident" in one window and "Volunteer" in another and watch it live.
// To go multi-device later, swap setState/subscribe for Supabase Realtime.

import { useSyncExternalStore } from 'react'
import { initialState, POINTS_FOR_TYPE } from './data/seed'
import { approximate, haversineKm, pickNotified, rankWithExpansion } from './lib/matching'

const KEY = 'dorfconnect-state-v9'
const listeners = new Set()
const fresh = () => structuredClone(initialState)

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return fresh()
}

let state = load()

function emit() { listeners.forEach((l) => l()) }

export function setState(updater) {
  state = updater(structuredClone(state))
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
  emit()
}

window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return
  state = e.newValue ? JSON.parse(e.newValue) : fresh()
  emit()
})

export function useStore() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => state,
  )
}

// ---------------- actions ----------------

/** Next visit slot inside the nurse's working hours ('Mo–Fr 07:00–15:00'): the day is split into `capacity` slots. */
function slotTime(n) {
  const [start, end] = (n.hours.match(/(\d{2}):(\d{2})/g) ?? ['08:00', '16:00']).map((t) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  })
  const slot = Math.floor((end - start) / n.capacity)
  const mins = start + Math.min(n.booked - 1, n.capacity - 1) * slot
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

/** Offer a visit to the nearest nurse who covers the resident, is accepting and has capacity (skips those who declined). */
function offerToNextNurse(s, visit) {
  const r = s.residents.find((x) => x.id === visit.residentId)
  const candidates = s.nurses
    .filter((n) => n.accepting && n.booked < n.capacity && !visit.declined.includes(n.id))
    .map((n) => ({ n, km: haversineKm(n, r) }))
    .filter(({ n, km }) => km <= n.serviceAreaKm)
    .sort((a, b) => a.km - b.km)
  if (candidates.length) {
    visit.nurseId = candidates[0].n.id
    visit.status = 'offered'
    visit.km = Math.round(candidates[0].km * 10) / 10
  } else {
    visit.nurseId = null
    visit.status = 'unassigned'
  }
}

const log = (s, text, kind = 'info') => s.log.unshift({ t: Date.now(), text, kind })
const vol = (s, id) => s.volunteers.find((v) => v.id === id)
const res = (s, id) => s.residents.find((r) => r.id === id)

export const actions = {
  reset() {
    setState(() => fresh())
  },

  /** via: 'app' | 'landline' | 'button' | 'in-person' | 'family' | 'volunteer' | 'coordinator' */
  checkIn(residentId, via = 'app') {
    setState((s) => {
      const r = res(s, residentId)
      r.lastCheckIn = 'today-ok'
      r.lastCheckInVia = via
      r.lastCheckInAt = Date.now()
      log(s, `✅ ${r.name} checked in (${via}): doing well.`, 'ok')
      return s
    })
  },

  /**
   * via: how the request reached us ('app' | 'landline' | 'button' | 'in-person' | 'family' | 'volunteer' | 'coordinator')
   * by:  who logged it on the resident's behalf (e.g. 'Sabine (coordinator)', 'Peter (son)', 'Anna') — null if the resident did
   */
  createRequest(residentId, text, type, { recurring = false, via = 'app', by = null } = {}) {
    let id
    setState((s) => {
      const r = res(s, residentId)
      id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      r.lastCheckIn = 'today-help'
      if (type === 'medical') {
        s.medicalQueue.unshift({ id, residentId, text, createdAt: Date.now(), status: 'waiting', via, by })
        log(s, `🩺 ${r.name} asked a medical question${by ? ` (logged by ${by}, via ${via})` : ''} → routed to nurse/doctor queue.`, 'medical')
        return s
      }
      const { ranked, radiusKm } = rankWithExpansion(s.volunteers, r, type)
      const notified = pickNotified(ranked)
      s.requests.unshift({
        id, residentId, text, type,
        approx: approximate(r, r.id),
        createdAt: Date.now(),
        status: notified.length ? 'open' : 'escalated',
        notified, declined: [], assignedTo: null, recurring, via, by, radiusKm,
      })
      log(
        s,
        notified.length
          ? `🙋 ${r.name} needs help (${type})${via !== 'app' ? ` via ${via}` : ''}${by ? `, logged by ${by}` : ''}. Notified ${notified.map((n) => vol(s, n).name.split(' ')[0]).join(', ')}.`
          : `⚠️ ${r.name} needs help but no volunteer is available → coordinator alerted.`,
        'help',
      )
      return s
    })
    return id
  },

  declineRequest(reqId, volunteerId) {
    setState((s) => {
      const q = s.requests.find((x) => x.id === reqId)
      const r = res(s, q.residentId)
      q.notified = q.notified.filter((n) => n !== volunteerId)
      q.declined.push(volunteerId)
      log(s, `${vol(s, volunteerId).name.split(' ')[0]} can't help right now (no penalty).`)
      if (q.notified.length === 0) {
        const { ranked, radiusKm } = rankWithExpansion(s.volunteers, r, q.type, q.declined)
        const next = pickNotified(ranked)
        q.radiusKm = radiusKm
        q.notified = next
        if (!next.length) { q.status = 'escalated'; log(s, `⚠️ Nobody free for ${r.name} → coordinator alerted.`, 'help') }
        else log(s, `Re-routed ${r.name}'s request to the next best volunteers.`)
      }
      return s
    })
  },

  acceptRequest(reqId, volunteerId) {
    setState((s) => {
      const q = s.requests.find((x) => x.id === reqId)
      if (q.status !== 'open') return s
      q.status = 'accepted'
      q.assignedTo = volunteerId
      q.acceptedAt = Date.now()
      q.notified = []
      vol(s, volunteerId).status = 'busy'
      log(s, `🤝 ${vol(s, volunteerId).name} accepted ${res(s, q.residentId).name}'s request. Exact address shared privately.`, 'ok')
      return s
    })
  },

  /**
   * Volunteer marks the task done and leaves PRIVATE feedback about the visit.
   * feedback = { stars: 1-5, flags: ['lonely' | 'struggling' | 'unwell' | 'home-safety'] }
   * Resident ratings are coordinator-only and never affect access to emergency or medical help.
   */
  completeRequest(reqId, feedback = {}) {
    setState((s) => {
      const q = s.requests.find((x) => x.id === reqId)
      const v = vol(s, q.assignedTo)
      const r = res(s, q.residentId)
      const pts = POINTS_FOR_TYPE[q.type] ?? 10
      q.status = 'completed'
      q.completedAt = Date.now()
      q.points = pts
      q.volunteerFeedback = feedback
      v.points += pts
      v.completed += 1
      v.reliability = Math.min(100, v.reliability + 1)
      v.status = 'available'
      if (feedback.stars) { r.rating.sum += feedback.stars; r.rating.count += 1 }
      const bond = (r.bonds[v.id] ??= { visits: 0, starsSum: 0, rated: 0, favourite: false, since: 'today' })
      bond.visits += 1
      bond.lastVisit = Date.now()
      if (bond.visits === 3) log(s, `🤝 ${v.name.split(' ')[0]} and ${r.name.split(' ')[0]} have met 3 times — a regular connection is forming.`, 'bond')
      for (const flag of feedback.flags ?? []) r.flags.unshift({ t: Date.now(), by: v.name.split(' ')[0], flag })
      log(s, `🎉 ${v.name} completed the task: +${pts} points. Address access removed.`, 'ok')
      if (feedback.flags?.length) log(s, `💛 ${v.name.split(' ')[0]} noted ${r.name} may need more everyday support.`, 'support')
      return s
    })
  },

  /** Resident rates the volunteer (public to the community as an average). */
  rateVolunteer(reqId, stars, tags = []) {
    setState((s) => {
      const q = s.requests.find((x) => x.id === reqId)
      const v = vol(s, q.assignedTo)
      q.residentRating = { stars, tags }
      const r = res(s, q.residentId)
      const bond = r.bonds[v.id]
      if (bond) { bond.starsSum += stars; bond.rated += 1 }
      v.rating.sum += stars
      v.rating.count += 1
      // Reliability reflects verified completion + reviewed feedback (small nudge, never a big swing).
      v.reliability = Math.max(0, Math.min(100, Math.round(v.reliability + (stars - 4) * 0.5)))
      log(s, `⭐ ${r.name.split(' ')[0]} rated ${v.name.split(' ')[0]} ${stars}/5${tags.length ? ` (${tags.join(', ')})` : ''}.`)
      return s
    })
  },

  /** Phone channel: record a call (outbound check-in call or inbound hotline call). Returns the call id. */
  logCall({ residentId, direction, purpose, result, transcript = [] }) {
    const id = `call-${Date.now()}`
    setState((s) => {
      const r = res(s, residentId)
      s.calls.unshift({ id, t: Date.now(), residentId, direction, purpose, result, transcript })
      log(s, `☎️ ${direction === 'outbound' ? 'Check-in call to' : 'Hotline call from'} ${r.name}: ${result}.`, 'call')
      return s
    })
    return id
  },

  /** Hausnotruf: the resident pressed the wrist button (kind 'sos') or missed the daily "I'm OK" press. Returns alarm id. */
  hausnotrufAlarm(residentId, kind = 'sos') {
    const id = `alarm-${Date.now()}`
    setState((s) => {
      const r = res(s, residentId)
      s.alarms.unshift({ id, t: Date.now(), residentId, kind, status: 'incoming', steps: [{ t: Date.now(), text: kind === 'sos' ? 'Wrist button pressed' : 'Daily OK button not pressed by 10:00' }] })
      log(s, `🔴 Hausnotruf alarm from ${r.name} (${kind === 'sos' ? 'button pressed' : 'no daily OK press'}). Partner call centre is handling it.`, 'sos')
      return s
    })
    return id
  },

  /**
   * Hausnotruf call-centre operator (a HUMAN) acts on an alarm.
   * status: 'talking' | 'called-112' | 'keyholder-sent' | 'family-informed' | 'resolved'
   * The 112 call is always started by the operator — never automatically (§4 NotrufV). In the demo it is simulated.
   */
  hausnotrufUpdate(alarmId, status, stepText) {
    setState((s) => {
      const a = s.alarms.find((x) => x.id === alarmId)
      if (!a) return s
      a.status = status
      a.steps.push({ t: Date.now(), text: stepText })
      log(s, `📟 Hausnotruf (${res(s, a.residentId).name.split(' ')[0]}): ${stepText}`, status === 'called-112' ? 'sos' : 'info')
      return s
    })
  },

  // ---------------- Professional nursing layer (existing care services, not volunteers) ----------------

  /**
   * Request a professional nurse visit. Offered to the nearest nurse whose service area covers the resident,
   * who is accepting and has capacity today. Returns the visit id.
   * task: key of NURSE_TASKS ('wound' | 'injection' | 'vitals' | 'assessment' | 'telemed')
   */
  requestNurseVisit(residentId, { task, text = '', source = 'coordinator', withDoctor = task === 'telemed', by = null, medicalId = null } = {}) {
    const id = `nv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setState((s) => {
      const r = res(s, residentId)
      const visit = { id, residentId, task, text, source, withDoctor, by, nurseId: null, status: 'unassigned', time: null, declined: [], createdAt: Date.now() }
      s.nurseVisits.unshift(visit)
      offerToNextNurse(s, visit)
      if (medicalId) {
        const m = s.medicalQueue.find((x) => x.id === medicalId)
        if (m) { m.status = 'nurse'; m.nurseVisitId = id }
      }
      const n = s.nurses.find((x) => x.id === visit.nurseId)
      log(s, n
        ? `👩‍⚕️ Nurse visit for ${r.name} (${task}) offered to ${n.name}, ${n.service}.`
        : `⚠️ No nurse with free capacity covers ${r.name} today → coordinator / GP practice informed.`, 'nurse')
      return s
    })
    return id
  },

  /** The nurse (or her service's dispatcher) accepts or declines an offered visit. */
  nurseRespond(visitId, accept) {
    setState((s) => {
      const v = s.nurseVisits.find((x) => x.id === visitId)
      if (!v || v.status !== 'offered') return s
      const n = s.nurses.find((x) => x.id === v.nurseId)
      const r = res(s, v.residentId)
      if (accept) {
        n.booked += 1
        v.status = 'scheduled'
        v.time = slotTime(n)
        log(s, `✅ ${n.name} scheduled ${r.name.split(' ')[0]} today at ${v.time}.`, 'nurse')
      } else {
        v.declined.push(n.id)
        log(s, `${n.name} has no capacity → offered to the next nurse.`, 'nurse')
        offerToNextNurse(s, v)
      }
      return s
    })
  },

  /** Assisted tele-consult: nurse at the resident's home, doctor joins by video. */
  startTeleconsult(visitId) {
    setState((s) => {
      const v = s.nurseVisits.find((x) => x.id === visitId)
      if (!v) return s
      v.status = 'in-call'
      log(s, `📹 Tele-consult started for ${res(s, v.residentId).name}: nurse on site, doctor by video.`, 'nurse')
      return s
    })
  },

  completeNurseVisit(visitId, note = '') {
    setState((s) => {
      const v = s.nurseVisits.find((x) => x.id === visitId)
      if (!v) return s
      v.status = 'done'
      v.note = note
      v.doneAt = Date.now()
      const n = s.nurses.find((x) => x.id === v.nurseId)
      log(s, `🩺 ${n?.name ?? 'Nurse'} completed the visit for ${res(s, v.residentId).name}${note ? `: ${note}` : ''}.`, 'nurse')
      return s
    })
  },

  setNurseAccepting(nurseId, accepting) {
    setState((s) => {
      const n = s.nurses.find((x) => x.id === nurseId)
      n.accepting = accepting
      return s
    })
  },

  // ---------------- Village-hall consultation sites (legal route + room readiness) ----------------

  /** Tick / untick a room-readiness item for a village-hall day. */
  toggleRoomCheck(dayIndex, checkId) {
    setState((s) => {
      const site = s.rotation[dayIndex].site
      site.checks = site.checks.includes(checkId) ? site.checks.filter((c) => c !== checkId) : [...site.checks, checkId]
      return s
    })
  },

  /** Move a village-hall day through the approval steps: 'not-applied' → 'pending' (submitted to KV) → 'approved'. */
  setSiteStatus(dayIndex, status) {
    setState((s) => {
      const d = s.rotation[dayIndex]
      d.site.status = status
      const where = d.serviceDe?.split('· ')[1] ?? d.day
      const text = {
        pending: `📨 ${d.site.applicant} applied to KVB for a Filiale in ${where} (§24 Abs. 3 Ärzte-ZV, demo).`,
        approved: `✅ KVB approval for the Filiale in ${where} recorded (demo): in-person consultations can start.`,
        'not-applied': `↩️ ${where}: application withdrawn; the day runs as video + nurse at home.`,
      }[status]
      if (text) log(s, text, 'info')
      return s
    })
  },

  /** Resident marks / unmarks a volunteer as their preferred helper ("gern wieder"). */
  setFavourite(residentId, volunteerId, favourite) {
    setState((s) => {
      const r = res(s, residentId)
      const bond = (r.bonds[volunteerId] ??= { visits: 0, starsSum: 0, rated: 0, favourite: false, since: 'today' })
      bond.favourite = favourite
      if (favourite) log(s, `💛 ${r.name.split(' ')[0]} would like ${vol(s, volunteerId).name.split(' ')[0]} again next time.`, 'bond')
      return s
    })
  },

  /** Coordinator turns a support flag into regular everyday help. */
  setupWeeklyVisit(residentId) {
    setState((s) => {
      const r = res(s, residentId)
      r.flags = r.flags.map((f) => ({ ...f, handled: true }))
      r.weeklyVisit = true
      log(s, `📅 Coordinator set up a weekly visit for ${r.name}.`, 'support')
      return s
    })
  },

  setVolunteerStatus(volunteerId, status) {
    setState((s) => {
      vol(s, volunteerId).status = status
      return s
    })
  },

  redeem(volunteerId, rewardId) {
    setState((s) => {
      const v = vol(s, volunteerId)
      const rw = s.rewards.find((x) => x.id === rewardId)
      if (v.points < rw.cost) return s
      v.points -= rw.cost
      log(s, `🎁 ${v.name} redeemed "${rw.name}".`)
      return s
    })
  },

  bookSlot(dayIndex, slotIndex, residentId) {
    setState((s) => {
      const d = s.rotation[dayIndex]
      const slot = d.slots[slotIndex]
      if (slot.bookedBy) return s
      slot.bookedBy = residentId
      log(s, `📅 ${res(s, residentId).name} booked ${d.day} ${slot.time} with ${d.who}.`)
      return s
    })
  },

  answerMedical(id) {
    setState((s) => {
      const m = s.medicalQueue.find((x) => x.id === id)
      m.status = 'answered'
      log(s, `🩺 Doctor called back ${res(s, m.residentId).name}.`, 'medical')
      return s
    })
  },

  sos(residentId) {
    setState((s) => {
      log(s, `🚨 SOS from ${res(s, residentId).name} (SIMULATED — no real 112 call). Emergency contact notified.`, 'sos')
      return s
    })
  },
}
