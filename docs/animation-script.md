# DorfConnect: 2-minute animation script

**Maria's morning.** One headache, followed from her bedside to the hospital in Schweinfurt. It shows how DorfConnect connects needs and services: an AI companion, neighbours, a nurse from an existing care service, a doctor by video, and a ride. It ends with who benefits and what it costs.

- **Length:** 2:00 (120 s), 18 shots
- **Format:** 1920×1080, 25 fps, 16:9. Phone screens are shown inside a phone frame and zoom to full screen.
- **Base:** every screen in this script exists in the prototype (`src/screens/*`). Labels are quoted exactly as the app shows them in English. Names, places and organisations come from `src/data/seed.js`.
- **Language:** English voiceover. A German version only needs the VO lines translated; the app has a 🇩🇪 DE switch for the UI frames.

---

## 1. The story in one paragraph

Maria (82) lives alone in Werneck. At 6:40 she wakes up with a migraine that won't go away. She taps "Chat with Clara". Clara, the AI companion, first asks whether it's an emergency. It isn't, so Clara asks a neighbour to sit with her and a nurse to come. DorfConnect pings trusted volunteers within 5 km who are free right now. Anna is at work and says "can't right now"; Greta accepts. Lena, a nurse from a local care service, accepts a professional visit. Greta sits with Maria. Lena measures her blood pressure and starts a video call with Dr. Yilmaz. The doctor decides Maria should be checked at the hospital today: not an ambulance case, but today. Greta logs a ride. Anna, now done with work, drives Maria to Schweinfurt. Maria's son Peter follows along from Munich. The camera pulls back to the whole network: doctors rotating through village halls, nurses from different organisations, sixteen neighbours. Then who benefits, and the price: €3.99 a month.

## 2. Safety rules the animation must show (non-negotiable)

These keep the story true to the product and the law. Each one appears on screen at least once.

1. **Clara asks, she never decides.** She asks whether it's an emergency; Maria chooses. If yes: **112, ambulance**. The app never diagnoses (outside the medical-device rules, MDR).
2. **Volunteers never do medical tasks** and never judge how serious something is. They keep company, fetch things, drive.
3. **The nurse assesses, the doctor decides.** The ride to hospital happens only because the doctor said "today, not an emergency".
4. **The exact address is shared only with the volunteer who accepts**, and only until the task is done. The map shows everyone else an approximate circle.
5. **Saying no has no penalty** for volunteers.

## 3. Cast

| Character | Who (from `seed.js`) | Look | Voice |
|---|---|---|---|
| **Maria Schneider**, 82 | Resident, Werneck, lives alone; son Peter in Munich; Anna is her regular helper (4 visits, ❤️) | White short hair, cardigan, reading glasses on a cord | Warm, a little tired; German accent in English is fine |
| **Clara** | AI companion (`Companion.jsx`). Not a nurse, not a doctor | No human face: a soft teal circle that pulses when she speaks | Calm, slow, friendly |
| **Anna Weber** | Volunteer, Werneck; drives; 4.9★; Maria's favourite | 30s, office lanyard, small car | Brief line only |
| **Greta Neumann** | Volunteer, Werneck; drives, keeps company | 60s, fit retiree, rain jacket, thermos | Brief line only |
| **Lena Vogt** | Nurse (Pflegefachfrau), Pflegeteam Main-Wern (Demo) | Nursing scrubs, care-service car, blood-pressure cuff, tablet | Professional, kind |
| **Dr. Yilmaz** | Remote GP on video (rotation: Tuesday video day) | On a tablet screen, practice background | Clear, decisive |
| **Peter Schneider** | Maria's son, Munich (Family view) | 50s, at a desk, phone buzzes | No line |
| **Narrator** | Off screen | | Neutral, confident |

All people and organisations are fictional; the municipalities are real.

## 4. Look and feel

- **Style:** flat 2D, soft rounded shapes, light shadows. People are simple, readable characters, not photo-real.
- **Colours** (the app's own, from Tailwind classes in the repo):
  - teal `#0f766e` / `#0d9488`: brand, Clara, primary buttons
  - green `#16a34a`: available volunteers
  - grey `#94a3b8`: busy / offline volunteers
  - red `#dc2626`: help request, SOS
  - amber `#f59e0b`: help on the way
  - purple `#7c3aed`: nurses
  - blue `#2563eb`: doctors, village halls, hospital
  - background `#f1f5f9`, ink `#0f172a`
- **Type:** Space Grotesk for titles, Inter for UI and captions.
- **Phone frame:** dark rounded frame like `Resident.jsx` (rounded-[2.5rem], 8 px slate-900 border, status bar "09:00 · DorfConnect · 🔋 82%"; change the clock per scene).
- **Map:** light OpenStreetMap-style base of the real area (Werneck, Dittelbrunn, Schonungen, Niederwerrn, Gochsheim, Schweinfurt), pins as round coloured dots with a white border and one letter (as in `CommunityMap.jsx`). Town names in small caps.
- **Motion language:**
  - "Zoom into the phone": camera pushes into the phone until its screen fills the frame (0.6 s, ease-in-out).
  - "Zoom out to the map": the phone screen shrinks into Maria's map position and the map appears around it.
  - Notifications drop in from the top with a soft bounce.
  - Pins move along roads, never in straight lines.
- **Music:** gentle piano and soft strings, building from 1:30, resolving on the logo. Duck under the voice by about 12 dB.
- **Captions:** bottom centre, white on dark rounded box (as in the recorded demo). Every voiceover line is captioned.

---

## 5. Master timeline

| # | Time | Beat | POV |
|---|---|---|---|
| 1 | 0:00–0:05 | Werneck at dawn | Wide exterior |
| 2 | 0:05–0:10 | Maria wakes with a migraine | Bedroom |
| 3 | 0:10–0:14 | Zoom into her phone, taps "Chat with Clara" | Maria's phone |
| 4 | 0:14–0:25 | Clara asks: emergency? No | Maria's phone |
| 5 | 0:25–0:30 | The road not taken: 112 | Split inset |
| 6 | 0:30–0:38 | The request appears on the map, 5 km ring | Map |
| 7 | 0:38–0:46 | Anna says no, Greta and Lena say yes | Three phones |
| 8 | 0:46–0:52 | Greta and Lena on their way | Map + Greta's phone |
| 9 | 0:52–0:58 | Greta sits with Maria | Living room |
| 10 | 0:58–1:05 | Lena measures, starts a video call | Living room + Lena's tablet |
| 11 | 1:05–1:13 | Dr. Yilmaz decides: hospital today | Split: home / practice |
| 12 | 1:13–1:20 | Greta logs a ride, Anna accepts | Greta's phone → Anna's phone |
| 13 | 1:20–1:27 | Drive to Schweinfurt; Peter is updated | Map + Peter's phone |
| 14 | 1:27–1:32 | Arrival; evening rating | Hospital entrance → Maria's phone |
| 15 | 1:32–1:42 | The network: rotating doctors, care services | Big map + week strip |
| 16 | 1:42–1:50 | Who benefits | Four cards around a phone |
| 17 | 1:50–1:56 | The price: €3.99 a month per household | Phone + price tag |
| 18 | 1:56–2:00 | Logo and closing line | End card |

Voiceover budget: about 230 narrator words plus about 80 words of dialogue, roughly 155 words a minute. Keep the reads calm and let the sound effects fill the gaps; if it feels rushed, drop narrator line 13 ("And that evening, a thank-you."). Read time is noted per shot.

---

## 6. Shot by shot

### Shot 1 · 0:00–0:05 · Werneck at dawn
- **Visual:** stylised village rooftops in blue morning light; a church tower; one window lights up. A small label fades in: "Werneck · Landkreis Schweinfurt".
- **Camera:** slow push-in towards the lit window.
- **Audio:** birdsong, distant church bell (one strike). Music: single soft piano note.
- **VO (narrator, 3 s):** "6:40 in the morning, in Werneck."
- **On-screen text:** "Werneck · Landkreis Schweinfurt"

### Shot 2 · 0:05–0:10 · Maria wakes up
- **Visual:** bedroom. Maria sits up slowly, hand on her temple. Migraine is shown as soft pulsing rings around her head and a slight blur at the frame edges (no gore, no red). On the nightstand: glasses, a water glass, her phone, an old landline phone.
- **Camera:** medium shot, gentle handheld sway to mirror dizziness.
- **Audio:** low heartbeat-like thump synced to the rings, then silence.
- **VO (narrator, 5 s):** "Maria is eighty-two and lives alone. She wakes up with a migraine that won't go away."

### Shot 3 · 0:10–0:14 · Into the phone
- **Visual:** she picks up the phone; **zoom into the phone** until the screen fills the frame. The DorfConnect home screen: "Good morning, Maria! 👋 / How are you feeling today?" and the big buttons:
  - "😊 I'm doing well"
  - "🎙️ I need some help"
  - "💬 Chat with Clara" (teal outline)
  - "📅 Find a doctor"
  - "📞 SOS — Emergency" (red)
- A finger (simple round touch ripple) taps **"💬 Chat with Clara"**.
- **Audio:** soft tap sound.
- **Repo:** `src/screens/Resident.jsx` → `Home`; labels in `src/i18n.js` (en).

### Shot 4 · 0:14–0:25 · Clara asks the right question
- **Visual:** Clara's screen: title "Clara – your digital companion", subtitle "An AI for a friendly chat — not a doctor or nurse." A teal circle pulses while Clara speaks; chat bubbles appear as each line is spoken (Maria on the right in teal, Clara on the left in white).
- **Dialogue (11 s):**
  - **Maria:** "Clara, my head hurts so much. It's my migraine, but it won't stop."
  - **Clara:** "I'm sorry, Maria. Is this an emergency? A sudden, very bad headache, weakness, or trouble speaking?"
  - **Maria:** "No, no. It's my usual migraine. I just don't want to be alone."
  - **Clara:** "Then I'll ask a nurse to come, and a neighbour to sit with you."
- **On-screen text:** small chip under Clara's question: "Clara asks. Maria decides."
- **Repo:** `src/screens/Companion.jsx`, safety rule in `src/lib/matching.js` (`classifyRequest`, "ask, don't decide").

### Shot 5 · 0:25–0:30 · The road not taken
- **Visual:** a ghosted inset slides in from the right: the red "📞 SOS — Emergency" button glows, then an ambulance icon with "112". The inset dims and slides away as Maria's path continues.
- **VO (narrator, 4 s):** "If it were an emergency, the call goes straight to 112. Always."
- **On-screen text:** "Emergency → 112 · never a volunteer's car"
- **Repo:** `src/screens/Resident.jsx` → `Sos`; §4 NotrufV note in the app.

### Shot 6 · 0:30–0:38 · The request on the map
- **Visual:** **zoom out of the phone** into the regional map. Where Maria lives, a **red pulsing circle** appears (about 250 m, offset from her house). A thin dashed **5 km ring** expands from it.
  - Inside the ring: Anna (green "A"), Greta (green "G"), Laura (green "L"), Hans (grey "H", offline).
  - Outside the ring, faded: pins in Dittelbrunn, Niederwerrn, Schonungen, Gochsheim.
  - **Dashed green lines** connect the circle to **Anna and Greta** (the two free volunteers whose skills match a companionship visit). Hans stays grey and gets no line.
  - Separately, a **purple line** to Lena's purple "N" (Pflegeteam Main-Wern), labelled "professional request".
- **Camera:** slow zoom from Werneck to show the five municipalities, then back.
- **VO (narrator, 8 s):** "DorfConnect asks trusted neighbours within five kilometres who are free right now. Busy or offline? They aren't even asked. A nurse gets a professional request."
- **On-screen text:** "Approximate area only · the home stays private"
- **Repo:** `src/components/CommunityMap.jsx`, `src/lib/matching.js` (`rankWithExpansion`, 5 → 10 → 15 km), nurse offer in `src/store.js` (`requestNurseVisit`).

### Shot 7 · 0:38–0:46 · Three phones, three answers
- **Visual:** split screen with three phones side by side, each lighting up with a notification.
  1. **Anna** (at an office desk): card "Companionship visit · ~650 m away · 💛 Your regular: Maria · 4 visits · asked for you". She looks at her laptop, sighs, taps **"Can't right now"**. Tag: "No penalty for saying no".
  2. **Greta** (in her kitchen, kettle on): same card. Taps **"Accept"**. Her card turns into "Your active task" with "Musterstraße 12, 97440 Werneck · 🔒 Shared only with you, only until the task is done".
  3. **Lena** (in her care-service car): Nurse view, "New requests": "Home assessment · Maria Schneider, 82 · Werneck". Taps **"Accept"**. Status "scheduled".
- **Audio:** three different soft notification chimes, then a small "accepted" sound for Greta and Lena.
- **VO (narrator, 7 s):** "Anna is at work, so she taps 'can't right now'. No penalty. Greta accepts. So does Lena, a nurse from a local care service."
- **Repo:** `src/screens/Volunteer.jsx` (incoming card, "Can't right now", "Accept", "Your active task"), `src/screens/Nurse.jsx` (New requests, Accept).

### Shot 8 · 0:46–0:52 · On the way
- **Visual:** map. Greta's green pin travels along the streets towards Maria's house, now shown as an exact house icon **only inside Greta's phone view** (inset). Lena's purple car follows a different road. A clock in the corner ticks 06:52 → 07:05.
- **Audio:** light ticking, car indicator click.
- **VO (narrator, 4 s):** "Only Greta sees Maria's address, and only for this visit."
- **Repo:** `CommunityMap.jsx` (exact home only for the accepted volunteer).

### Shot 9 · 0:52–0:58 · Company first
- **Visual:** Maria's living room. Greta sits beside her on the sofa, pours tea from her thermos, draws the curtains half closed, holds Maria's hand. Maria's pulse rings slow down.
- **VO (narrator, 4 s):** "Greta keeps her company. Volunteers never do medical tasks."
- **On-screen text:** "Volunteers: company, errands, rides"

### Shot 10 · 0:58–1:05 · The nurse assesses
- **Visual:** doorbell; Lena comes in with her bag. She puts on the blood-pressure cuff; the display counts up to **168/98**. She opens her tablet: Nurse view, "Today's route" card "Maria Schneider · Musterstraße 12, 97440 Werneck", button **"📹 Start tele-consult"**. Tap.
- **Dialogue (3 s):** **Lena:** "Let's ask the doctor, Maria."
- **VO (narrator, 3 s):** "Lena measures. The doctor joins by video."
- **Repo:** `src/screens/Nurse.jsx` (Today's route, Start tele-consult, `TeleconsultPanel`).

### Shot 11 · 1:05–1:13 · The doctor decides
- **Visual:** split screen. Left: Maria's living room, Lena holding the tablet towards Maria. Right: Dr. Yilmaz at his practice, on the video panel ("Lena Vogt · on site · Maria Schneider" / "Dr. Yilmaz (remote) · by video"). He types into "Doctor's note": "BP 168/98, persistent headache → check at hospital today". Taps **"⏹ End & document"**.
- **Dialogue (6 s):** **Dr. Yilmaz:** "Thank you, Lena. I'd like Maria checked at the hospital in Schweinfurt today. It's not an emergency, but today."
- **On-screen text:** "The nurse assesses. The doctor decides."
- **Repo:** `src/screens/Doctor.jsx` (Tele-consults), `TeleconsultPanel` in `src/screens/Nurse.jsx`.

### Shot 12 · 1:13–1:20 · A ride, from a neighbour again
- **Visual:**
  - **Greta's phone:** Volunteer view, "📝 Log a request for a neighbour". She picks Maria, taps "Ride to doctor", ticks "Maria agreed to this request". Submit.
  - **Cut to Anna's phone** (now at her car after work, status "Available"): card "Ride / transport · Maria · 💛 Your regular". She taps **"Accept"**.
  - **Map:** a green line from Anna to Maria.
- **VO (narrator, 6 s):** "Greta logs a ride for Maria. Anna is done with work now, and she takes it."
- **Repo:** `src/components/OnBehalfForm.jsx` (consent required), `Volunteer.jsx`, preferred helpers in `matching.js` (`pickNotified`).

### Shot 13 · 1:20–1:27 · To Schweinfurt
- **Visual:** map at regional zoom. Anna's car (amber "help on the way") drives from Werneck along the road to Schweinfurt (about 12 km, label "≈ 15 min"). The hospital marker (blue "+", "Schweinfurt — hospital & specialist practices") pulses as they approach.
  - Corner inset: **Peter's phone** in Munich buzzes. Family view alert cards: "Ride / transport · Accepted by Anna", "Nurse/doctor call-back requested · Medical details are only shared with doctors and nurses."
- **VO (narrator, 5 s):** "In Munich, her son Peter sees every step. Never the medical details."
- **Repo:** `src/screens/Family.jsx` (alerts feed, consent banner).

### Shot 14 · 1:27–1:32 · Arrival, and that evening
- **Visual:** hospital entrance; Anna helps Maria out of the car and walks her in. Match cut to **evening**: Maria on her sofa, relaxed, phone in hand: "How was Anna's help?" ⭐⭐⭐⭐⭐, tag "Kind", and "❤️ I'd like Anna again" ticked. Tap "Send rating".
- **Audio:** door chime; evening crickets; a warm "sent" sound.
- **VO (narrator, 3 s):** "And that evening, a thank-you."
- **Repo:** `Resident.jsx` → `RateCard`, relationships in `store.js` (`rateVolunteer`, `setFavourite`).

### Shot 15 · 1:32–1:42 · The network behind Maria's morning
- **Visual:** pull far back. The whole map of Schweinfurt-Land lights up: 16 volunteer pins (green and grey), 5 purple nurse pins with faint service-area circles, blue village-hall pins.
  - A **week strip** slides in at the top; each day lights up in turn as a doctor icon hops to its place:
    - **Mon** · Dr. Keller · Gemeindehaus Werneck (badge "Applied to KVB → video + nurse until approved")
    - **Tue** · Dr. Yilmaz · Video
    - **Wed** · Dr. Braun · Gemeindehaus Schonungen (badge "KVB-approved")
    - **Thu** · Mehmet Aydın (NäPA) · Home visits
    - **Fri** · Dr. Sommer · Gemeindehaus Gochsheim
  - Organisation tags float next to the purple pins: Pflegeteam Main-Wern, Ambulante Pflege Lauertal, Sozialdienst Maintal, Pflege daheim Gochsheim, Hausarztpraxis Dr. Keller (all fictional "Demo" names).
- **Music:** builds.
- **VO (narrator, 9 s):** "Behind Maria's morning is a network. Doctors from different practices take turns in the village halls, as approved branch practices. Nurses come from care services that already exist. And sixteen neighbours are ready to help."
- **Repo:** `src/data/seed.js` (`rotation`, `nurses`, `volunteers`), `src/lib/rotation.js` (`dayMode`), Doctor tab "Village-hall consultations".

### Shot 16 · 1:42–1:50 · Who benefits
- **Visual:** the map blurs; Maria's phone sits in the centre; four cards pop out around it, one per beat of the voiceover:
  - 🩺 **Doctors:** "More patients reached, no extra driving"
  - 👩‍⚕️ **Nurses:** "Visits paid by health and care insurance"
  - 🙋 **Volunteers:** "Coupons from local shops"
  - 👪 **Families:** "Peace of mind, from anywhere"
- **VO (narrator, 8 s):** "Doctors reach more patients without extra driving. Nurses are paid by insurance, as today. Volunteers earn coupons from local shops. And families stop worrying."
- **Repo:** rewards in `seed.js` (`rewards`: Dorfcafé, €5 supermarket voucher, village festival ticket), Volunteer view "Rewards from local sponsors".

### Shot 17 · 1:50–1:56 · The price
- **Visual:** the four cards fold into the phone. A price tag swings in and settles: **€3.99 / month per household**. Under it: "Connecting needs and services." Small print fades in: "SOS and 112 are always free · nursing and doctor visits are billed to insurance as usual · the municipality funds the local network."
- **VO (narrator, 5 s):** "Everything has a price, even care. Ours is three ninety-nine a month per household."

### Shot 18 · 1:56–2:00 · End card
- **Visual:** teal background, DorfConnect heart logo, "DorfConnect" and "Your village. Your care. Your community." Last line fades in below.
- **VO (narrator, 4 s):** "We can't put a doctor in every village. We can make sure nobody there is alone."
- **Music:** final chord.

---

## 7. Full voiceover script (for recording)

Narrator lines in order (about 230 words):

1. 6:40 in the morning, in Werneck.
2. Maria is eighty-two and lives alone. She wakes up with a migraine that won't go away.
3. *(Clara dialogue, shot 4)*
4. If it were an emergency, the call goes straight to 112. Always.
5. DorfConnect asks trusted neighbours within five kilometres who are free right now. Busy or offline? They aren't even asked. A nurse gets a professional request.
6. Anna is at work, so she taps "can't right now". No penalty. Greta accepts. So does Lena, a nurse from a local care service.
7. Only Greta sees Maria's address, and only for this visit.
8. Greta keeps her company. Volunteers never do medical tasks.
9. Lena measures. The doctor joins by video.
10. *(Dr. Yilmaz line, shot 11)*
11. Greta logs a ride for Maria. Anna is done with work now, and she takes it.
12. In Munich, her son Peter sees every step. Never the medical details.
13. And that evening, a thank-you.
14. Behind Maria's morning is a network. Doctors from different practices take turns in the village halls, as approved branch practices. Nurses come from care services that already exist. And sixteen neighbours are ready to help.
15. Doctors reach more patients without extra driving. Nurses are paid by insurance, as today. Volunteers earn coupons from local shops. And families stop worrying.
16. Everything has a price, even care. Ours is three ninety-nine a month per household.
17. We can't put a doctor in every village. We can make sure nobody there is alone.

Dialogue (character voices, about 80 words): shots 4, 10 and 11 above.

---

## 8. Claims in the video and where they come from

| Claim | Source / status |
|---|---|
| Werneck, Landkreis Schweinfurt; 12 km / ~15 min to Schweinfurt | Real place; straight-line distance from OSM coordinates (`seed.js`) |
| Volunteers within 5 km, widening to 10/15 km | Product behaviour (`MATCH_RADII_KM`) |
| Emergencies → 112, never automatic, never a volunteer | §4 NotrufV; product rule |
| Doctors as "approved branch practices" in village halls | §24 Abs. 3 Ärzte-ZV (KVB Filiale); statuses in the demo are fictional |
| "Nurses are paid by insurance, as today" | Nursing visits are billed to health/care insurance today; DorfConnect doesn't change that |
| "Sixteen neighbours", five care services | Demo network in `seed.js` (fictional people and organisations) |
| €3.99 a month per household | Team pricing decision (to validate with families). SOS and 112 are never behind the paywall |

Don't add numbers beyond these without a source; the pitch's verified statistics (9,925 people aged 65+, five open GP seats in Schweinfurt-Süd) can go in a title card if you want them, with the source lines from the pitch page (`public/pitch.html`).

## 9. Production plan (fits a small team)

| Step | Who | Output |
|---|---|---|
| 1. Capture real UI frames | 1 person | Run `npm run dev`, switch to 🇬🇧 EN, take screenshots of each screen state listed under "Repo" in the shots. The recorded demo (`npm run record:demo`) already walks through most states and can be paused frame by frame. |
| 2. Characters and backgrounds | 1 person | Maria, Greta, Anna, Lena, Dr. Yilmaz, Peter; bedroom, living room, office, kitchen, practice, hospital entrance; car. Flat 2D. |
| 3. Animatic | 1 person | Shots 1–18 as still frames on the timeline with the voiceover, to lock timing before animating. |
| 4. Voice | 2 voices + narrator | Record VO and dialogue (section 7) in a quiet room; or macOS voices as placeholders (`say -v Daniel`, `say -v Samantha`). |
| 5. Animate | 1–2 people | Tools: After Effects, Figma + Jitter, Rive or Keynote "Magic Move" for the fastest result. Phone zooms and map pin moves are the main motions. |
| 6. Sound and captions | 1 person | Music bed, SFX list (section 6), captions burned in. |

## 10. Open decisions before publishing

- **Price (decided).** €3.99 per household per month, often paid by the family. The municipality funds the local network (licence), and care stays billed to insurance as today. SOS and 112 are always free. The pitch, business case, app (Family view) and recorded demo use the same model.
- **Day of the week.** The story uses Dr. Yilmaz (Tuesday video day). If you want the village-hall doctor in the story instead, set it on a Wednesday with Dr. Braun in Schonungen.
- **Language.** English VO for an international jury; German VO for municipalities and investors in Bavaria.
