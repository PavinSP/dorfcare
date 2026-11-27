// Offline fallback for "Clara" (AI companion — not a nurse) — used when no ElevenLabs agent is configured
// (or the venue Wi-Fi dies). Rule-based, bilingual, and deliberately conservative:
// it only chats, gives general wellbeing tips, and points to SOS / the nurse call-back.

import { classifyRequest } from './matching'

const has = (t, words) => words.some((w) => t.includes(w))
const hasWord = (t, words) => t.split(/[^\p{L}]+/u).some((w) => words.includes(w))

const R = {
  de: {
    hello: (n) => `Hallo ${n}! Schön, dass Sie da sind. Wie war Ihr Morgen bisher?`,
    sos: 'Wenn das ein Notfall ist, drücken Sie bitte jetzt den roten SOS-Knopf — dann kommt professionelle Hilfe. Ich bleibe bei Ihnen.',
    meds: 'Bei Medikamenten kann ich leider nichts ändern oder empfehlen — bitte bleiben Sie beim Plan Ihres Arztes. Soll ich die Pflegekraft um einen Rückruf bitten?',
    lonely: 'Schön, dass Sie mit mir reden. Möchten Sie, dass ich eine Helferin aus dem Dorf frage, ob sie auf einen Kaffee vorbeikommt?',
    offerYes: 'Wunderbar! Ich habe eine Helferin gefragt. Sie sehen gleich auf dem Startbildschirm, wer kommt.',
    offerNo: 'In Ordnung. Ich bin gern einfach so für Sie da.',
    water: 'Ein guter Tipp für heute: Trinken Sie regelmäßig ein Glas Wasser oder Tee — am besten steht immer ein Glas in Reichweite.',
    sleep: 'Ein ruhiger Abend ohne Fernseher kurz vor dem Schlafen und ein kleiner Spaziergang tagsüber helfen vielen beim Schlafen. Wenn es länger so bleibt, sprechen Sie es beim nächsten Arzttermin an.',
    walk: 'Ein kurzer Spaziergang bei Tageslicht tut gut, wenn Sie sich sicher fühlen. Nehmen Sie Ihren Stock und Ihr Handy mit.',
    mild: 'Das tut mir leid. Ruhen Sie sich aus und trinken Sie etwas. Wenn es schlimmer wird oder nicht besser wird, kann Sie die Pflegekraft zurückrufen. Wenn es plötzlich sehr stark wird: SOS drücken.',
    prompts: [
      'Erzählen Sie mal — was haben Sie früher am liebsten gemacht, als Sie jung waren?',
      'Haben Sie diese Woche schon von Ihrer Familie gehört?',
      'Was kochen Sie denn heute Schönes?',
      'Gibt es ein Lied, das Sie besonders gern mögen?',
    ],
    thanks: 'Sehr gern! Ich bin immer da, wenn Sie plaudern möchten.',
  },
  en: {
    hello: (n) => `Hello ${n}! Lovely to hear from you. How has your morning been so far?`,
    sos: "If this is an emergency, please press the red SOS button now — professional help will come. I'll stay with you.",
    meds: "I'm not able to change or recommend medicines — please keep to the plan from your doctor. Shall I ask the nurse to call you back?",
    lonely: "I'm glad you're talking to me. Would you like me to ask a volunteer from the village to pop round for a coffee?",
    offerYes: "Wonderful! I've asked a volunteer. You'll see who's coming on your home screen.",
    offerNo: "That's alright. I'm happy just to keep you company.",
    water: 'A good tip for today: have a glass of water or tea regularly — it helps to keep a glass within reach.',
    sleep: "A quiet evening without TV before bed and a short walk in the daytime help many people sleep. If it keeps happening, mention it at your next doctor's appointment.",
    walk: 'A short walk in daylight is lovely if you feel steady on your feet. Take your stick and your phone with you.',
    mild: "I'm sorry to hear that. Have a rest and something to drink. If it gets worse or doesn't improve, the nurse can call you back. If it suddenly becomes very bad: press SOS.",
    prompts: [
      'Tell me — what did you most enjoy doing when you were young?',
      'Have you heard from your family this week?',
      'What are you cooking today?',
      'Is there a song you particularly love?',
    ],
    thanks: "You're very welcome! I'm always here when you'd like a chat.",
  },
}

/** Returns { reply, action, task } where action ∈ null | 'sos' | 'volunteer' | 'nurse' */
export function createOfflineCompanion(name) {
  let pendingOffer = null // { kind: 'volunteer' | 'nurse', task }
  let promptIdx = 0

  return function respond(text, lang) {
    const r = R[lang] ?? R.en
    const t = ` ${text.toLowerCase()} `

    if (classifyRequest(t) === 'emergency') { pendingOffer = null; return { reply: r.sos, action: 'sos' } }

    if (pendingOffer) {
      const no = hasWord(t, ['nein', 'no', 'nicht', 'not', 'nope'])
      const yes = !no && hasWord(t, ['ja', 'gern', 'gerne', 'bitte', 'yes', 'please', 'ok', 'okay', 'sure', 'yeah'])
      if (yes || no) {
        const offer = pendingOffer
        pendingOffer = null
        return yes ? { reply: r.offerYes, action: offer.kind, task: offer.task } : { reply: r.offerNo, action: null }
      }
    }

    if (has(t, ['hallo', 'guten', 'hello', 'hi ', 'good morning'])) return { reply: r.hello(name), action: null }
    if (has(t, ['tablette', 'medikament', 'dosis', 'pill', 'medicine', 'medication', 'dose', 'tablet'])) { pendingOffer = { kind: 'nurse', task: text }; return { reply: r.meds, action: null } }
    if (has(t, ['allein', 'einsam', 'langweil', 'lonely', 'alone', 'bored'])) { pendingOffer = { kind: 'volunteer', task: text }; return { reply: r.lonely, action: null } }
    if (has(t, ['durst', 'trinken', 'heiß', 'warm', 'thirst', 'drink', 'hot'])) return { reply: r.water, action: null }
    if (has(t, ['schlaf', 'müde', 'sleep', 'tired'])) return { reply: r.sleep, action: null }
    if (has(t, ['spazier', 'wetter', 'draußen', 'walk', 'weather', 'outside'])) return { reply: r.walk, action: null }
    if (has(t, ['kopfschmerz', 'erkält', 'husten', 'schnupfen', 'headache', 'cold', 'cough', 'sore'])) { pendingOffer = { kind: 'nurse', task: text }; return { reply: r.mild, action: null } }
    if (has(t, ['danke', 'thank'])) return { reply: r.thanks, action: null }

    const p = r.prompts[promptIdx++ % r.prompts.length]
    return { reply: p, action: null }
  }
}
