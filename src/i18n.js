// Tiny i18n: German + English. Language is per browser tab (sessionStorage),
// so you can show Maria in German and the volunteer in English side by side.

import { useSyncExternalStore } from 'react'

const KEY = 'dorfconnect-lang'
const listeners = new Set()
let lang = (() => {
  try { return sessionStorage.getItem(KEY) || 'de' } catch { return 'de' }
})()

export function setLang(l) {
  lang = l
  try { sessionStorage.setItem(KEY, l) } catch { /* ignore */ }
  listeners.forEach((f) => f())
}

export function useLang() {
  const l = useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => lang)
  const t = (key, vars = {}) => {
    const s = STRINGS[l]?.[key] ?? STRINGS.en[key] ?? key
    return typeof s === 'string' ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '') : s
  }
  return { lang: l, t, speechLang: l === 'de' ? 'de-DE' : 'en-GB', locale: l === 'de' ? 'de-DE' : 'en-GB' }
}

const STRINGS = {
  de: {
    greeting: 'Guten Morgen, {name}! 👋',
    howAreYou: 'Wie geht es Ihnen heute?',
    checkedIn: '✅ Danke! Ihre Familie sieht, dass es Ihnen heute gut geht.',
    looking: '⏳ Wir suchen eine Hilfe…',
    askedN: '{n} vertrauenswürdige Helfer in der Nähe wurden gefragt. Ihre Adresse bleibt privat.',
    escalated: '📞 Gerade ist niemand frei — die Dorf-Koordinatorin ruft Sie an.',
    coming: '🤝 {name} kommt, um zu helfen!',
    comingMeta: '{type} · {dist} entfernt · Zuverlässigkeit {rel}/100 · ✔ verifiziert',
    helpedYou: '🎉 {name} hat Ihnen heute geholfen. Ein Dankeschön wurde gesendet!',
    medWaiting: '🩺 Eine Pflegekraft oder ein Arzt ruft Sie heute zurück.',
    medAnswered: '🩺 Der Arzt hat Sie zurückgerufen.',
    appointment: '📅 Termin: {a}',
    btnWell: '😊 Mir geht es gut',
    btnHelp: '🎙️ Ich brauche Hilfe',
    btnCompanion: '💬 Mit Schwester Clara plaudern',
    btnDoctor: '📅 Arzttermin finden',
    btnSos: '📞 SOS — Notfall',
    back: '← Zurück',
    helpTitle: 'Wobei brauchen Sie Hilfe?',
    listening: 'Ich höre zu…',
    tapSpeak: 'Tippen & sprechen',
    typeBelow: 'Unten tippen',
    typeHere: '…oder hier tippen',
    quick: [
      ['🛒', 'Einkaufen', 'Ich brauche Hilfe beim Einkaufen, Milch und Brot.'],
      ['🚗', 'Fahrt zum Arzt', 'Ich brauche eine Fahrt zum Arzttermin am Montag.'],
      ['📱', 'Handy', 'Mein Handy funktioniert nicht, ich kann keine Videoanrufe machen.'],
      ['☕', 'Gesellschaft', 'Ich bin heute allein und würde gern reden.'],
    ],
    emergencyTitle: '⚠️ Das klingt nach einem Notfall.',
    emergencyBody: 'Notfälle gehen direkt an die 112, nicht an Helfer.',
    understoodAs: 'Verstanden als:',
    medicalNote: ' — eine Pflegekraft oder ein Arzt ruft Sie zurück (kein Helfer).',
    consent: 'Meine genaue Adresse nur mit der Person teilen, die annimmt. Wird danach gelöscht.',
    submit: 'Hilfe anfragen',
    doctorsTitle: 'Ärzte diese Woche',
    doctorsSub: 'Ärzte aus Nachbarorten kommen abwechselnd in unser Gemeindehaus.',
    fullyBooked: 'Ausgebucht',
    simulation: 'Simulation — es wird kein echter Anruf getätigt',
    calling: '📞 Rufe 112 an…',
    noSpeak: 'Sie müssen nicht sprechen. Ihre Daten werden vorgelesen.',
    rName: 'Name', rAddress: 'Adresse', rLocation: 'Standort', rMedical: 'Medizinisch', rContact: 'Notfallkontakt',
    notified: 'benachrichtigt ✔',
    replay: '🔊 Ansage wiederholen',
    cancelOk: 'Abbrechen — mir geht es gut',
    sosLegal: 'In echt: Anbindung an 112, AML-Standort und nora-App braucht eine Freigabe. §4 NotrufV verlangt eine menschliche Handlung zum Start eines Notrufs — das Drücken von SOS ist diese Handlung. Helfer verzögern nie den Rettungsdienst.',
    announcement: 'Automatische Notfallmeldung. Patientin: {name}, {age} Jahre. Adresse: {address}. Vorerkrankungen: {medical}. Notfallkontakt: {contact}. Die Patientin kann eventuell nicht sprechen.',
    phoneCaption: 'Ansicht Bewohnerin · große Schrift, Sprache zuerst, läuft auf jedem Smartphone',
    // companion
    cTitle: 'Schwester Clara',
    cSub: 'Ihre KI-Begleiterin zum Plaudern — keine Ärztin.',
    cStart: '🎙️ Gespräch beginnen',
    cEnd: 'Gespräch beenden',
    cConnecting: 'Verbinde…',
    cSpeaking: 'Clara spricht…',
    cListening: 'Clara hört zu…',
    cIdle: 'Tippen Sie auf „Gespräch beginnen“',
    cSafety: 'Clara gibt nur allgemeine, sichere Tipps. Sie stellt keine Diagnosen und ändert keine Medikamente. Bei Notfall immer SOS.',
    cSosBanner: '⚠️ Das klingt ernst. Bitte drücken Sie jetzt SOS.',
    cVolunteer: '🙋 Clara hat eine Helferin für Sie angefragt.',
    cDemo: 'Demo-Modus · offline, ohne ElevenLabs-Agent',
    cLive: 'Live · ElevenLabs Voice Agent',
    cType: 'Nachricht schreiben…',
    cSend: 'Senden',
    cError: 'Verbindung fehlgeschlagen: {msg}',
  },
  en: {
    greeting: 'Good morning, {name}! 👋',
    howAreYou: 'How are you feeling today?',
    checkedIn: "✅ Thank you! Your family can see you're doing well today.",
    looking: '⏳ Looking for a helper…',
    askedN: '{n} trusted volunteers nearby were asked. Your address stays private.',
    escalated: '📞 No volunteer is free right now — the village coordinator will call you.',
    coming: '🤝 {name} is coming to help!',
    comingMeta: '{type} · {dist} away · reliability {rel}/100 · ✔ verified',
    helpedYou: '🎉 {name} helped you today. A thank-you was sent!',
    medWaiting: '🩺 A nurse or doctor will call you back today.',
    medAnswered: '🩺 The doctor has called you back.',
    appointment: '📅 Appointment: {a}',
    btnWell: "😊 I'm doing well",
    btnHelp: '🎙️ I need some help',
    btnCompanion: '💬 Chat with Nurse Clara',
    btnDoctor: '📅 Find a doctor',
    btnSos: '📞 SOS — Emergency',
    back: '← Back',
    helpTitle: 'What do you need help with?',
    listening: 'Listening…',
    tapSpeak: 'Tap & speak',
    typeBelow: 'Type below',
    typeHere: '…or type here',
    quick: [
      ['🛒', 'Groceries', 'I need help with shopping, milk and bread.'],
      ['🚗', 'Ride to doctor', 'I need a ride to my doctor appointment on Monday.'],
      ['📱', 'Phone', "My phone isn't working, I can't make video calls."],
      ['☕', 'Company', "I'm alone today and would like someone to talk to."],
    ],
    emergencyTitle: '⚠️ This sounds like an emergency.',
    emergencyBody: 'Emergencies go straight to 112, not to volunteers.',
    understoodAs: 'Understood as:',
    medicalNote: ' — a nurse or doctor will call you back (not a volunteer).',
    consent: 'Share my exact address only with the one volunteer who accepts. Removed when done.',
    submit: 'Ask for help',
    doctorsTitle: 'Doctors visiting this week',
    doctorsSub: 'Doctors from neighbouring villages take turns in our Gemeindehaus.',
    fullyBooked: 'Fully booked',
    simulation: 'Simulation — no real call placed',
    calling: '📞 Calling 112…',
    noSpeak: "You don't need to speak. Your details are being read out.",
    rName: 'Name', rAddress: 'Address', rLocation: 'Location', rMedical: 'Medical', rContact: 'Emergency contact',
    notified: 'notified ✔',
    replay: '🔊 Replay announcement',
    cancelOk: "Cancel — I'm OK",
    sosLegal: 'Real-world: integration with official channels (112, AML location, nora app) requires approval. German rules (§4 NotrufV) require a human action to start an emergency call — pressing SOS is that action. Volunteers never delay professional response.',
    announcement: 'Automatic emergency message. Patient: {name}, {age} years old. Address: {address}. Medical conditions: {medical}. Emergency contact: {contact}. The patient may not be able to speak.',
    phoneCaption: 'Resident view · large text, voice first, works on any smartphone',
    cTitle: 'Nurse Clara',
    cSub: 'Your AI companion for a friendly chat — not a doctor.',
    cStart: '🎙️ Start talking',
    cEnd: 'End conversation',
    cConnecting: 'Connecting…',
    cSpeaking: 'Clara is speaking…',
    cListening: 'Clara is listening…',
    cIdle: 'Tap “Start talking”',
    cSafety: 'Clara only gives general, safe tips. She never diagnoses or changes medication. In an emergency, always use SOS.',
    cSosBanner: '⚠️ That sounds serious. Please press SOS now.',
    cVolunteer: '🙋 Clara asked a volunteer to help you.',
    cDemo: 'Demo mode · offline, no ElevenLabs agent',
    cLive: 'Live · ElevenLabs voice agent',
    cType: 'Type a message…',
    cSend: 'Send',
    cError: 'Connection failed: {msg}',
  },
}

export const TYPE_LABEL_I18N = {
  de: {
    shopping: 'Einkauf / Apotheke', tech: 'Hilfe mit Handy & Technik', companionship: 'Besuch & Gesellschaft',
    accompany: 'Begleitung zum Arzt', transport: 'Fahrt / Transport', other: 'Allgemeine Hilfe', medical: 'Medizinische Frage (→ Pflege/Arzt)',
  },
  en: {
    shopping: 'Groceries / pharmacy', tech: 'Phone & tech help', companionship: 'Companionship visit',
    accompany: 'Accompany to doctor', transport: 'Ride / transport', other: 'General help', medical: 'Medical question (→ nurse/doctor)',
  },
}

export const DAY_I18N = {
  de: { Monday: 'Montag', Tuesday: 'Dienstag', Wednesday: 'Mittwoch', Thursday: 'Donnerstag', Friday: 'Freitag' },
  en: {},
}
