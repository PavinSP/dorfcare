#!/usr/bin/env node
// Records the 2-minute DorfConnect demo video from the REAL running app, following scripts/demo-storyboard.mjs.
//
//   npm run dev                       # app must be running (default http://localhost:5199)
//   node scripts/record-demo.mjs      # → ../video/dorfconnect-demo.mp4 (+ .srt subtitles, silent .webm)
//
// Options: --base http://localhost:5173   --out <dir>   --no-voice   --chrome <path to Chrome>
// Needs: Google Chrome, playwright-core (devDependency), ffmpeg; voiceover uses the macOS `say` command
// (voices "Daniel" for the narrator, "Samantha" for Clara). Without `say`/ffmpeg you still get the silent .webm.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { SCENES, VIDEO_SECONDS } from './demo-storyboard.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : fallback
}
const BASE = arg('base', 'http://localhost:5199').replace(/\/$/, '')
const OUT = resolve(arg('out', join(process.cwd(), '..', 'video')))
const CHROME = arg('chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
const VOICE = !process.argv.includes('--no-voice')
const W = 1600
const H = 900

mkdirSync(OUT, { recursive: true })
const RAW = join(OUT, 'raw')
rmSync(RAW, { recursive: true, force: true })
mkdirSync(RAW, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const has = (cmd) => { try { execFileSync('which', [cmd], { stdio: 'ignore' }); return true } catch { return false } }

// ---------- overlay: title cards, captions, a visible cursor with click ripples ----------
const OVERLAY = `
(() => {
  if (window.__dc) return
  const css = document.createElement('style')
  css.textContent = \`
    #dc-title{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;
      background:rgba(15,118,110,.94);color:#fff;font-family:Inter,system-ui,sans-serif;opacity:0;transition:opacity .6s;pointer-events:none;text-align:center;padding:0 10%}
    #dc-title.on{opacity:1}
    #dc-title h1{font:700 64px/1.1 'Space Grotesk',Inter,system-ui,sans-serif;margin:0}
    #dc-title p{font-size:26px;margin:0;opacity:.92;max-width:1100px}
    #dc-cap{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99998;max-width:1200px;padding:12px 22px;border-radius:14px;
      background:rgba(15,23,22,.86);color:#fff;font:500 22px/1.35 Inter,system-ui,sans-serif;text-align:center;opacity:0;transition:opacity .4s;pointer-events:none}
    #dc-cap.on{opacity:1}
    #dc-cap b{color:#5eead4}
    #dc-cur{position:fixed;z-index:100000;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(15,23,22,.85);
      border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);transition:left .55s cubic-bezier(.3,.7,.3,1),top .55s cubic-bezier(.3,.7,.3,1);pointer-events:none;left:${W / 2}px;top:${H / 2}px}
    .dc-ripple{position:fixed;z-index:99999;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid #14b8a6;pointer-events:none;animation:dcr .6s ease-out forwards}
    @keyframes dcr{to{transform:scale(4.5);opacity:0}}\`
  document.head.appendChild(css)
  const mk = (id) => { const e = document.createElement('div'); e.id = id; document.body.appendChild(e); return e }
  const title = mk('dc-title'), cap = mk('dc-cap'), cur = mk('dc-cur')
  window.__dc = {
    title(h, p, opaque) { title.innerHTML = '<h1>' + h + '</h1>' + (p ? '<p>' + p + '</p>' : ''); title.style.background = opaque ? '#0f766e' : ''; title.classList.add('on') },
    hideTitle() { title.classList.remove('on') },
    caption(t) { if (!t) { cap.classList.remove('on'); return } cap.innerHTML = t; cap.classList.add('on') },
    move(x, y) { cur.style.left = x + 'px'; cur.style.top = y + 'px' },
    ripple(x, y) { const r = document.createElement('div'); r.className = 'dc-ripple'; r.style.left = x + 'px'; r.style.top = y + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 700) },
  }
})()`

async function main() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const context = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: RAW, size: { width: W, height: H } } })
  const page = await context.newPage()
  const recStart = Date.now() // the video starts when the page is created
  page.on('pageerror', (e) => console.warn('page error:', e.message))
  const overlay = () => page.evaluate(OVERLAY)

  // A click the viewer can follow: glide the cursor to the element, ripple, then click.
  async function show(locator, { click = true, pause = 350 } = {}) {
    const el = locator.first()
    await el.waitFor({ state: 'visible', timeout: 15000 })
    await el.scrollIntoViewIfNeeded()
    const b = await el.boundingBox()
    const x = b.x + b.width / 2
    const y = b.y + b.height / 2
    await page.evaluate(([x, y]) => window.__dc.move(x, y), [x, y])
    await sleep(600)
    if (click) {
      await page.evaluate(([x, y]) => window.__dc.ripple(x, y), [x, y])
      await el.click()
    }
    await sleep(pause)
  }
  const tab = (hash) => show(page.locator(`a[href="#${hash}"]`))
  const caption = (t) => page.evaluate((t) => window.__dc.caption(t), t)
  const smoothTo = (locator) => locator.first().evaluate((el) => el.scrollIntoView({ behavior: 'smooth', block: 'center' }))

  // ---------- preparation (hidden behind an opaque card, trimmed from the final video) ----------
  await page.goto(`${BASE}/#resident`)
  await overlay()
  await page.evaluate(() => window.__dc.title('Preparing demo…', '', true))
  await page.click('text=Reset demo')
  await fetch(`${BASE}/api/phone-events`, { method: 'DELETE' }).catch(() => {})
  await page.click('button:has-text("EN")')
  // Pre-stage Maria's medical question so the doctor scene starts with it in the queue.
  await page.click('button:has-text("I need some help")')
  await page.fill('textarea', 'My blood pressure is very high and I feel dizzy')
  await page.click('button:has-text("Ask for help")')
  await page.goto(`${BASE}/#community`)
  await overlay()
  await page.evaluate(() => window.__dc.title('Preparing demo…', '', true))
  await page.waitForLoadState('networkidle').catch(() => {})
  await sleep(2500) // map tiles

  // ---------- the video ----------
  const s = Object.fromEntries(SCENES.map((x) => [x.id, x]))
  const t0 = Date.now()
  const at = async (sec) => { const wait = t0 + sec * 1000 - Date.now(); if (wait > 0) await sleep(wait) }
  const log = []
  const mark = (id) => log.push({ id, t: ((Date.now() - t0) / 1000).toFixed(1) })

  // 0:00 intro
  mark('intro')
  await page.evaluate(([h, p]) => window.__dc.title(h, p, false), [s.intro.title, s.intro.subtitle])
  await at(8); await page.evaluate(() => window.__dc.hideTitle())

  // 0:09 problem
  await at(s.problem.from); mark('problem')
  await caption(s.problem.caption)

  // 0:21 landline
  await at(s.landline.from); mark('landline')
  await caption(s.landline.caption)
  await tab('landline')
  await show(page.locator('button:has-text("Start the 09:00 call")'))
  await sleep(1200)
  await show(page.locator('button:has-text("Pick up")'))
  await at(s.landline.clara.at - 0.5)
  await caption(`<b>Clara:</b> “${s.landline.clara.text}”`)
  await at(s.landline.clara.at + 5.5)
  await show(page.getByRole('button', { name: 'Key 1' }))
  await caption(s.landline.caption)

  // 0:40 request
  await at(s.request.from); mark('request')
  await caption(s.request.caption)
  await tab('resident')
  await show(page.locator('button:has-text("I need some help")'))
  await show(page.locator('button:has-text("Ride to doctor")'))
  await show(page.locator('button:has-text("Ask for help")'))
  await sleep(1200)
  await tab('community')
  await sleep(2500)

  // 0:58 volunteer
  await at(s.volunteer.from); mark('volunteer')
  await caption(s.volunteer.caption)
  await tab('volunteer')
  await show(page.locator('text=Your regular: Maria'), { click: false, pause: 2000 })
  await show(page.getByRole('button', { name: 'Accept', exact: true }))
  await sleep(1500)
  await show(page.locator('text=Your active task'), { click: false, pause: 1500 })

  // 1:12 nurse
  await at(s.nurse.from); mark('nurse')
  await caption(s.nurse.caption)
  await tab('doctor')
  const task = page.getByLabel('Task').first()
  await show(task, { click: false, pause: 200 })
  await task.selectOption('telemed')
  await show(page.locator('button:has-text("Send nurse")'))
  await sleep(800)
  await tab('nurse')
  await show(page.getByRole('button', { name: 'Accept', exact: true }))
  await show(page.locator('button:has-text("Start tele-consult")'))
  const note = page.locator('textarea').first()
  await show(note)
  await note.pressSequentially('BP 165/95, Ramipril adjusted, re-check in 3 days', { delay: 22 })
  await show(page.locator('button:has-text("End & document")'))

  // 1:34 rotation
  await at(s.rotation.from); mark('rotation')
  await caption(s.rotation.caption)
  await tab('doctor')
  await smoothTo(page.locator('text=The doctor comes to the villages'))
  await sleep(3500)
  await smoothTo(page.locator('h3', { hasText: 'Village-hall consultations: branch practice' }))
  await sleep(4000)

  // 1:46 family
  await at(s.family.from); mark('family')
  await caption(s.family.caption)
  await tab('family')
  await sleep(2500)

  // 1:53 outro
  await at(s.outro.from); mark('outro')
  await caption('')
  await page.evaluate(([h, p]) => window.__dc.title(h, p, false), [s.outro.title, s.outro.subtitle])
  await at(VIDEO_SECONDS + 0.5)

  const trimStart = (t0 - recStart) / 1000
  await context.close()
  await browser.close()
  const webm = readdirSync(RAW).find((f) => f.endsWith('.webm'))
  const silent = join(OUT, 'dorfconnect-demo-silent.webm')
  renameSync(join(RAW, webm), silent)
  rmSync(RAW, { recursive: true, force: true })
  console.log('scene start times (s):', log.map((l) => `${l.id}@${l.t}`).join('  '))
  for (const l of log) {
    const planned = s[l.id].from
    if (Math.abs(+l.t - planned) > 1.5) console.warn(`⚠️ scene ${l.id} started at ${l.t}s, planned ${planned}s`)
  }
  return { silent, trimStart }
}

// ---------- subtitles ----------
function srt() {
  const ts = (sec) => {
    const ms = Math.round(sec * 1000)
    const p = (n, w = 2) => String(n).padStart(w, '0')
    return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`
  }
  const cues = []
  for (const sc of SCENES) {
    cues.push([sc.from + 0.3, sc.to - 0.2, sc.vo])
    if (sc.clara) cues.push([sc.clara.at, sc.clara.at + 5, `Clara: ${sc.clara.text}`])
  }
  cues.sort((a, b) => a[0] - b[0])
  return cues.map((c, i) => `${i + 1}\n${ts(c[0])} --> ${ts(Math.min(c[1], cues[i + 1]?.[0] ?? c[1]))}\n${c[2]}\n`).join('\n')
}

// ---------- voiceover + final mp4 ----------
function voiceAndMux({ silent, trimStart }) {
  const out = join(OUT, 'dorfconnect-demo.mp4')
  const srtPath = join(OUT, 'dorfconnect-demo.srt')
  writeFileSync(srtPath, srt())
  if (!has('ffmpeg')) { console.warn('ffmpeg not found: kept the silent .webm only'); return }
  const tmp = join(OUT, 'vo')
  rmSync(tmp, { recursive: true, force: true })
  mkdirSync(tmp)
  const clips = []
  if (VOICE && has('say')) {
    const dur = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim()
    for (const sc of SCENES) {
      const f = join(tmp, `${sc.id}.aiff`)
      execFileSync('say', ['-v', 'Daniel', '-r', '172', '-o', f, sc.vo])
      const d = dur(f)
      const room = sc.to - sc.from - 0.6
      console.log(`voice ${sc.id.padEnd(9)} ${d.toFixed(1)}s / ${room.toFixed(1)}s ${d > room ? '⚠️ too long for the scene' : ''}`)
      clips.push({ f, at: sc.from + 0.4 })
      if (sc.clara) {
        const c = join(tmp, `${sc.id}-clara.aiff`)
        execFileSync('say', ['-v', 'Samantha', '-r', '160', '-o', c, sc.clara.text])
        clips.push({ f: c, at: sc.clara.at })
      }
    }
  }
  const args = ['-y', '-ss', trimStart.toFixed(2), '-i', silent]
  for (const c of clips) args.push('-i', c.f)
  if (clips.length) {
    const delays = clips.map((c, i) => `[${i + 1}:a]adelay=${Math.round(c.at * 1000)}|${Math.round(c.at * 1000)}[a${i}]`).join(';')
    const mix = `${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0[aout]`
    args.push('-filter_complex', `${delays};${mix}`, '-map', '0:v', '-map', '[aout]', '-c:a', 'aac', '-b:a', '160k')
  }
  args.push('-t', String(VIDEO_SECONDS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', out)
  execFileSync('ffmpeg', args, { stdio: 'ignore' })
  rmSync(tmp, { recursive: true, force: true })
  console.log(`✔ ${out}\n✔ ${srtPath}\n✔ ${silent}`)
}

const rec = await main()
voiceAndMux(rec)
if (!existsSync(join(OUT, 'dorfconnect-demo.mp4'))) process.exitCode = 1
