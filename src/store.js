// Shared demo state. Saved in localStorage and synced across browser tabs/windows,
// so you can open "Resident" in one window and "Volunteer" in another and watch it live.
// To go multi-device later, swap setState/subscribe for Supabase Realtime.

import { useSyncExternalStore } from 'react'
import { initialState, POINTS_FOR_TYPE } from './data/seed'
import { approximate, rankVolunteers } from './lib/matching'

const KEY = 'dorfconnect-state-v2'
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

const log = (s, text, kind = 'info') => s.log.unshift({ t: Date.now(), text, kind })
const vol = (s, id) => s.volunteers.find((v) => v.id === id)
const res = (s, id) => s.residents.find((r) => r.id === id)

export const actions = {
  reset() {
    setState(() => fresh())
  },

  checkIn(residentId) {
    setState((s) => {
      const r = res(s, residentId)
      r.lastCheckIn = 'today-ok'
      log(s, `✅ ${r.name} checked in: doing well.`, 'ok')
      return s
    })
  },

  createRequest(residentId, text, type) {
    let id
    setState((s) => {
      const r = res(s, residentId)
      id = `req-${Date.now()}`
      r.lastCheckIn = 'today-help'
      if (type === 'medical') {
        s.medicalQueue.unshift({ id, residentId, text, createdAt: Date.now(), status: 'waiting' })
        log(s, `🩺 ${r.name} asked a medical question → routed to nurse/doctor queue.`, 'medical')
        return s
      }
      const ranked = rankVolunteers(s.volunteers, r, type)
      const notified = ranked.slice(0, 3).map((v) => v.id)
      s.requests.unshift({
        id, residentId, text, type,
        approx: approximate(r, r.id),
        createdAt: Date.now(),
        status: notified.length ? 'open' : 'escalated',
        notified, declined: [], assignedTo: null,
      })
      log(
        s,
        notified.length
          ? `🙋 ${r.name} needs help (${type}). Notified ${notified.map((n) => vol(s, n).name.split(' ')[0]).join(', ')}.`
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
        const next = rankVolunteers(s.volunteers, r, q.type, q.declined).slice(0, 3).map((v) => v.id)
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

  completeRequest(reqId) {
    setState((s) => {
      const q = s.requests.find((x) => x.id === reqId)
      const v = vol(s, q.assignedTo)
      const pts = POINTS_FOR_TYPE[q.type] ?? 10
      q.status = 'completed'
      q.completedAt = Date.now()
      q.points = pts
      v.points += pts
      v.completed += 1
      v.reliability = Math.min(100, v.reliability + 1)
      v.status = 'available'
      log(s, `🎉 ${v.name} completed the task: +${pts} points. Address access removed.`, 'ok')
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
