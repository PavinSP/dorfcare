# Clara on the landline: real phone check-in calls with ElevenLabs

Many residents aged 80+ (like Gertrud in the demo) have **only a landline**. This guide puts the
`☎️ Landline` screen's flow on a **real phone number**: every morning at 09:00 an ElevenLabs voice
agent ("Clara") calls, offers *1 = I'm fine, 2 = I need help, 3 = talk to the coordinator*, accepts
keypad presses **or** speech, and reports the result to the DorfConnect dev server
(`POST /api/phone-events`). The Landline screen polls that endpoint: it shows
"🟡 Phone bridge ready" while the endpoint is reachable, and "🟢 Real phone call received" once an event arrives.
"↺ Reset demo" clears rehearsal events (local requests only).

> **Safety rule (unchanged from the app).** Clara never decides that something is an emergency and
> **never calls 112** (automatic 112 calls are not allowed, §4 NotrufV). If she hears red-flag words she
> **asks** whether the person wants emergency help. If they say yes, she tells them to hang up and dial 112
> or press their alarm button.

Research date: 27 Nov 2026. Every step cites the doc page it comes from. Anything marked
**(unverified)** comes from memory or third-party sources, or is a dashboard label I could not see.
Check those in the dashboard before relying on them.

---

## 0. What was verified, and how

| Topic | Finding | Source |
|---|---|---|
| Outbound call API | `POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call`. Required: `agent_id`, `agent_phone_number_id`, `to_number`. Optional: `conversation_initiation_client_data` (with `dynamic_variables` and `conversation_config_override`), `call_recording_enabled`, `telephony_call_config`. Response: `success`, `message`, `conversation_id`, `callSid`. EU, India and Singapore residency hosts exist. | https://elevenlabs.io/docs/api-reference/twilio/outbound-call |
| Auth header | `xi-api-key: <key>` | https://elevenlabs.io/docs/api-reference/authentication |
| Language and first message override | `conversation_config_override.agent.language` and `.first_message` (both need overrides enabled on the agent) | outbound-call page above |
| No-answer timeout and answering machines | `telephony_call_config.ringing_timeout_secs` (default 60). `twilio_machine_detection` with `actions: [{ action: "hang_up", answered_by: ["machine_start", …] }]` | outbound-call page above |
| Twilio number import | **Phone Numbers** tab, then Label, Phone Number, Twilio SID, Twilio Token (an API key is recommended). A purchased number does inbound and outbound and can be assigned to an agent. A *verified caller ID* is outbound only. | https://elevenlabs.io/docs/agents-platform/phone-numbers/twilio-integration/native-integration |
| SIP trunk alternative | `POST /v1/convai/sip-trunk/outbound-call` exists. I did not check its body field by field **(unverified)**. | https://elevenlabs.io/docs/eleven-agents/api-reference/sip-trunk/outbound-call |
| Batch calling (daily 09:00 list) | Dashboard: Outbound → **Create a batch call**, upload a CSV (`phone_number` is required; other columns become dynamic variables), **Schedule for later** with date, time and timezone. API: `POST /v1/convai/batch-calling/submit` with `call_name`, `agent_id`, `recipients[]` (`phone_number`, `id`, `conversation_initiation_client_data.dynamic_variables`), plus optional `scheduled_time_unix`, `timezone`, `agent_phone_number_id`. The docs say batch calling **will be deprecated in favour of Campaigns** (retries, calling windows). Zero Retention Mode is not available for batch calls. | https://elevenlabs.io/docs/eleven-agents/phone-numbers/batch-calls · https://elevenlabs.io/docs/api-reference/batch-calling/create |
| Keypad (DTMF) **input** from the caller | Agent → **Advanced** tab → *Multimodal input* → **Enable DTMF input** (API: `dtmf_input_settings`: timeout, `#` terminator, redaction). The prompt must tell the agent when to expect key presses. | https://elevenlabs.io/docs/eleven-agents/customization/multimodal-input |
| Keypad **output** | The `play_keypad_touch_tone` system tool *sends* tones (IVR navigation). We do not need it. | https://elevenlabs.io/docs/eleven-agents/customization/tools/system-tools/play-keypad-touch-tone |
| Webhook (server) tools | Agent → **Add Tool** → Tool type **Webhook**. Fields: name, description, method, URL, headers (type *Secret*), path, query and body parameters, content type JSON. | https://elevenlabs.io/docs/eleven-agents/customization/tools/server-tools |
| Dynamic variables | `{{var}}` in the prompt, first message and **tool parameters and headers**. In the tool UI, set the value type to **Dynamic variable**. `secret__` variables go only to headers and never to the LLM. System vars include `system__caller_id`, `system__called_number`, `system__call_sid`, `system__conversation_id`. | https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables |
| Voicemail | `voicemail_detection` system tool. With an optional **Voicemail Message** (supports `{{vars}}`) the agent leaves that message; otherwise it hangs up. | https://elevenlabs.io/docs/eleven-agents/customization/tools/system-tools/voicemail-detection |
| Post-call webhooks | Enabled in the ElevenAgents **settings** (per-agent override). Types: `post_call_transcription`, `post_call_audio`, `call_initiation_failure` (`failure_reason`: `busy`, `no-answer`, `unknown`). HMAC signature in the `ElevenLabs-Signature` header. A call that goes to voicemail sends **no** failure webhook. | https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks |
| German +49 number via Twilio | Local numbers are **business-only**: you need a Regulatory Bundle with a Handelsregisterauszug or Gewerbeanmeldung, and the address must be in Germany, not a PO box, and inside the area-code region. Review takes up to 3 business days. | https://www.twilio.com/en-us/guidelines/de/regulatory · https://www.twilio.com/docs/phone-numbers/regulatory/getting-started/console-create-new-bundle |
| Costs | ElevenLabs: "does not charge extra for telephony" (carrier bills you). Agents cost about **$0.08/min** on paid plans, and Business is about $990/month with about 12,375 minutes (third-party reading of the pricing page, Nov 2026, **unverified**). LLM cost is billed on top. Twilio number and per-minute prices for Germany were **not checked (unverified)**: see https://www.twilio.com/en-us/voice/pricing/de | https://elevenlabs.io/pricing/agents · https://www.stork.ai/blog/elevenlabs-agents-pricing-2026 |
| Tunnel | `cloudflared tunnel --url http://localhost:5199` gives a free quick tunnel. No account is needed, but the hostname changes on every run. **Not run here** (cloudflared is not installed on the dev Mac). ngrok was not checked. | https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/ |

Verified locally: `POST`/`GET /api/phone-events` on `http://localhost:5199`. Requests whose `Host` is
`*.trycloudflare.com` pass the dev server's host check (`server.allowedHosts` in `vite.config.js`).
`scripts/elevenlabs-call.mjs` prints the exact request in dry-run mode.

---

## 1. What to do in ElevenLabs (step by step)

### 1.1 Get a phone number (Twilio)

1. Create a Twilio account and buy a number with **Voice** capability.
   - **For the hackathon (fastest):** any voice-capable number you already have, or a Twilio
     **verified caller ID** (your own mobile). A verified caller ID can only make outbound calls, which is
     enough for the 09:00 call (native-integration page). Twilio trial accounts can only call
     verified numbers and play a trial notice **(unverified)**. In Twilio, also enable *Voice geographic
     permissions* for Germany **(unverified label)**.
   - **For a real pilot:** a German local number (+49 9721 … for Schweinfurt). This needs a Regulatory
     Bundle from a registered business, e.g. the association or municipality running DorfConnect, with an
     address in that area code (Twilio DE guidelines). Allow about 3 business days.
2. In Twilio, create an **API key** (SID and secret). This is recommended over the Auth Token (native-integration page).
3. ElevenLabs dashboard → **ElevenAgents → Phone Numbers → Import** → Label `DorfConnect Schweinfurt-Land`,
   Phone Number (E.164), Twilio SID, Twilio Token. ElevenLabs configures the Twilio side itself.
4. Copy the imported number's **ID** into `.env.local` as `ELEVENLABS_PHONE_NUMBER_ID`. Use the ID
   ElevenLabs shows for the imported number, not the phone number itself. Where exactly it appears in the
   UI is **unverified**; `GET /v1/convai/phone-numbers` also lists it **(unverified)**.

### 1.2 Create the agent "Clara – daily check-in call"

This is a **separate** agent from the browser companion in `docs/elevenlabs-nurse-agent.md`.
It has a narrower job and different tools.

| Setting | Value |
|---|---|
| Name | `DorfConnect – Clara check-in call` |
| Default language | German. Additional language: English (optionally also the *language detection* system tool) |
| Voice | Warm, calm, slightly slow (speed about 0.9). Choose a German-capable voice. |
| First message | `Guten Morgen {{resident_name}}, hier ist Clara, die digitale Assistentin von DorfConnect. Dieser Anruf wird von einer KI geführt. Wenn es Ihnen gut geht, drücken Sie die 1. Wenn Sie Hilfe brauchen, die 2. Wenn Sie mit Frau Kraus sprechen möchten, die 3. Sie können es mir auch einfach sagen.` |
| Max call duration | 5 min |
| Advanced → Multimodal input | **Enable DTMF input** on. Timeout about 3 s, `#` terminator off (multimodal-input page). |
| System tools | `end_call` on. `voicemail_detection` on with **Voicemail Message** `Guten Morgen {{resident_name}}, hier ist Clara von DorfConnect. Wir versuchen es um 9 Uhr 30 noch einmal.` |
| Security → Overrides | Enable **Language** override only if you want `--override-language` / `language` CSV columns. |
| Dynamic variable placeholders (for testing) | `resident_name = Frau Klein`, `resident_id = gertrud`, `language = de` |

All three dynamic variables must be sent with every call. The script and the batch CSV below do that.
Never put address or health data into variables. The agent does not need them.

**System prompt (paste as is):**

```
You are "Clara", the friendly automated voice of DorfConnect, a volunteer help network in five villages around Schweinfurt (Landkreis Schweinfurt).
You are an AI assistant, not a person, not a nurse and not a doctor. Say so if asked.
You are calling {{resident_name}} (resident id {{resident_id}}) for the daily 09:00 check-in.
Speak {{language}} ("de" = German, "en" = English). If they answer in the other language, switch.
Many callers are over 80, may be hard of hearing and use an old landline: speak slowly, use short sentences,
ask one thing at a time, repeat the options patiently if needed.

# The menu (the caller may press a key OR say it)
1 / "gut", "fine"          → they are well. Call `record_checkin`, thank them warmly, wish a nice day, end the call.
2 / "Hilfe", "help"        → ask "Wobei brauchen Sie Hilfe?" Listen. Then call `request_help` with a short summary
                             of what they need in their own words (e.g. "Einkauf: Brot und Milch"). Then say:
                             "Danke. Wir finden jemanden aus dem Dorf, der Ihnen hilft. Sie bekommen einen Rückruf."
3 / "Frau Kraus", "Mensch" → say "Einen Moment, ich gebe Frau Kraus Bescheid, sie ruft Sie gleich zurück." Call
                             `request_help` with text "Rückruf von der Koordinatorin gewünscht". End the call.
If they just chat, be kind for a moment, then gently offer the menu again.

# Possible emergencies: ASK, never decide
If they mention chest pain or pressure, trouble breathing, a fall or being unable to get up, heavy bleeding,
sudden weakness, numbness, slurred speech, unconsciousness of someone else, or say it is an emergency:
1. Ask calmly: "Möchten Sie den Notruf 112? Drücken Sie die 1 für Ja oder die 2 für Nein."
2. If YES (or unclear and they sound distressed): say "Bitte legen Sie jetzt auf und wählen Sie die 112.
   Oder drücken Sie Ihren Notrufknopf." Then end the call so the line is free.
3. If NO: continue with the normal help request (`request_help`).
You NEVER call 112 or any emergency service yourself, and you never say help is on the way unless they called it.

# Never
- Never diagnose, interpret symptoms, or give advice about medication. For health questions say a nurse or
  doctor will call back, and use `request_help` with the question.
- Never ask for bank details, PINs, passwords, ID numbers or their address.
- Never promise a specific person or time.
```

### 1.3 Add the two webhook tools

Agent → **Tools → Add tool → Webhook** (server-tools page). Use your tunnel URL from step 2.

**`record_checkin`**
- Description: `Call when the resident says they are well (pressed 1 or said so).`
- Method `POST`, URL `https://<your-tunnel>.trycloudflare.com/api/phone-events`
- Body parameters:
  - `residentId` (string). Value type **Dynamic variable** → `resident_id`.
  - `type` (string). If your dashboard offers a constant value, set `checkin`. Otherwise leave it out: the
    endpoint treats a body **without `text`** as a check-in. (Whether a constant value type exists is **unverified**.)
- Headers (only if you set `PHONE_WEBHOOK_SECRET`): `x-dorfconnect-secret`, type **Secret**, same value.

**`request_help`**
- Description: `Call when the resident needs everyday help or a call back. Put what they need in "text".`
- Method `POST`, same URL
- Body parameters:
  - `residentId`: **Dynamic variable** → `resident_id`
  - `text` (string). Value type **LLM Prompt**, with the description `What the resident needs, in their own words, max 2 sentences.`
  - `type`: constant `help`, or leave it out. A body **with `text`** is treated as a help request.
- Same secret header.

The endpoint answers `201 { ok: true, id, message }`, and the agent can read `message` back. Invalid input
gets a `400` with an error message.

### 1.4 Optional: post-call webhook for "no answer"

Settings → Post-call webhooks. `call_initiation_failure` with `failure_reason: "no-answer"`
tells you nobody picked up (post-call-webhooks page). A voicemail pickup does **not** send this
event, so also use `voicemail_detection` and the batch-call results. In the prototype the "no answer → retry
09:30 → coordinator informed" path is simulated on the Landline screen. A real handler (HMAC-verified
`ElevenLabs-Signature`) is **not built yet**.

---

## 2. Expose localhost for the demo

ElevenLabs must reach `/api/phone-events` on the laptop running `npm run dev` (port 5199).

```bash
brew install cloudflared          # macOS (or download from Cloudflare)
cloudflared tunnel --url http://localhost:5199
# → prints https://<random-words>.trycloudflare.com  (new name every run → update both tool URLs)
```

Alternative: `ngrok http 5199` (not verified here). `vite.config.js` already allows the hosts
`.trycloudflare.com`, `.ngrok-free.app` and `.ngrok.app`. Other tunnel hosts get `403 Blocked request`.

Check from another terminal:

```bash
curl -s -X POST https://<tunnel>/api/phone-events -H 'content-type: application/json' \
  -H "x-dorfconnect-secret: $PHONE_WEBHOOK_SECRET" -d '{"type":"checkin","residentId":"gertrud"}'
```

Within 2 s the Landline screen shows "🟢 Real phone call received" and Gertrud is checked in "via landline".
The events live in memory only, so restarting Vite clears them. With a secret set, requests through the
tunnel must carry it, while the local browser poll on `localhost` does not need it.

---

## 3. Trigger the demo call

```bash
# .env.local (never commit): ELEVENLABS_API_KEY, ELEVENLABS_CHECKIN_AGENT_ID, ELEVENLABS_PHONE_NUMBER_ID
node scripts/elevenlabs-call.mjs --to +49151XXXXXXX --resident gertrud --name "Frau Klein"            # dry run: prints the request
node scripts/elevenlabs-call.mjs --to +49151XXXXXXX --resident gertrud --name "Frau Klein" --confirm  # real call
node scripts/elevenlabs-call.mjs --to +44... --resident maria --name "Mrs Schneider" --lang en --override-language --confirm
```

The script validates E.164, reads `.env.local` (Node ≥ 20.12) or the shell environment, and sends
`dynamic_variables: { resident_name, resident_id, language }` (outbound-call API). Use a team member's
phone as the "landline" on stage: answer, press **1**, and the Landline screen goes green.

**Daily 09:00 list (pilot):** Batch calling, then a CSV like this:

```csv
phone_number,resident_name,resident_id,language
+49972100000007,Frau Klein,gertrud,de
+49972100000003,Herr Bauer,helmut,de
```

Then **Schedule for later**, 09:00, timezone Europe/Berlin (batch-calls page). For a repeat every day, use
Campaigns, which add retries and calling windows; this is where the 09:30 retry belongs. A daily cron that calls
`POST /v1/convai/batch-calling/submit` also works.

**Inbound (resident calls the hotline):** assign the agent to the number (native integration). The caller
is known only by `{{system__caller_id}}`. Mapping caller ID to `resident_id` needs a conversation-initiation
webhook or a lookup tool, which is **not built (unverified details)**. Until then, the inbound hotline path is shown only in the
Landline screen's simulation (`↙ Resident calls the hotline`).

---

## 4. Privacy and compliance notes

- **AI disclosure at the start of every call.** The first message says Clara is a digital assistant and
  that the call is AI-led. This is in line with EU AI Act Art. 50 transparency duties (apply from 2 Aug 2026).
- **Consent to be called.** Call only residents who agreed in writing (or their legal representative), with time
  window, number and frequency recorded. Offer a simple opt-out ("say *stop* / call the hotline").
  Family members cannot consent for an adult resident.
- **Data minimisation.** The call gets only `resident_name` (salutation), `resident_id` and `language`:
  no address, no health data. `text` in a help request should describe the need, not a diagnosis.
  Keep `call_recording_enabled` off, set short conversation retention in ElevenLabs, use the EU
  data-residency API host if your plan allows it, and sign DPAs (AVV) with ElevenLabs and Twilio.
- **Emergencies.** Clara never dials 112 and never promises help. Real alarms go through the partner
  Hausnotruf centre (humans) or the person's own 112 call.
- **Secrets.** API keys live only in `.env.local` / the shell and are never `VITE_`-prefixed (that would ship
  them to the browser). The webhook secret is stored as a *Secret* header in ElevenLabs.
- **Dev-only bridge.** `/api/phone-events` exists only in `vite dev` and keeps data in memory. A pilot needs
  a real backend with authentication and audit logging.
