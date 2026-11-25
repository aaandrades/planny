import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Phone } from 'lucide-react';
import type { StopType, Trip } from '../../../shared/trip';
import { toast } from '../../components/Toast';
import { useUser } from '../../lib/auth';
import { formatMoney } from '../../lib/format';
import { STOP_META } from '../../lib/stopTypes';
import { patchTrip } from '../../lib/trips';
import styles from './InfoView.module.scss';

export function InfoView({ trip }: { trip: Trip }) {
  return (
    <div className={styles.wrap}>
      {trip.summary && (
        <section className={styles.card}>
          <h2>About this trip</h2>
          <p className={styles.summary}>{trip.summary}</p>
          {trip.tags.length > 0 && (
            <div className={styles.tags}>
              {trip.tags.map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
          )}
        </section>
      )}

      <Budget trip={trip} />

      {trip.contacts.length > 0 && (
        <section className={styles.card}>
          <h2>Contacts</h2>
          <ul className={styles.list}>
            {trip.contacts.map((c) => (
              <li key={c.name + c.phone}>
                <div>
                  <strong>{c.name}</strong>
                  {c.note && <p>{c.note}</p>}
                </div>
                {c.phone && (
                  <a className={styles.round} href={`tel:${c.phone}`} aria-label={`Call ${c.name}`}>
                    <Phone size={17} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {trip.links.length > 0 && (
        <section className={styles.card}>
          <h2>Links</h2>
          <ul className={styles.list}>
            {trip.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer" className={styles.link}>
                  <strong>{l.label}</strong>
                  <ExternalLink size={16} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Notes trip={trip} />
    </div>
  );
}

function Budget({ trip }: { trip: Trip }) {
  const data = useMemo(() => {
    const byType = new Map<string, number>();
    let stays = 0;
    for (const d of trip.days) {
      stays += d.stay?.cost ?? 0;
      for (const s of d.stops) {
        if (s.cost) byType.set(s.type, (byType.get(s.type) ?? 0) + s.cost);
      }
    }
    const rows = [
      ...(stays ? [{ key: 'stay', label: 'Stays', value: stays, color: STOP_META.stay.color }] : []),
      ...[...byType.entries()].map(([type, value]) => {
        const meta = STOP_META[type as StopType] ?? STOP_META.other;
        return { key: type, label: meta.label, value, color: meta.color };
      }),
    ].sort((a, b) => b.value - a.value);
    const total = rows.reduce((n, r) => n + r.value, 0);
    return { rows, total };
  }, [trip]);

  if (!data.total && !trip.budget?.total) return null;
  const budget = trip.budget?.total;
  const max = Math.max(...data.rows.map((r) => r.value), 1);

  return (
    <section className={styles.card}>
      <h2>Budget</h2>
      <div className={styles.budgetTop}>
        <div>
          <span className={styles.big}>{formatMoney(data.total, trip.currency)}</span>
          <span className={styles.muted}>planned</span>
        </div>
        {budget !== undefined && (
          <div className={styles.right}>
            <span className={styles.big}>{formatMoney(budget, trip.currency)}</span>
            <span className={styles.muted}>budget</span>
          </div>
        )}
      </div>
      {budget !== undefined && budget > 0 && (
        <div className={styles.meter}>
          <span
            style={{ width: `${Math.min(100, (data.total / budget) * 100)}%` }}
            className={data.total > budget ? styles.over : ''}
          />
        </div>
      )}
      <ul className={styles.bars}>
        {data.rows.map((r) => (
          <li key={r.key}>
            <span className={styles.barLabel}>{r.label}</span>
            <span className={styles.barTrack}>
              <span style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
            </span>
            <span className={styles.barValue}>{formatMoney(r.value, trip.currency)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Notes({ trip }: { trip: Trip }) {
  const user = useUser();
  const [value, setValue] = useState(trip.notes ?? '');
  const [saved, setSaved] = useState(true);
  const dirty = useRef(false);
  const latest = useRef(value);
  latest.current = value;

  // Pick up the other person's edits when we're not typing.
  useEffect(() => {
    if (!dirty.current) setValue(trip.notes ?? '');
  }, [trip.notes]);

  useEffect(() => {
    if (!dirty.current) return;
    setSaved(false);
    const t = window.setTimeout(() => {
      patchTrip(trip.id, { op: 'setNotes', notes: value }, user)
        .then(() => {
          // Only settle if nothing new was typed while the request was in flight.
          if (latest.current !== value) return;
          dirty.current = false;
          setSaved(true);
        })
        .catch((err: Error) => toast(err.message, 'error'));
    }, 900);
    return () => window.clearTimeout(t);
  }, [value, trip.id, user]);

  return (
    <section className={styles.card}>
      <h2>
        Shared notes <span className={styles.saved}>{saved ? 'Saved' : 'Saving…'}</span>
      </h2>
      <textarea
        className={styles.notes}
        value={value}
        placeholder="Ideas, wifi passwords, things to remember…"
        onChange={(e) => {
          dirty.current = true;
          setValue(e.target.value);
        }}
      />
    </section>
  );
}
