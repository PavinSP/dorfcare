// Volunteer matching: hard filters first, then a weighted score.
// Weights are prototype values, not a validated model.

export const WEIGHTS = { proximity: 0.4, reliability: 0.35, experience: 0.25 }
const MAX_RADIUS_KM = 3

const SKILL_FOR_TYPE = {
  transport: 'driving',
  accompany: 'driving',
  shopping: 'shopping',
  tech: 'tech',
  companionship: 'companionship',
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

/** Returns eligible volunteers, best first, each with { km, score, breakdown }. */
export function rankVolunteers(volunteers, location, type, exclude = []) {
  const skill = SKILL_FOR_TYPE[type] ?? null
  return volunteers
    .filter((v) => v.status === 'available' && v.verified && !exclude.includes(v.id))
    .filter((v) => !skill || v.skills.includes(skill))
    .map((v) => {
      const km = haversineKm(v, location)
      const breakdown = {
        proximity: Math.max(0, 1 - km / MAX_RADIUS_KM),
        reliability: v.reliability / 100,
        experience: Math.min(v.completed, 20) / 20,
      }
      const score =
        WEIGHTS.proximity * breakdown.proximity +
        WEIGHTS.reliability * breakdown.reliability +
        WEIGHTS.experience * breakdown.experience
      return { ...v, km, score, breakdown }
    })
    .filter((v) => v.km <= MAX_RADIUS_KM)
    .sort((a, b) => b.score - a.score)
}

// ---- Request understanding (simple keyword rules, German + English) ----

const RED_FLAGS = ['brust', 'chest', 'atem', 'breath', 'bewusst', 'unconscious', 'gestürzt', 'sturz', 'fell', 'fallen', 'blutet', 'blutung', 'bleed', 'schlaganfall', 'stroke', 'herzinfarkt', 'heart attack']

const RULES = [
  ['medical', ['blutdruck', 'blood pressure', 'schmerz', 'pain', 'fieber', 'fever', 'schwindel', 'dizzy', 'zucker', 'sugar', 'rezept', 'prescription']],
  ['accompany', ['begleit', 'accompany', 'come with me']],
  ['transport', ['fahr', 'drive', 'ride', 'lift', 'transport', 'termin', 'appointment', 'arzt', 'doctor']],
  ['shopping', ['einkauf', 'grocer', 'shop', 'supermarkt', 'apothek', 'pharmacy', 'medikament', 'medicine', 'brot', 'milch']],
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
