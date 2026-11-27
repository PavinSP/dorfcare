#!/usr/bin/env node
// Place ONE outbound "Clara" check-in call via ElevenLabs Agents + Twilio.
// Node 18+, no dependencies. Dry run by default — it only places a real call with --confirm.
//
//   node scripts/elevenlabs-call.mjs --to +4915100000007 --resident gertrud --name "Frau Klein" [--lang de] [--override-language] [--confirm]
//
// Env (shell or .env.local): ELEVENLABS_API_KEY, ELEVENLABS_CHECKIN_AGENT_ID, ELEVENLABS_PHONE_NUMBER_ID
// Optional: ELEVENLABS_API_BASE (default https://api.elevenlabs.io; e.g. the EU data-residency host)
//
// API: POST /v1/convai/twilio/outbound-call  (https://elevenlabs.io/docs/api-reference/twilio/outbound-call)
//   { agent_id, agent_phone_number_id, to_number, conversation_initiation_client_data: { dynamic_variables } }

import { existsSync } from 'node:fs'
import { parseArgs } from 'node:util'

// Node 20.12+/21.7+ can read .env.local itself; on older Node just export the variables in the shell.
for (const f of ['.env.local', '.env']) {
  if (existsSync(f) && typeof process.loadEnvFile === 'function') {
    try { process.loadEnvFile(f) } catch { /* ignore */ }
  }
}

const { values: a } = parseArgs({
  options: {
    to: { type: 'string' },
    resident: { type: 'string' },
    name: { type: 'string' },
    lang: { type: 'string', default: 'de' },
    'override-language': { type: 'boolean', default: false },
    confirm: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
})

const usage = 'Usage: node scripts/elevenlabs-call.mjs --to +49... --resident gertrud --name "Frau Klein" [--lang de|en] [--override-language] [--confirm]'
const fail = (msg) => { console.error(`✖ ${msg}\n${usage}`); process.exit(1) }

if (a.help) { console.log(usage); process.exit(0) }
if (!a.to) fail('--to is required')
const to = a.to.replace(/[\s\-()/]/g, '')
if (!/^\+[1-9]\d{6,14}$/.test(to)) fail(`--to must be an E.164 number like +4915112345678 (got "${a.to}")`)
if (!a.resident || !/^[a-z0-9_-]{1,40}$/.test(a.resident)) fail('--resident must be a resident id like "gertrud"')
if (!a.name) fail('--name is required, e.g. "Frau Klein"')
if (!['de', 'en'].includes(a.lang)) fail('--lang must be de or en')

const env = {
  key: process.env.ELEVENLABS_API_KEY ?? '',
  agent: process.env.ELEVENLABS_CHECKIN_AGENT_ID ?? '',
  phone: process.env.ELEVENLABS_PHONE_NUMBER_ID ?? '',
  base: (process.env.ELEVENLABS_API_BASE || 'https://api.elevenlabs.io').replace(/\/$/, ''),
}

const url = `${env.base}/v1/convai/twilio/outbound-call`
const body = {
  agent_id: env.agent || '<ELEVENLABS_CHECKIN_AGENT_ID>',
  agent_phone_number_id: env.phone || '<ELEVENLABS_PHONE_NUMBER_ID>',
  to_number: to,
  conversation_initiation_client_data: {
    // Used in the agent's first message / prompt ({{resident_name}}, {{language}}) and in the webhook tools ({{resident_id}}).
    dynamic_variables: { resident_name: a.name, resident_id: a.resident, language: a.lang },
    // Switching the spoken language needs "Language" override enabled in the agent's Security tab.
    ...(a['override-language'] ? { conversation_config_override: { agent: { language: a.lang } } } : {}),
  },
}

const masked = env.key ? `${env.key.slice(0, 4)}…(${env.key.length} chars)` : '<ELEVENLABS_API_KEY missing>'
console.log(`POST ${url}`)
console.log(`xi-api-key: ${masked}`)
console.log('Content-Type: application/json\n')
console.log(JSON.stringify(body, null, 2))

if (!a.confirm) {
  console.log('\nDry run only. Add --confirm to place the real call (costs money, rings a real phone).')
  process.exit(0)
}

const missing = Object.entries({ ELEVENLABS_API_KEY: env.key, ELEVENLABS_CHECKIN_AGENT_ID: env.agent, ELEVENLABS_PHONE_NUMBER_ID: env.phone })
  .filter(([, v]) => !v).map(([k]) => k)
if (missing.length) fail(`missing env: ${missing.join(', ')} (see .env.example)`)

const res = await fetch(url, {
  method: 'POST',
  headers: { 'xi-api-key': env.key, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
const text = await res.text()
console.log(`\n← ${res.status} ${res.statusText}\n${text}`)
// 200 → { success, message, conversation_id, callSid }
process.exit(res.ok ? 0 : 1)
