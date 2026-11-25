import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location, Trip } from '../../../shared/trip';
import { directionsUrl, formatShort, formatTime } from '../../lib/format';
import { DAY_COLORS, STOP_META } from '../../lib/stopTypes';
import styles from './MapView.module.scss';

interface Point {
  key: string;
  loc: Location;
  title: string;
  sub: string;
  dayIndex: number;
  kind: 'stop' | 'stay';
  done?: boolean;
}

// OpenStreetMap standard tiles: free, no API key. Dark mode is done with a CSS filter (see .map styles).
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export default function MapView({ trip }: { trip: Trip }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [day, setDay] = useState<number | 'all'>('all');

  const points = useMemo<Point[]>(
    () =>
      trip.days.flatMap((d, i) => {
        const pts: Point[] = d.stops
          .filter((s) => s.location)
          .map((s) => ({
            key: s.id,
            loc: s.location!,
            title: s.title,
            sub: [s.time && formatTime(s.time), STOP_META[s.type]?.label].filter(Boolean).join(' · '),
            dayIndex: i,
            kind: 'stop',
            done: s.done,
          }));
        if (d.stay?.location) {
          pts.push({
            key: `${d.id}-stay`,
            loc: d.stay.location,
            title: d.stay.name,
            sub: 'Stay',
            dayIndex: i,
            kind: 'stay',
          });
        }
        return pts;
      }),
    [trip],
  );

  // Create the map once.
  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true });
    L.control.zoom({ position: 'topright' }).addTo(m);
    L.tileLayer(TILES, {
      maxZoom: 19,
      className: styles.tiles,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(m);
    m.setView([20, 0], 2);
    map.current = m;
    layer.current = L.layerGroup().addTo(m);
    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Draw markers + route lines for the selected day(s).
  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.clearLayers();

    const visible = points.filter((p) => day === 'all' || p.dayIndex === day);
    const byDay = new Map<number, Point[]>();
    visible.forEach((p) => byDay.set(p.dayIndex, [...(byDay.get(p.dayIndex) ?? []), p]));

    byDay.forEach((pts, i) => {
      const color = DAY_COLORS[i % DAY_COLORS.length]!;
      L.polyline(
        pts.map((p) => [p.loc.lat, p.loc.lng]),
        { color, weight: 4, opacity: 0.75, dashArray: '2 8', lineCap: 'round' },
      ).addTo(g);

      pts.forEach((p, n) => {
        const label = p.kind === 'stay' ? '★' : String(n + 1);
        const icon = L.divIcon({
          className: '',
          html: `<span class="${styles.pin} ${p.done ? styles.pinDone : ''} ${p.kind === 'stay' ? styles.pinStay : ''}" style="--c:${color}">${label}</span>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        L.marker([p.loc.lat, p.loc.lng], { icon })
          .bindPopup(
            `<div class="${styles.popup}"><small>Day ${i + 1} · ${esc(p.sub)}</small><strong>${esc(p.title)}</strong><a href="${directionsUrl(p.loc)}" target="_blank" rel="noreferrer">Navigate →</a></div>`,
          )
          .addTo(g);
      });
    });

    if (visible.length) {
      const bounds = L.latLngBounds(visible.map((p) => [p.loc.lat, p.loc.lng]));
      m.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [points, day]);

  return (
    <section className={styles.wrap}>
      <div className={styles.filters}>
        <button className={day === 'all' ? styles.active : ''} onClick={() => setDay('all')}>
          All days
        </button>
        {trip.days.map((d, i) => (
          <button
            key={d.id}
            className={day === i ? styles.active : ''}
            onClick={() => setDay(i)}
            style={{ ['--c' as string]: DAY_COLORS[i % DAY_COLORS.length] }}
          >
            <i /> Day {i + 1} <span>{formatShort(d.date)}</span>
          </button>
        ))}
      </div>

      <div className={styles.map} ref={el} />

      {points.length === 0 && (
        <p className={styles.empty}>No coordinates in this plan yet. Add "location": {'{ lat, lng }'} to stops to see them here.</p>
      )}
    </section>
  );
}
