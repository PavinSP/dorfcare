import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

/**
 * Dev-only phone bridge for the demo (see docs/elevenlabs-phone-checkin.md).
 * An ElevenLabs agent's webhook tools POST here; the Landline screen polls GET and applies each event once.
 *   POST /api/phone-events  { type: 'checkin' | 'help', residentId, text? }
 *   GET  /api/phone-events  → [{ id, t, type, residentId, text }]
 *   DELETE /api/phone-events (local only) → clears rehearsal events on "Reset demo"
 * In-memory only (cleared when Vite restarts). Not part of the production build.
 */
function phoneEventsApi(secret) {
  const events = []
  const send = (res, status, body) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(body))
  }
  return {
    name: 'dorfconnect-phone-events',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/phone-events', (req, res) => {
        const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host ?? '')
        // With a secret set, anything arriving through the tunnel must carry it (the local browser poll does not need it).
        if (secret && !local && req.headers['x-dorfconnect-secret'] !== secret) return send(res, 401, { ok: false, error: 'bad secret' })
        if (req.method === 'GET') return send(res, 200, events)
        // "↺ Reset demo" clears rehearsal calls — only from this laptop, never through the tunnel.
        if (req.method === 'DELETE') {
          if (!local) return send(res, 403, { ok: false, error: 'local only' })
          events.length = 0
          return send(res, 200, { ok: true })
        }
        if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'GET, POST or DELETE only' })

        let raw = ''
        req.on('data', (c) => {
          raw += c
          if (raw.length > 10_000) req.destroy()
        })
        req.on('end', () => {
          let body
          try { body = JSON.parse(raw || '{}') } catch { return send(res, 400, { ok: false, error: 'invalid JSON' }) }
          // Accept our own shape and the snake_case names an agent tool might use.
          const residentId = String(body.residentId ?? body.resident_id ?? '').trim().toLowerCase()
          const text = typeof (body.text ?? body.request) === 'string' ? (body.text ?? body.request).trim().slice(0, 500) : ''
          const type = body.type ?? (text ? 'help' : 'checkin')
          if (!['checkin', 'help'].includes(type)) return send(res, 400, { ok: false, error: "type must be 'checkin' or 'help'" })
          if (!/^[a-z0-9_-]{1,40}$/.test(residentId)) return send(res, 400, { ok: false, error: 'residentId missing or invalid' })
          if (type === 'help' && !text) return send(res, 400, { ok: false, error: "type 'help' needs text" })

          const ev = { id: `ph-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, t: Date.now(), type, residentId, text }
          events.push(ev)
          if (events.length > 200) events.shift()
          send(res, 201, {
            ok: true,
            id: ev.id,
            // Short sentence the voice agent can use when the tool returns.
            message: type === 'checkin' ? 'Check-in recorded.' : 'Help request recorded. A volunteer or the coordinator will call back.',
          })
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), phoneEventsApi(env.PHONE_WEBHOOK_SECRET)],
    // Let a demo tunnel (cloudflared / ngrok) reach the dev server so ElevenLabs can call /api/phone-events.
    server: { allowedHosts: ['.trycloudflare.com', '.ngrok-free.app', '.ngrok.app'] },
  }
})
