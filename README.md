# DorfConnect

**Your village. Your care. Your community.**
A community care network for rural villages: elderly residents, trusted volunteers, nurses and rotating doctors on one live map.

> Prototype. All residents, providers, addresses, rewards and statistics are fictional. No real emergency calls are placed.

## Run it

```bash
npm install
npm run dev        # open http://localhost:5173
```

Roles are switched with the tabs at the top, or by URL: `#resident`, `#volunteer`, `#doctor`, `#community`.
**🇩🇪 DE / 🇬🇧 EN** in the header switches the resident app, Nurse Clara, voice input and the SOS read-out. The language is set per browser tab.

### Nurse Clara (AI voice companion)

- **Without setup:** Clara runs in offline demo mode (rule-based, bilingual, voice through the browser). It works without Wi-Fi or an API key.
- **Live ElevenLabs voice agent:** follow [docs/elevenlabs-nurse-agent.md](docs/elevenlabs-nurse-agent.md) (about 10 min). It has the system prompt and tool setup. Then:
  ```bash
  cp .env.example .env.local   # set VITE_ELEVENLABS_AGENT_ID=agent_...
  npm run dev
  ```

**Live demo trick:** open two browser windows side by side (for example `#resident` and `#volunteer`). State is shared through localStorage, so an action in one window shows up instantly in the other. Use **↺ Reset demo** before presenting.

## 3-minute demo script

1. **Resident (Maria, 82)**: tap *Mir geht es gut*. The Community tab shows her check-in. Gertrud has no reply, so the coordinator is prompted to call her contact person.
2. **Resident**: tap *Ich brauche Hilfe*, then speak (Chrome) or tap *Fahrt zum Arzt*. The app reads it as *Ride / transport*. Submit.
3. **Community map**: a red circle marks the **approximate** area. Dashed green lines run to the top-ranked available volunteers (Anna, Thomas). Sophie isn't matched because she doesn't drive, Lukas is busy, and Jonas isn't verified.
4. **Volunteer (Anna)**: *Accept*. Only now does Anna see Maria's exact address, phone number and a route on the map. *Mark done* gives +30 points, and the rewards unlock.
5. **Resident**: *Arzttermin finden*, then book a slot with the rotating doctor. **Doctor** tab: the rota and bookings.
6. **Resident**: type "Mein Blutdruck ist sehr hoch". It goes to the **doctor call-back queue**, not to volunteers.
7. **Resident**: *Mit Schwester Clara plaudern*. Say "Ich bin heute so allein", then "Ja". Clara asks a volunteer to visit. Ask about doubling a tablet: Clara refuses and offers a nurse call-back. Say "Schmerzen in der Brust": the SOS banner appears.
8. Switch **🇬🇧 EN**: the same flow works in English.
9. **Resident**: type "Ich bin gestürzt, Schmerzen in der Brust". The app detects an emergency and points to SOS. **SOS** shows the emergency card and reads Maria's details aloud in German (simulated 112).

## Works without a smartphone

Many residents over 80 have only a landline, so the resident never *needs* the app. Each channel has its own tab:

| Channel | Where | What it shows |
|---|---|---|
| ☎️ **Landline** | `#landline` (`src/screens/Landline.jsx`) | 09:00 check-in call from Clara: press 1 = fine, 2 = help, 3 = coordinator (or just say it). Inbound hotline call. Real phone calls via ElevenLabs: [docs/elevenlabs-phone-checkin.md](docs/elevenlabs-phone-checkin.md) and `scripts/elevenlabs-call.mjs` (dry run unless `--confirm`). |
| 🔴 **Alarm button** | `#hausnotruf` (`src/screens/Hausnotruf.jsx`) | Wrist SOS button and daily "I'm OK" button at home. Partner call centre where a **human** operator talks, sends the keyholder volunteer, informs family, or calls 112 (simulated; automatic 112 calls are forbidden by §4 NotrufV). |
| 👪 **Family** | `#family` (`src/screens/Family.jsx`) | Peter (Maria's son) sees today's check-in, alerts, who helps, appointments, and arranges help with Maria's consent. No medical details. |
| 🤝 **On behalf** | Community + Volunteer (`src/components/OnBehalfForm.jsx`) | The coordinator logs phone or drop-in requests; a volunteer logs what a neighbour needs. Consent is required, and the request shows "☎️ via landline · logged by Sabine". |
| 🏠 **In person** | Community + Doctor; [`/hilfe-karte.html`](public/hilfe-karte.html), [`/aushang.html`](public/aushang.html) | Weekly drop-in hour in the Gemeindehaus, a printable fridge card ("one number for everything"), and an A4 notice with tear-off strips for the bakery. |

## Relationships between helpers and residents

People prefer familiar faces, so matching learns who belongs together:

- Every completed visit strengthens the bond between a resident and a volunteer. The resident's star ratings of those visits scale it, and a ❤️ "preferred helper" adds a boost (`bondStrength()` in `src/lib/matching.js`).
- The matching score is now 35% proximity + 30% reliability + 15% experience + **20% relationship**. A preferred helper who is available and has the right skill is **always** among the volunteers notified.
- Safeguarding: if a resident rated a volunteer ≤ 2★ on average over 2+ visits, that pair is not matched again.
- Resident: *Ihre Helfer / Your helpers* with a heart toggle, and "Anna has helped you 4 times before" when she's coming. Volunteer: *Your regular* badge and *Your neighbours*. Coordinator: *Connections* strength bars and "no regular helper yet" (an isolation signal).

The team decision page (agent options + rural research) is served locally at `/options.html`.

## How the map works

| Piece | Where | What it does |
|---|---|---|
| Leaflet + react-leaflet + OpenStreetMap tiles | `src/components/CommunityMap.jsx` | The interactive map. It's free and needs no API key. |
| Custom `divIcon` markers | same file | Coloured round pins (green = available, grey = busy, red = request, blue = doctor, purple = nurse) |
| Privacy rules | same file | Homes are **never** drawn, except to the one volunteer who accepted (and to the resident themself). Requests show a 250 m circle around a point offset by ~100–200 m. |
| Matching "connections" | same file | Dashed lines from a request to the volunteers who were notified |
| Haversine distance + ranking | `src/lib/matching.js` | Filters: available, verified, has the needed skill, within 3 km. Score = 35% proximity + 30% reliability + 15% experience + 20% relationship. The top 3 are notified. If all decline, the request goes to the next 3, then to the coordinator. |
| Directions | `src/screens/Volunteer.jsx` | A Google Maps `dir` link opens turn-by-turn navigation on the phone. |

To move the demo to a real village, change `VILLAGE_CENTER` in `src/data/seed.js`. Every person is placed in metres relative to it.

## Project structure (one owner per file means no merge conflicts)

```
src/
  data/seed.js              fictional people, village centre, rota, rewards
  store.js                  shared state + all actions (cross-tab sync)
  lib/matching.js           haversine, volunteer ranking, request classification
  lib/speech.js             Web Speech API: voice input + German read-out
  components/CommunityMap   the live map (privacy rules live here)
  screens/Resident.jsx      Member 2: check-in, voice help, booking, SOS
  screens/Companion.jsx     Nurse Clara: ElevenLabs agent + offline fallback, client tools
  lib/companionOffline.js   offline Clara brain (safe replies only)
  i18n.js                   German / English strings
  screens/Volunteer.jsx     Member 3: availability, accept/complete, trust, rewards
  screens/Doctor.jsx        Member 4: rotation calendar, call-back queue
  screens/Community.jsx     Member 1: coordinator map, check-ins, leaderboard, log
```

## Going further (beyond the hackathon)

- Swap `store.js` for **Supabase Realtime** to get real multi-device sync. The action functions stay the same.
- Real phone GPS via `navigator.geolocation` (only while a request is active, never continuous tracking).
- Emergency: integration with official channels (112 / AML / nora) needs approval. §4 NotrufV requires a human action to start an emergency call.
- GDPR: consent records, role-based access, and medical data visible only to clinicians.
