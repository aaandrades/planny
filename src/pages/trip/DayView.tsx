import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BedDouble,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Heart,
  Lightbulb,
  Navigation,
  Phone,
  Route,
  Wallet,
} from 'lucide-react';
import type { Day, Stay, Stop, Trip } from '../../../shared/trip';
import { Button, LinkButton } from '../../components/Button';
import { toast } from '../../components/Toast';
import { useUser } from '../../lib/auth';
import {
  dayOfMonth,
  dayRouteUrl,
  directionsUrl,
  formatDuration,
  formatHours,
  formatKm,
  formatLong,
  formatMoney,
  formatTime,
  formatWeekday,
  placeUrl,
  sizedImage,
  todayIso,
} from '../../lib/format';
import { STOP_META } from '../../lib/stopTypes';
import { patchTrip } from '../../lib/trips';
import styles from './DayView.module.scss';

const dayStore = (id: string) => `planny:day:${id}`;

function initialDay(trip: Trip): number {
  const saved = sessionStorage.getItem(dayStore(trip.id));
  if (saved && trip.days.some((d) => d.id === saved)) return trip.days.findIndex((d) => d.id === saved);
  const today = trip.days.findIndex((d) => d.date === todayIso());
  return today >= 0 ? today : 0;
}

export function DayView({ trip }: { trip: Trip }) {
  const [index, setIndex] = useState(() => initialDay(trip));
  const safeIndex = Math.min(index, trip.days.length - 1);
  const day = trip.days[safeIndex]!;

  const select = (i: number) => {
    setIndex(i);
    sessionStorage.setItem(dayStore(trip.id), trip.days[i]!.id);
  };

  return (
    <>
      <DayStrip days={trip.days} index={safeIndex} onSelect={select} />
      <DayContent key={day.id} trip={trip} day={day} number={safeIndex + 1} />
      <div className={styles.pager}>
        <Button
          variant="secondary"
          icon={<ChevronLeft size={18} />}
          disabled={safeIndex === 0}
          onClick={() => {
            select(safeIndex - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          Previous day
        </Button>
        <Button
          variant="secondary"
          disabled={safeIndex === trip.days.length - 1}
          onClick={() => {
            select(safeIndex + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          Next day <ChevronRight size={18} />
        </Button>
      </div>
    </>
  );
}

function DayStrip({ days, index, onSelect }: { days: Day[]; index: number; onSelect: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const today = todayIso();

  useEffect(() => {
    const el = ref.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [index]);

  return (
    <div className={styles.stripWrap}>
      <div className={styles.strip} ref={ref} role="tablist" aria-label="Days">
        {days.map((d, i) => {
          const done = d.stops.length > 0 && d.stops.every((s) => s.done);
          return (
            <button
              key={d.id}
              role="tab"
              aria-selected={i === index}
              className={`${styles.chip} ${i === index ? styles.chipActive : ''} ${d.date === today ? styles.chipToday : ''}`}
              onClick={() => onSelect(i)}
            >
              <span className={styles.chipWeekday}>{d.date === today ? 'Today' : formatWeekday(d.date)}</span>
              <span className={styles.chipNum}>{dayOfMonth(d.date)}</span>
              <span className={styles.chipLabel}>{done ? <Check size={12} strokeWidth={3} /> : `Day ${i + 1}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayContent({ trip, day, number }: { trip: Trip; day: Day; number: number }) {
  const routeUrl = dayRouteUrl(day);
  const done = day.stops.filter((s) => s.done).length;
  const pct = day.stops.length ? Math.round((done / day.stops.length) * 100) : 0;
  const cost = useMemo(
    () => day.stops.reduce((n, s) => n + (s.cost ?? 0), 0) + (day.stay?.cost ?? 0),
    [day],
  );

  return (
    <article className={styles.day}>
      <header className={styles.dayHead}>
        <p className={styles.eyebrow}>
          Day {number} · {formatLong(day.date)}
        </p>
        <h2>{day.title}</h2>
        {day.summary && <p className={styles.summary}>{day.summary}</p>}

        {(day.from || day.to || day.distanceKm || day.driveHours) && (
          <div className={styles.route}>
            {(day.from || day.to) && (
              <div className={styles.routePlaces}>
                <span>{day.from ?? 'Start'}</span>
                <ArrowRight size={16} />
                <span>{day.to ?? 'End'}</span>
              </div>
            )}
            <div className={styles.routeMeta}>
              {!!day.distanceKm && (
                <span>
                  <Route size={15} /> {formatKm(day.distanceKm)}
                </span>
              )}
              {!!day.driveHours && (
                <span>
                  <Clock size={15} /> {formatHours(day.driveHours)}
                </span>
              )}
              {cost > 0 && (
                <span>
                  <Wallet size={15} /> ~{formatMoney(cost, trip.currency)}
                </span>
              )}
            </div>
            {routeUrl && (
              <LinkButton href={routeUrl} size="sm" variant="dark" icon={<Navigation size={15} />}>
                Open route
              </LinkButton>
            )}
          </div>
        )}

        {day.stops.length > 0 && (
          <div className={styles.progress} aria-label={`${pct}% done`}>
            <div className={styles.progressBar}>
              <span style={{ width: `${pct}%` }} />
            </div>
            <span>
              {done}/{day.stops.length}
            </span>
          </div>
        )}
      </header>

      <ol className={styles.timeline}>
        {day.stops.map((s, i) => (
          <StopCard key={s.id} trip={trip} stop={s} index={i} />
        ))}
      </ol>

      {day.stops.length === 0 && <p className={styles.free}>A free day — no plans, just vibes. 🌤️</p>}

      {day.stay && <StayCard stay={day.stay} currency={trip.currency} />}
    </article>
  );
}

function StopCard({ trip, stop, index }: { trip: Trip; stop: Stop; index: number }) {
  const user = useUser();
  const meta = STOP_META[stop.type] ?? STOP_META.other;
  const Icon = meta.icon;
  const hasMore = !!(stop.about || stop.highlights?.length || stop.openingHours);

  const toggle = () => {
    if (navigator.vibrate) navigator.vibrate(12);
    patchTrip(trip.id, { op: 'toggleStop', stopId: stop.id, done: !stop.done }, user).catch((err: Error) =>
      toast(err.message, 'error'),
    );
  };

  return (
    <li
      className={`${styles.stop} ${stop.done ? styles.stopDone : ''}`}
      style={{ ['--c' as string]: meta.color, ['--s' as string]: meta.soft, animationDelay: `${index * 40}ms` }}
    >
      <div className={styles.rail}>
        <span className={styles.icon}>
          <Icon size={19} />
        </span>
      </div>

      <div className={styles.stopCard}>
        <div className={styles.stopTop}>
          <div className={styles.stopMeta}>
            {stop.time && <strong>{formatTime(stop.time)}</strong>}
            <span>{meta.label}</span>
            {stop.durationMin ? <span>{formatDuration(stop.durationMin)}</span> : null}
            {stop.optional && <span className={styles.optional}>Optional</span>}
            {stop.bookingRequired && !stop.bookingRef && <span className={styles.book}>Book ahead</span>}
          </div>
          <button
            className={styles.check}
            onClick={toggle}
            aria-pressed={!!stop.done}
            aria-label={stop.done ? 'Mark as not done' : 'Mark as done'}
          >
            <Check size={18} strokeWidth={3} />
          </button>
        </div>

        {stop.image && (
          <img className={styles.stopImage} src={sizedImage(stop.image, 900)} alt="" loading="lazy" decoding="async" />
        )}

        <h3 className={styles.stopTitle}>{stop.title}</h3>
        {stop.whyVisit && (
          <p className={styles.why}>
            <Heart size={15} />
            <span>{stop.whyVisit}</span>
          </p>
        )}
        {stop.description && <p className={styles.desc}>{stop.description}</p>}
        {stop.location?.address && <p className={styles.address}>{stop.location.address}</p>}

        {hasMore && (
          <details className={styles.more}>
            <summary>
              About this place <ChevronDown size={16} />
            </summary>
            {stop.about && <p>{stop.about}</p>}
            {stop.highlights && stop.highlights.length > 0 && (
              <ul className={styles.highlights}>
                {stop.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
            {stop.openingHours && (
              <p className={styles.hours}>
                <Clock size={14} /> {stop.openingHours}
              </p>
            )}
          </details>
        )}

        {stop.tips && (
          <p className={styles.tip}>
            <Lightbulb size={15} />
            <span>{stop.tips}</span>
          </p>
        )}

        <div className={styles.stopActions}>
          {(stop.location || stop.type !== 'drive') && (
            <LinkButton
              size="sm"
              variant="secondary"
              href={stop.location ? directionsUrl(stop.location) : placeUrl(stop.title)}
              icon={<Navigation size={14} />}
            >
              Navigate
            </LinkButton>
          )}
          {stop.url && (
            <LinkButton size="sm" variant="ghost" href={stop.url} icon={<ExternalLink size={14} />}>
              Website
            </LinkButton>
          )}
          {stop.cost !== undefined && stop.cost > 0 && (
            <span className={styles.cost}>{formatMoney(stop.cost, trip.currency)}</span>
          )}
          {stop.bookingRef && <span className={styles.cost}>Ref {stop.bookingRef}</span>}
        </div>

        {stop.done && stop.doneBy && <p className={styles.doneBy}>✓ Done · {stop.doneBy}</p>}
      </div>
    </li>
  );
}

function StayCard({ stay, currency }: { stay: Stay; currency: string }) {
  const copy = (value: string) =>
    navigator.clipboard
      .writeText(value)
      .then(() => toast('Copied'))
      .catch(() => undefined);

  return (
    <section className={styles.stay}>
      <div className={styles.stayHead}>
        <span className={styles.stayIcon}>
          <BedDouble size={22} />
        </span>
        <div>
          <p className={styles.eyebrow}>Tonight{stay.kind && stay.kind !== 'other' ? ` · ${stay.kind}` : ''}</p>
          <h3>{stay.name}</h3>
        </div>
      </div>

      {stay.about && <p className={styles.stayAbout}>{stay.about}</p>}
      {stay.address && <p className={styles.stayAddress}>{stay.address}</p>}

      <dl className={styles.stayGrid}>
        {stay.checkIn && (
          <div>
            <dt>Check-in</dt>
            <dd>{formatTime(stay.checkIn)}</dd>
          </div>
        )}
        {stay.checkOut && (
          <div>
            <dt>Check-out</dt>
            <dd>{formatTime(stay.checkOut)}</dd>
          </div>
        )}
        {stay.cost !== undefined && (
          <div>
            <dt>Cost</dt>
            <dd>{formatMoney(stay.cost, currency)}</dd>
          </div>
        )}
        {stay.confirmation && (
          <div>
            <dt>Confirmation</dt>
            <dd>
              <button className={styles.copy} onClick={() => copy(stay.confirmation!)}>
                {stay.confirmation} <Copy size={13} />
              </button>
            </dd>
          </div>
        )}
      </dl>

      {stay.notes && <p className={styles.stayNotes}>{stay.notes}</p>}

      <div className={styles.stopActions}>
        <LinkButton
          size="sm"
          variant="primary"
          href={directionsUrl(stay.location ?? stay.address ?? stay.name)}
          icon={<Navigation size={14} />}
        >
          Take us there
        </LinkButton>
        {stay.phone && (
          <LinkButton size="sm" variant="secondary" href={`tel:${stay.phone}`} target="_self" icon={<Phone size={14} />}>
            Call
          </LinkButton>
        )}
        {stay.url && (
          <LinkButton size="sm" variant="ghost" href={stay.url} icon={<ExternalLink size={14} />}>
            Booking
          </LinkButton>
        )}
      </div>
    </section>
  );
}
