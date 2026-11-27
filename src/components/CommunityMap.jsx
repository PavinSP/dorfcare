import { Fragment } from 'react'
import L from 'leaflet'
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip } from 'react-leaflet'
import { MATCH_RADII_KM, MUNICIPALITIES, REGION_CENTER, SCHWEINFURT, TYPE_LABEL } from '../data/seed'
import { formatDistance, haversineKm } from '../lib/matching'

/*
  Privacy rules enforced HERE (the only place locations are drawn):
  - Residents' homes are NEVER drawn, except:
      · to the one volunteer who accepted that resident's request (viewer = that volunteer)
      · to the resident themself (their own home)
  - Open requests are shown as a ~250 m circle around an offset point, never an exact pin.
*/

const COLORS = {
  available: '#16a34a',
  busy: '#94a3b8',
  offline: '#cbd5e1',
  request: '#dc2626',
  accepted: '#f59e0b',
  clinic: '#2563eb',
  nurse: '#7c3aed',
  home: '#0f766e',
}

const townLabel = (name) =>
  L.divIcon({ className: '', html: `<div class="dc-town">${name}</div>`, iconSize: [110, 20], iconAnchor: [55, -18] })

function pin(color, label, extra = '') {
  return L.divIcon({
    className: '',
    html: `<div class="dc-pin ${extra}" style="background:${color}">${label}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

export default function CommunityMap({ state, mode = 'community', viewerId, height = 520 }) {
  const { volunteers, facilities, requests, residents, nurses = [] } = state
  const resident = (id) => residents.find((r) => r.id === id)
  const active = requests.filter((q) => q.status === 'open' || q.status === 'accepted' || q.status === 'escalated')

  const visibleVolunteers = volunteers.filter((v) => {
    if (mode === 'community') return true
    if (mode === 'volunteer') return true
    // resident: only see the volunteer coming to you
    return active.some((q) => q.residentId === viewerId && q.assignedTo === v.id)
  })
  // With 16 volunteers on a regional map, only label the ones involved in an open request (others on hover).
  const involved = new Set(active.flatMap((q) => [...q.notified, q.assignedTo].filter(Boolean)))
  const me = mode === 'volunteer' ? volunteers.find((v) => v.id === viewerId) : null
  const home = mode === 'resident' ? resident(viewerId) : null
  const view = home ? { c: home, z: 14 } : me ? { c: me, z: 13 } : { c: REGION_CENTER, z: 12 }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm" style={{ height }}>
      <MapContainer key={`${mode}-${viewerId ?? ''}`} center={[view.c.lat, view.c.lng]} zoom={view.z} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mode !== 'resident' && [...Object.values(MUNICIPALITIES), SCHWEINFURT].map((m) => (
          <Marker key={m.name} position={[m.lat, m.lng]} icon={townLabel(m.name)} interactive={false} />
        ))}

        {me && (
          <Circle center={[me.lat, me.lng]} radius={MATCH_RADII_KM[0] * 1000} pathOptions={{ color: COLORS.available, weight: 1, dashArray: '4 6', fillOpacity: 0.03 }}>
            <Tooltip sticky>Your {MATCH_RADII_KM[0]} km area</Tooltip>
          </Circle>
        )}

        {mode !== 'resident' && nurses.map((n) => (
          <Fragment key={n.id}>
            {mode === 'community' && (
              <Circle center={[n.lat, n.lng]} radius={n.serviceAreaKm * 1000} pathOptions={{ color: COLORS.nurse, weight: 1, opacity: 0.35, fillOpacity: 0.02 }} />
            )}
            <Marker position={[n.lat, n.lng]} icon={pin(n.accepting && n.booked < n.capacity ? COLORS.nurse : COLORS.busy, 'N')}>
              <Tooltip direction="top" offset={[0, -16]}>{n.name} · {n.service}</Tooltip>
              <Popup>
                <b>{n.name}</b> · {n.qualification}<br />
                {n.service}<br />
                {n.hours} · {n.booked}/{n.capacity} visits today<br />
                {n.accepting ? '✔ accepting new visits' : '✖ fully booked'} · area {n.serviceAreaKm} km
              </Popup>
            </Marker>
          </Fragment>
        ))}

        {facilities.map((f) => (
          <Marker key={f.id} position={[f.lat, f.lng]} icon={pin(f.kind === 'nurse' ? COLORS.nurse : COLORS.clinic, f.kind === 'nurse' ? 'N' : '+')}>
            <Popup>{f.name}</Popup>
          </Marker>
        ))}

        {visibleVolunteers.map((v) => (
          <Marker
            key={v.id}
            position={[v.lat, v.lng]}
            icon={pin(COLORS[v.status] ?? COLORS.busy, v.name[0], v.id === viewerId ? 'dc-me' : '')}
          >
            <Tooltip direction="top" offset={[0, -16]} permanent={mode !== 'resident' && (involved.has(v.id) || v.id === viewerId)}>
              {v.name.split(' ')[0]}{v.id === viewerId ? ' (you)' : ''}
            </Tooltip>
            <Popup>
              <b>{v.name}</b><br />
              {v.status} · reliability {v.reliability}/100<br />
              {v.verified ? '✔ identity verified' : '✖ not verified yet'}<br />
              skills: {v.skills.join(', ')}
            </Popup>
          </Marker>
        ))}

        {active.map((q) => {
          const r = resident(q.residentId)
          const showExact =
            (mode === 'volunteer' && q.assignedTo === viewerId) || (mode === 'resident' && q.residentId === viewerId)
          const color = q.status === 'accepted' ? COLORS.accepted : COLORS.request
          const helper = volunteers.find((v) => v.id === q.assignedTo)
          const notifiedVols = q.notified.map((id) => volunteers.find((v) => v.id === id)).filter(Boolean)

          return (
            <Fragment key={q.id}>
              {!showExact && (
                <>
                  <Circle center={[q.approx.lat, q.approx.lng]} radius={250} pathOptions={{ color, dashArray: '6 6', fillOpacity: 0.12 }} />
                  <Marker position={[q.approx.lat, q.approx.lng]} icon={pin(color, '!', q.status === 'open' ? 'dc-pulse' : '')}>
                    <Tooltip direction="bottom" offset={[0, 16]} permanent>
                      {q.status === 'accepted' ? 'Help on the way' : q.status === 'escalated' ? 'Needs coordinator' : 'Help requested'}
                    </Tooltip>
                    <Popup>
                      <b>{TYPE_LABEL[q.type]}</b><br />“{q.text}”<br />
                      <i>Approximate area only · exact address protected</i>
                    </Popup>
                  </Marker>
                </>
              )}

              {/* "Connection" lines from the request to the volunteers being asked */}
              {mode !== 'resident' && q.status === 'open' &&
                notifiedVols.map((v) => (
                  <Polyline key={v.id} positions={[[q.approx.lat, q.approx.lng], [v.lat, v.lng]]} pathOptions={{ color: COLORS.available, dashArray: '4 8', weight: 3 }} />
                ))}

              {showExact && (
                <Marker position={[r.lat, r.lng]} icon={pin(COLORS.home, '⌂', 'dc-me')}>
                  <Tooltip direction="bottom" offset={[0, 16]} permanent>
                    {mode === 'resident' ? 'Your home' : `${r.name} · ${r.address.split(',')[0]}`}
                  </Tooltip>
                </Marker>
              )}

              {showExact && helper && q.status === 'accepted' && (
                <Polyline positions={[[helper.lat, helper.lng], [r.lat, r.lng]]} pathOptions={{ color: COLORS.home, weight: 5 }}>
                  <Tooltip sticky>{formatDistance(haversineKm(helper, r))}</Tooltip>
                </Polyline>
              )}
            </Fragment>
          )
        })}
      </MapContainer>
    </div>
  )
}

export function MapLegend() {
  const items = [
    ['Available volunteer', COLORS.available],
    ['Busy / offline', COLORS.busy],
    ['Help requested (approx. area)', COLORS.request],
    ['Help on the way', COLORS.accepted],
    ['Doctor / pharmacy', COLORS.clinic],
    ['Nurse (existing care service)', COLORS.nurse],
  ]
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map(([label, c]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />
          {label}
        </span>
      ))}
    </div>
  )
}
