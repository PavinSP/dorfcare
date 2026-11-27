// Volunteer matching: hard filters first, then a weighted score.
// Weights are prototype values, not a validated model.

export const WEIGHTS = { proximity: 0.35, reliability: 0.3, experience: 0.15, relationship: 0.2 }

/**
 * How strong the bond between a resident and a volunteer is (0–1).
 * Grows with visits (caps at 5), scaled by how the resident rated those visits,
 * plus a boost if the resident marked this volunteer as a preferred helper.
 */
export function bondStrength(bond) {
  if (!bond || !bond.visits) return 0
  const quality = bond.rated ? bond.starsSum / bond.rated / 5 : 0.8
  return Math.min(1, (Math.min(bond.visits, 5) / 5) * quality + (bond.favourite ? 0.3 : 0))
}

/** A pairing the resident rated poorly (avg ≤ 2★ over 2+ visits) is not offered again — safeguarding. */
export const isBlockedPair = (bond) => Boolean(bond && bond.rated >= 2 && bond.starsSum / bond.rated <= 2)
const MAX_RADIUS_KM = 3

const SKILL_FOR_TYPE = {
  transport: 'driving',
  accompany: 'driving',
  shopping: 'shopping',
  tech: 'tech',
  companionship: 'companionship',
  household: 'household',
  paperwork: 'paperwork',
  meals: null,
  other: null,
}

export function haversineKm(a, b) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1)} km`
}

/**
 * Returns eligible volunteers, best first, each with { km, score, breakdown, bond }.
 * `location` is the resident (lat/lng + optional bonds), so known helpers rank higher.
 */
export function rankVolunteers(volunteers, location, type, exclude = []) {
  const skill = SKILL_FOR_TYPE[type] ?? null
  const bonds = location.bonds ?? {}
  return volunteers
    .filter((v) => v.status === 'available' && v.verified && !exclude.includes(v.id))
    .filter((v) => !skill || v.skills.includes(skill))
    .filter((v) => !isBlockedPair(bonds[v.id]))
    .map((v) => {
      const km = haversineKm(v, location)
      const breakdown = {
        proximity: Math.max(0, 1 - km / MAX_RADIUS_KM),
        reliability: v.reliability / 100,
        experience: Math.min(v.completed, 20) / 20,
        relationship: bondStrength(bonds[v.id]),
      }
      const score =
        WEIGHTS.proximity * breakdown.proximity +
        WEIGHTS.reliability * breakdown.reliability +
        WEIGHTS.experience * breakdown.experience +
        WEIGHTS.relationship * breakdown.relationship
      return { ...v, km, score, breakdown, bond: bonds[v.id] ?? null }
    })
    .filter((v) => v.km <= MAX_RADIUS_KM)
    .sort((a, b) => b.score - a.score)
}

/** Top-n to notify — a preferred helper who is eligible is always among them. */
export function pickNotified(ranked, n = 3) {
  const top = ranked.slice(0, n)
  const fav = ranked.find((v) => v.bond?.favourite)
  if (fav && !top.includes(fav)) top[top.length - 1] = fav
  return top.map((v) => v.id)
}

// ---- Request understanding (simple keyword rules, German + English) ----

const RED_FLAGS = ['brust', 'chest', 'atem', 'breath', 'bewusst', 'unconscious', 'gestürzt', 'sturz', 'fell', 'fallen', 'blutet', 'blutung', 'bleed', 'schlaganfall', 'stroke', 'herzinfarkt', 'heart attack']

const RULES = [
  ['medical', ['blutdruck', 'blood pressure', 'schmerz', 'pain', 'fieber', 'fever', 'schwindel', 'dizzy', 'zucker', 'sugar', 'rezept', 'prescription']],
  ['accompany', ['begleit', 'accompany', 'come with me']],
  ['transport', ['fahr', 'drive', 'ride', 'lift', 'transport', 'termin', 'appointment', 'arzt', 'doctor']],
  ['shopping', ['einkauf', 'grocer', 'shop', 'supermarkt', 'apothek', 'pharmacy', 'medikament', 'medicine', 'brot', 'milch']],
  ['household', ['glühbirne', 'lampe', 'bulb', 'garten', 'garden', 'rasen', 'lawn', 'schwer', 'heavy', 'tragen', 'carry', 'putzen', 'clean', 'müll', 'bins', 'trash', 'schnee', 'snow', 'reparier', 'repair', 'fix']],
  ['paperwork', ['brief', 'letter', 'formular', 'behörde', 'finanzamt', 'rathaus', 'rechnung', 'bill', 'antrag', 'paperwork', 'krankenkasse', 'insurance']],
  ['meals', ['kochen', 'cook', 'mittagessen', 'abendessen', 'meal', 'lunch', 'dinner', 'warmes essen', 'hot food']],
  ['tech', ['handy', 'phone', 'computer', 'tablet', 'internet', 'fernseh', 'tv', 'whatsapp', 'video']],
  ['companionship', ['allein', 'lonely', 'alone', 'gesellschaft', 'reden', 'talk', 'spazier', 'walk', 'kaffee', 'company']],
]

export function classifyRequest(text) {
  const t = text.toLowerCase()
  if (RED_FLAGS.some((w) => t.includes(w))) return 'emergency'
  for (const [type, words] of RULES) if (words.some((w) => t.includes(w))) return type
  return 'other'
}

/** Deterministic offset (~100–200 m) so the map only ever shows an approximate area. */
export function approximate(loc, seed) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0
  const angle = (Math.abs(h) % 360) * (Math.PI / 180)
  const metres = 100 + (Math.abs(h) % 100)
  return {
    lat: loc.lat + (metres * Math.cos(angle)) / 111_320,
    lng: loc.lng + (metres * Math.sin(angle)) / (111_320 * Math.cos((loc.lat * Math.PI) / 180)),
  }
}
