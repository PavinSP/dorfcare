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

**Live demo trick:** open two browser windows side by side (for example `#resident` and `#volunteer`). State is shared through localStorage, so an action in one window shows up instantly in the other. Use **↺ Reset demo** before presenting.

## 3-minute demo script

1. **Resident (Maria, 82)**: tap *Mir geht es gut*. The Community tab shows her check-in. Gertrud has no reply, so the coordinator is prompted to call her contact person.
2. **Resident**: tap *Ich brauche Hilfe*, then speak (Chrome) or tap *Fahrt zum Arzt*. The app reads it as *Ride / transport*. Submit.
3. **Community map**: a red circle marks the **approximate** area. Dashed green lines run to the top-ranked available volunteers (Anna, Thomas). Sophie isn't matched because she doesn't drive, Lukas is busy, and Jonas isn't verified.
4. **Volunteer (Anna)**: *Accept*. Only now does Anna see Maria's exact address, phone number and a route on the map. *Mark done* gives +30 points, and the rewards unlock.
5. **Resident**: *Arzttermin finden*, then book a slot with the rotating doctor. **Doctor** tab: the rota and bookings.
6. **Resident**: type "Mein Blutdruck ist sehr hoch". It goes to the **doctor call-back queue**, not to volunteers.
7. **Resident**: type "Ich bin gestürzt, Schmerzen in der Brust". The app detects an emergency and points to SOS. **SOS** shows the emergency card and reads Maria's details aloud in German (simulated 112).

## How the map works

| Piece | Where | What it does |
|---|---|---|
| Leaflet + react-leaflet + OpenStreetMap tiles | `src/components/CommunityMap.jsx` | The interactive map. It's free and needs no API key. |
| Custom `divIcon` markers | same file | Coloured round pins (green = available, grey = busy, red = request, blue = doctor, purple = nurse) |
| Privacy rules | same file | Homes are **never** drawn, except to the one volunteer who accepted (and to the resident themself). Requests show a 250 m circle around a point offset by ~100–200 m. |
| Matching "connections" | same file | Dashed lines from a request to the volunteers who were notified |
| Haversine distance + ranking | `src/lib/matching.js` | Filters: available, verified, has the needed skill, within 3 km. Score = 40% proximity + 35% reliability + 25% experience. The top 3 are notified. If all decline, the request goes to the next 3, then to the coordinator. |
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
  screens/Volunteer.jsx     Member 3: availability, accept/complete, trust, rewards
  screens/Doctor.jsx        Member 4: rotation calendar, call-back queue
  screens/Community.jsx     Member 1: coordinator map, check-ins, leaderboard, log
```

## Going further (beyond the hackathon)

- Swap `store.js` for **Supabase Realtime** to get real multi-device sync. The action functions stay the same.
- Real phone GPS via `navigator.geolocation` (only while a request is active, never continuous tracking).
- Emergency: integration with official channels (112 / AML / nora) needs approval. §4 NotrufV requires a human action to start an emergency call.
- GDPR: consent records, role-based access, and medical data visible only to clinicians.
