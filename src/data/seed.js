// Real municipalities around Schweinfurt (Landkreis Schweinfurt), but ALL people, addresses, organisations,
// medical data and rewards are FICTIONAL demo data. Street addresses use "Musterstraße" on purpose.

export const REGION_NAME = 'Schweinfurt-Land'
export const REGION_CENTER = { lat: 50.035, lng: 10.215 } // between the five municipalities and Schweinfurt
export const VILLAGE_NAME = REGION_NAME // kept for older imports
export const VILLAGE_CENTER = REGION_CENTER

/**
 * The pilot cluster: five municipalities 4–12 km from Schweinfurt. Coordinates = OSM main-village centres; PLZ verified.
 * pop / age65 / age75: LfStat A1310C, 31 Dec 2025 (verified). kmToSW: straight line to Schweinfurt centre.
 */
export const MUNICIPALITIES = {
  werneck: { name: 'Werneck', plz: '97440', lat: 49.9816, lng: 10.1002, pop: 10056, age65: 2569, age75: 1114, kmToSW: 11.9 },
  dittelbrunn: { name: 'Dittelbrunn', plz: '97456', lat: 50.0778, lng: 10.2206, pop: 7460, age65: 1992, age75: 1001, kmToSW: 3.8 },
  schonungen: { name: 'Schonungen', plz: '97453', lat: 50.0504, lng: 10.3045, pop: 7575, age65: 1962, age75: 899, kmToSW: 5.1 },
  niederwerrn: { name: 'Niederwerrn', plz: '97464', lat: 50.0611, lng: 10.1821, pop: 8347, age65: 1905, age75: 926, kmToSW: 4.1 },
  gochsheim: { name: 'Gochsheim', plz: '97469', lat: 50.0191, lng: 10.2822, pop: 6082, age65: 1497, age75: 723, kmToSW: 4.5 },
}
export const SCHWEINFURT = { name: 'Schweinfurt', lat: 50.0451, lng: 10.2341 }

/** Volunteer search radius: start close, widen only if nobody suitable is free. */
export const MATCH_RADII_KM = [5, 10, 15]

// One phone number for everything — printed on the fridge card and the notice board. FICTIONAL demo number (09721 = Schweinfurt).
export const HOTLINE = { display: '09721 000 4711', note: 'Demo-Nummer · fiktiv' }

/** How a resident can reach DorfConnect. Most 80+ residents have a landline, not a smartphone. */
export const CHANNELS = {
  app: { de: 'App', en: 'App', icon: '📱' },
  landline: { de: 'Festnetz', en: 'Landline', icon: '☎️' },
  button: { de: 'Notrufknopf', en: 'Alarm button', icon: '🔴' },
  'in-person': { de: 'Persönlich', en: 'In person', icon: '🤝' },
  family: { de: 'Familie', en: 'Family', icon: '👪' },
  volunteer: { de: 'Über Helfer', en: 'Via volunteer', icon: '🙋' },
  coordinator: { de: 'Koordination', en: 'Coordinator', icon: '🧭' },
}

// Helper: place something `north` / `east` metres away from a municipality's centre (or Schweinfurt).
const at = (muni, north, east) => {
  const c = MUNICIPALITIES[muni] ?? SCHWEINFURT
  return {
    municipality: MUNICIPALITIES[muni] ? muni : null,
    lat: c.lat + north / 111_320,
    lng: c.lng + east / (111_320 * Math.cos((c.lat * Math.PI) / 180)),
  }
}
const addr = (muni, no) => `Musterstraße ${no}, ${MUNICIPALITIES[muni].plz} ${MUNICIPALITIES[muni].name}`

/**
 * Who does what. Volunteers never do medical tasks; nurses come from EXISTING mobile nursing services
 * (ambulante Pflegedienste / Sozialstationen) and GP practices (NäPA/VERAH); emergencies always go to 112.
 */
export const CARE_ROUTING = [
  { task: 'Collect medication', taskDe: 'Medikamente abholen', who: 'volunteer' },
  { task: "Drive to a doctor's appointment", taskDe: 'Fahrt zum Arzttermin', who: 'volunteer' },
  { task: 'Companionship, shopping, household', taskDe: 'Gesellschaft, Einkauf, Haushalt', who: 'volunteer' },
  { task: 'Wound dressing', taskDe: 'Verbandswechsel', who: 'nurse' },
  { task: 'Prescribed nursing procedures (injections, vitals)', taskDe: 'Ärztlich verordnete Pflege (Spritzen, Vitalwerte)', who: 'nurse' },
  { task: 'Assisted tele-consultation', taskDe: 'Assistierte Videosprechstunde', who: 'nurse+doctor' },
  { task: 'Diagnosis and prescriptions', taskDe: 'Diagnose und Rezepte', who: 'doctor' },
  { task: 'Life-threatening emergency', taskDe: 'Lebensbedrohlicher Notfall', who: '112' },
]

/**
 * What a village hall needs before a practice applies to KVB for a Filiale there (§24 Abs. 3 Ärzte-ZV).
 * Based on KVB's Filiale form and Präsenzpflicht leaflet; items marked "confirm" still need KVB / Landratsamt.
 */
/** Bavarian professional code (BO §17 Abs. 2): a doctor may work in at most two further practices (Filialen). */
export const MAX_FILIALEN_PER_DOCTOR = 2

export const ROOM_CHECKS = [
  { id: 'room', en: 'Own lockable consultation room, private conversations possible', de: 'Eigener abschließbarer Behandlungsraum, vertrauliche Gespräche möglich' },
  { id: 'separate', en: 'Clearly separate practice area with a sign showing the consultation hours', de: 'Klar abgegrenzter Praxisbereich mit Praxisschild und Sprechzeiten' },
  { id: 'hygiene', en: 'Hygiene plan, hand-wash basin with dispensers, wipeable surfaces (confirm MedHygV with KVB hygiene advice)', de: 'Hygieneplan, Handwaschbecken mit Spendern, wischbare Flächen (MedHygV mit KVB-Hygieneberatung klären)' },
  { id: 'access', en: 'Step-free access (to confirm with the Landratsamt)', de: 'Barrierefreier Zugang (mit dem Landratsamt klären)' },
  { id: 'use', en: 'Landratsamt checked the change of use of the room (BayBO)', de: 'Landratsamt hat die Nutzungsänderung geprüft (BayBO)' },
  { id: 'it', en: 'Secure internet for practice software / telematics; lockable storage', de: 'Sicheres Internet für Praxissoftware / Telematik; abschließbarer Schrank' },
]

/** Professional tasks handled by nurses (never offered to volunteers, never rewarded with points). */
export const NURSE_TASKS = {
  wound: { en: 'Wound dressing', de: 'Verbandswechsel' },
  injection: { en: 'Prescribed injection / medication', de: 'Verordnete Spritze / Medikation' },
  vitals: { en: 'Blood pressure & vitals check', de: 'Blutdruck & Vitalwerte' },
  assessment: { en: 'Home assessment (e.g. after a fall)', de: 'Hausbesuch zur Einschätzung (z. B. nach Sturz)' },
  telemed: { en: 'Assisted tele-consult (nurse on site + remote doctor)', de: 'Assistierte Videosprechstunde (Pflege vor Ort + Arzt per Video)' },
}

export const POINTS_FOR_TYPE = {
  shopping: 10,
  tech: 10,
  companionship: 15,
  accompany: 20,
  transport: 30,
  household: 15,
  paperwork: 15,
  meals: 15,
  other: 10,
}

export const TYPE_LABEL = {
  shopping: 'Groceries / pharmacy',
  tech: 'Phone & tech help',
  companionship: 'Companionship visit',
  accompany: 'Accompany to doctor',
  transport: 'Ride / transport',
  household: 'Household & garden',
  paperwork: 'Letters & paperwork',
  meals: 'Meals & cooking',
  other: 'General help',
  medical: 'Medical question (→ nurse/doctor)',
}

export const initialState = {
  volunteers: [
    // Hero volunteers used in the pitch story
    { id: 'anna', name: 'Anna Weber', ...at('werneck', 600, -700), status: 'available', verified: true, reliability: 96, completed: 12, points: 250, skills: ['driving', 'shopping', 'companionship', 'household'], rating: { sum: 59, count: 12 } },
    { id: 'thomas', name: 'Thomas Müller', ...at('niederwerrn', 250, 300), status: 'available', verified: true, reliability: 92, completed: 8, points: 160, skills: ['driving', 'tech', 'household', 'paperwork'], rating: { sum: 37, count: 8 } },
    { id: 'sophie', name: 'Sophie Fischer', ...at('schonungen', -300, -200), status: 'available', verified: true, reliability: 98, completed: 20, points: 410, skills: ['shopping', 'companionship', 'tech', 'paperwork'], rating: { sum: 99, count: 20 } },
    { id: 'lukas', name: 'Lukas Hoffmann', ...at('gochsheim', 200, -300), status: 'busy', verified: true, reliability: 89, completed: 5, points: 90, skills: ['driving', 'shopping', 'household'], rating: { sum: 22, count: 5 } },
    { id: 'jonas', name: 'Jonas Wagner', ...at('dittelbrunn', 300, 200), status: 'available', verified: false, reliability: 70, completed: 0, points: 0, skills: ['tech'], rating: { sum: 0, count: 0 } },
    // The wider network across the five municipalities (fictional)
    ...[
      ['petra', 'Petra Lang', 'dittelbrunn', -200, -350, ['shopping', 'companionship'], 'available', 88, 6],
      ['karl', 'Karl Schmitt', 'dittelbrunn', 450, -100, ['driving', 'household'], 'offline', 85, 9],
      ['mia', 'Mia Becker', 'niederwerrn', -350, -250, ['tech', 'paperwork'], 'available', 90, 4],
      ['ralf', 'Ralf Zimmermann', 'niederwerrn', 100, -600, ['driving'], 'busy', 87, 11],
      ['ute', 'Ute Krämer', 'schonungen', 400, 350, ['companionship', 'meals', 'shopping'], 'available', 91, 7],
      ['ben', 'Ben Hartmann', 'schonungen', -100, 650, ['driving', 'tech'], 'offline', 84, 3],
      ['ingrid', 'Ingrid Schulz', 'gochsheim', -250, 250, ['companionship', 'paperwork'], 'available', 93, 14],
      ['felix', 'Felix Koch', 'gochsheim', 350, 450, ['driving', 'household'], 'available', 86, 5],
      ['laura', 'Laura Richter', 'werneck', -800, 900, ['tech', 'paperwork'], 'available', 83, 2],
      ['hans', 'Hans Wolf', 'werneck', 1200, 300, ['driving'], 'offline', 88, 8],
      ['greta', 'Greta Neumann', 'werneck', -600, -900, ['driving', 'companionship', 'shopping'], 'available', 87, 3],
    ].map(([id, name, muni, n, e, skills, status, reliability, completed]) => ({
      id, name, ...at(muni, n, e), status, verified: true, reliability, completed, points: completed * 15, skills,
      rating: { sum: Math.round(completed * 4.6), count: completed },
    })),
  ],

  residents: [
    {
      id: 'maria', name: 'Maria Schneider', age: 82, ...at('werneck', 150, -250),
      address: addr('werneck', 12), phone: '+49 151 0000 0012',
      emergencyContact: 'Peter Schneider (son) · +49 170 0000 0099',
      medical: 'Heart failure, type 2 diabetes · Metformin, Ramipril · Allergy: penicillin',
      medicalDe: 'Herzinsuffizienz, Diabetes Typ 2 · Metformin, Ramipril · Allergie: Penicillin',
      lastCheckIn: null,
      support: 'Lives alone · daily check-in',
      rating: { sum: 29, count: 6 }, flags: [],
      bonds: { anna: { visits: 4, starsSum: 20, rated: 4, favourite: true, since: 'September' } },
      devices: { smartphone: true, landline: true, alarmButton: false },
      family: [{ id: 'peter', name: 'Peter Schneider', relation: 'son', relationDe: 'Sohn', city: 'München', consent: true }],
    },
    {
      id: 'helmut', name: 'Helmut Bauer', age: 79, ...at('niederwerrn', -100, 50),
      address: addr('niederwerrn', 3), phone: '+49 151 0000 0003',
      emergencyContact: 'Erika Bauer (daughter)', medical: 'Hypertension', medicalDe: 'Bluthochdruck',
      lastCheckIn: 'today-ok', lastCheckInVia: 'button', lastCheckInAt: Date.now() - 45 * 60000, // pressed his daily OK button
      support: 'Lives with wife · daily check-in',
      rating: { sum: 14, count: 3 }, flags: [],
      bonds: { thomas: { visits: 2, starsSum: 9, rated: 2, favourite: false, since: 'October' } },
      devices: { smartphone: false, landline: true, alarmButton: true },
      hausnotruf: { keyHolder: 'thomas' }, // neighbour volunteer who holds a spare key
      family: [{ id: 'erika', name: 'Erika Bauer', relation: 'daughter', relationDe: 'Tochter', city: 'Frankfurt', consent: true }],
    },
    {
      id: 'gertrud', name: 'Gertrud Klein', age: 86, ...at('schonungen', 200, 100),
      address: addr('schonungen', 7), phone: '+49 151 0000 0007',
      emergencyContact: 'Nachbarin Frau Roth', medical: 'COPD', medicalDe: 'COPD',
      lastCheckIn: null, // will show as "missed check-in" on the community dashboard
      support: 'Lives alone · daily check-in',
      rating: { sum: 9, count: 2 },
      flags: [{ t: Date.now() - 3 * 86400000, by: 'Sophie', flag: 'struggling' }],
      bonds: {}, // nobody regular yet → shows up as an isolation risk for the coordinator
      devices: { smartphone: false, landline: true, alarmButton: true }, // no smartphone at all
      hausnotruf: { keyHolder: 'sophie' },
      family: [],
    },
    {
      // Not elderly: everyday support for anyone who is struggling for a while.
      id: 'katrin', name: 'Katrin Hofmann', age: 41, ...at('werneck', -400, 500),
      address: addr('werneck', 21), phone: '+49 151 0000 0021',
      emergencyContact: 'Markus Hofmann (husband) · +49 170 0000 0021',
      medical: 'Recovering from knee surgery (6 weeks on crutches)',
      medicalDe: 'Erholung nach Knie-OP (6 Wochen auf Krücken)',
      lastCheckIn: 'today-ok',
      support: 'Temporary support · 6 weeks after surgery · 2 kids',
      rating: { sum: 10, count: 2 }, flags: [],
      bonds: { sophie: { visits: 1, starsSum: 5, rated: 1, favourite: false, since: 'November' } },
      devices: { smartphone: true, landline: false, alarmButton: false },
      family: [],
    },
  ],

  facilities: [
    { id: 'sw-hub', kind: 'clinic', name: 'Schweinfurt — hospital & specialist practices', ...at('__sw', 0, 0) },
    { id: 'gh-werneck', kind: 'clinic', name: 'Gemeindehaus Werneck — rotating doctor room (Mon)', ...at('werneck', 50, 0) },
    { id: 'gh-schonungen', kind: 'clinic', name: 'Gemeindehaus Schonungen — rotating doctor room (Wed)', ...at('schonungen', 30, 0) },
    { id: 'gh-gochsheim', kind: 'clinic', name: 'Gemeindehaus Gochsheim — rotating doctor room (Fri)', ...at('gochsheim', 20, 0) },
  ],

  /**
   * Nurses from EXISTING providers (fictional names): mobile nursing services and a GP practice's NäPA.
   * They get professional requests (paid via care/health insurance or contract), never volunteer notifications or points.
   */
  nurses: [
    { id: 'lena', name: 'Lena Vogt', qualification: 'Pflegefachfrau', service: 'Pflegeteam Main-Wern (Demo)', ...at('werneck', -150, 200), serviceAreaKm: 9, hours: 'Mo–Fr 07:00–15:00', capacity: 8, booked: 6, accepting: true },
    { id: 'jana', name: 'Jana Roth', qualification: 'Pflegefachfrau', service: 'Ambulante Pflege Lauertal (Demo)', ...at('niederwerrn', 300, -200), serviceAreaKm: 8, hours: 'Mo–Sa 06:30–14:30', capacity: 9, booked: 8, accepting: true },
    { id: 'markus', name: 'Markus Ehrlich', qualification: 'Gesundheits- und Krankenpfleger', service: 'Sozialdienst Maintal (Demo)', ...at('schonungen', -200, 300), serviceAreaKm: 8, hours: 'Mo–Fr 07:00–16:00', capacity: 8, booked: 5, accepting: true },
    { id: 'aylin', name: 'Aylin Demir', qualification: 'Pflegefachfrau', service: 'Pflege daheim Gochsheim (Demo)', ...at('gochsheim', -150, -150), serviceAreaKm: 8, hours: 'Mo–Fr 08:00–16:00', capacity: 7, booked: 7, accepting: false },
    { id: 'mehmet', name: 'Mehmet Aydın', qualification: 'NäPA (GP practice)', service: 'Hausarztpraxis Dr. Keller (Demo), Dittelbrunn', ...at('dittelbrunn', -100, 100), serviceAreaKm: 10, hours: 'Mo, Di, Do 08:00–13:00', capacity: 5, booked: 2, accepting: true },
  ],
  // Professional visits: { id, residentId, task (NURSE_TASKS key), text, nurseId, status: 'offered'|'scheduled'|'in-call'|'done'|'unassigned', time, source, withDoctor, declined[], createdAt, note }
  nurseVisits: [
    { id: 'nv-seed-1', residentId: 'helmut', task: 'vitals', text: 'Weekly blood pressure check (prescribed)', nurseId: 'jana', status: 'scheduled', time: '11:30', source: 'doctor', withDoctor: false, declined: [], createdAt: Date.now() - 86400000 },
  ],

  // The doctor comes to the villages: each day a different municipality's Gemeindehaus (or video).
  // site.route: 'branch' = Filiale under §24 Abs. 3 Ärzte-ZV: the PRACTICE/MVZ applies, KVB approves before the first patient.
  //   'video' (practice needs KVB video approval; ≤50% exclusively-video cases per quarter), 'home-visits' (no site approval).
  // Each doctor holds at most 2 Filialen (BO §17 Abs. 2) → villages are shared between doctors / an MVZ.
  // site.status: 'not-applied' | 'pending' | 'approved' | 'not-needed'. DEMO statuses — no real application exists.
  rotation: [
    { day: 'Monday', who: 'Dr. Keller (GP, Dittelbrunn)', place: 'werneck', service: 'In person · Gemeindehaus Werneck', serviceDe: 'Vor Ort · Gemeindehaus Werneck', slots: slots(['helmut']),
      site: { route: 'branch', status: 'pending', applicant: 'Hausarztpraxis Dr. Keller (Demo)', doctor: 'keller', checks: ['room', 'separate', 'hygiene', 'access', 'use', 'it'] } },
    { day: 'Tuesday', who: 'Dr. Yilmaz (remote)', place: null, service: 'Video consultation (a nurse can assist at home)', serviceDe: 'Videosprechstunde (Pflege kann vor Ort assistieren)', slots: slots([]),
      site: { route: 'video', status: 'not-needed', checks: [] } },
    { day: 'Wednesday', who: 'Dr. Braun (Schweinfurt)', place: 'schonungen', service: 'In person · Gemeindehaus Schonungen', serviceDe: 'Vor Ort · Gemeindehaus Schonungen', slots: slots(['gertrud', 'helmut']),
      site: { route: 'branch', status: 'approved', applicant: 'Praxis Dr. Braun (Demo), Schweinfurt', doctor: 'braun', checks: ['room', 'separate', 'hygiene', 'access', 'use', 'it'] } },
    { day: 'Thursday', who: 'Mehmet Aydın (NäPA, delegated)', place: null, service: 'Delegated home visits for the GP practice', serviceDe: 'Delegierte Hausbesuche für die Hausarztpraxis', slots: slots([]),
      site: { route: 'home-visits', status: 'not-needed', checks: [] } },
    { day: 'Friday', who: 'Dr. Sommer (Schweinfurt)', place: 'gochsheim', service: 'In person · Gemeindehaus Gochsheim', serviceDe: 'Vor Ort · Gemeindehaus Gochsheim', slots: slots([]),
      site: { route: 'branch', status: 'not-applied', applicant: 'MVZ Schweinfurt-Land (Demo)', doctor: 'sommer', checks: ['room', 'access', 'it'] } },
  ],

  rewards: [
    { id: 'cafe', name: 'Café Linde — free coffee & cake', cost: 100, sponsor: 'Café Linde' },
    { id: 'market', name: '€5 supermarket voucher', cost: 150, sponsor: 'Dorfladen' },
    { id: 'event', name: 'Village festival ticket', cost: 200, sponsor: 'Your municipality (example)' },
    { id: 'cert', name: 'Volunteer of the month certificate', cost: 300, sponsor: 'Mayor (example)' },
  ],

  // Human village coordinator ("Dorfkümmerin") — answers the hotline, logs requests on behalf, runs the drop-in hour.
  coordinator: { name: 'Sabine Kraus', role: 'Dorfkümmerin (coordinator)' },
  dropIn: { day: 'Wednesday', dayDe: 'Mittwoch', time: '10:00–12:00', place: 'Gemeindehaus Schonungen', note: 'Same morning as the rotating doctor' },

  requests: [],
  medicalQueue: [],
  calls: [], // phone calls: { id, t, residentId, direction: 'outbound'|'inbound', purpose: 'checkin'|'help', result, transcript }
  alarms: [], // Hausnotruf alarms: { id, t, residentId, kind: 'sos'|'no-daily-press', status, steps: [{t, text}] }
  log: [{ t: Date.now(), text: 'Demo started. Network: 5 municipalities around Schweinfurt, 16 volunteers, 5 nurses from existing care services.' }],
}

function slots(preBooked) {
  return ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'].map((time, i) => ({
    time,
    bookedBy: preBooked[i] ?? null,
  }))
}
