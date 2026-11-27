// ALL people, addresses, medical data and rewards here are FICTIONAL demo data.
// Change VILLAGE_CENTER to move the whole demo to another village.

export const VILLAGE_NAME = 'Lindenbach'
export const VILLAGE_CENTER = { lat: 49.8697, lng: 9.9045 }

// Helper: place something `north` / `east` metres away from the village centre.
const at = (north, east) => ({
  lat: VILLAGE_CENTER.lat + north / 111_320,
  lng: VILLAGE_CENTER.lng + east / (111_320 * Math.cos((VILLAGE_CENTER.lat * Math.PI) / 180)),
})

export const POINTS_FOR_TYPE = {
  shopping: 10,
  tech: 10,
  companionship: 15,
  accompany: 20,
  transport: 30,
  other: 10,
}

export const TYPE_LABEL = {
  shopping: 'Groceries / pharmacy',
  tech: 'Phone & tech help',
  companionship: 'Companionship visit',
  accompany: 'Accompany to doctor',
  transport: 'Ride / transport',
  other: 'General help',
  medical: 'Medical question (→ nurse/doctor)',
}

export const initialState = {
  volunteers: [
    { id: 'anna', name: 'Anna Weber', ...at(250, -300), status: 'available', verified: true, reliability: 96, completed: 12, points: 250, skills: ['driving', 'shopping', 'companionship'] },
    { id: 'thomas', name: 'Thomas Müller', ...at(150, 650), status: 'available', verified: true, reliability: 92, completed: 8, points: 160, skills: ['driving', 'tech'] },
    { id: 'sophie', name: 'Sophie Fischer', ...at(-700, -150), status: 'available', verified: true, reliability: 98, completed: 20, points: 410, skills: ['shopping', 'companionship', 'tech'] },
    { id: 'lukas', name: 'Lukas Hoffmann', ...at(-150, -900), status: 'busy', verified: true, reliability: 89, completed: 5, points: 90, skills: ['driving', 'shopping'] },
    { id: 'jonas', name: 'Jonas Wagner', ...at(900, 400), status: 'available', verified: false, reliability: 70, completed: 0, points: 0, skills: ['tech'] },
  ],

  residents: [
    {
      id: 'maria', name: 'Maria Schneider', age: 82, ...at(-80, 120),
      address: 'Hauptstraße 12, 97999 Lindenbach', phone: '+49 151 0000 0012',
      emergencyContact: 'Peter Schneider (son) · +49 170 0000 0099',
      medical: 'Heart failure, type 2 diabetes · Metformin, Ramipril · Allergy: penicillin',
      lastCheckIn: null,
    },
    {
      id: 'helmut', name: 'Helmut Bauer', age: 79, ...at(400, 300),
      address: 'Kirchweg 3, 97999 Lindenbach', phone: '+49 151 0000 0003',
      emergencyContact: 'Erika Bauer (daughter)', medical: 'Hypertension',
      lastCheckIn: 'today-ok',
    },
    {
      id: 'gertrud', name: 'Gertrud Klein', age: 86, ...at(-450, 500),
      address: 'Am Bach 7, 97999 Lindenbach', phone: '+49 151 0000 0007',
      emergencyContact: 'Nachbarin Frau Roth', medical: 'COPD',
      lastCheckIn: null, // will show as "missed check-in" on the community dashboard
    },
  ],

  facilities: [
    { id: 'gemeindehaus', kind: 'clinic', name: 'Gemeindehaus — rotating doctor room', ...at(30, -40) },
    { id: 'nurse', kind: 'nurse', name: 'Pflegedienst — visiting nurse station', ...at(-300, -500) },
    { id: 'pharmacy', kind: 'clinic', name: 'Apotheke (neighbouring village)', ...at(1100, -1200) },
  ],

  rotation: [
    { day: 'Monday', who: 'Dr. Keller (Village B)', service: 'In-person, Gemeindehaus', slots: slots(['helmut']) },
    { day: 'Tuesday', who: 'Dr. Yilmaz (remote)', service: 'Video consultation', slots: slots([]) },
    { day: 'Wednesday', who: 'Dr. Braun (Würzburg)', service: 'In-person, Gemeindehaus', slots: slots(['gertrud', 'helmut']) },
    { day: 'Thursday', who: 'Nurse Lena Vogt', service: 'Delegated care / home visits', slots: slots([]) },
    { day: 'Friday', who: 'Dr. Sommer (Village C)', service: 'In-person, Gemeindehaus', slots: slots([]) },
  ],

  rewards: [
    { id: 'cafe', name: 'Café Linde — free coffee & cake', cost: 100, sponsor: 'Café Linde' },
    { id: 'market', name: '€5 supermarket voucher', cost: 150, sponsor: 'Dorfladen' },
    { id: 'event', name: 'Village festival ticket', cost: 200, sponsor: 'Gemeinde Lindenbach' },
    { id: 'cert', name: 'Volunteer of the month certificate', cost: 300, sponsor: 'Bürgermeister' },
  ],

  requests: [],
  medicalQueue: [],
  log: [{ t: Date.now(), text: 'Demo started. 3 volunteers available in Lindenbach.' }],
}

function slots(preBooked) {
  return ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'].map((time, i) => ({
    time,
    bookedBy: preBooked[i] ?? null,
  }))
}
