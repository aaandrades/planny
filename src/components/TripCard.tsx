import { Link } from 'wouter';
import type { TripSummary } from '../../shared/trip';
import { api } from '../lib/api';
import { fallbackGradient, formatKm, formatRange, sizedImage, tripStatus } from '../lib/format';
import { revalidate } from '../lib/store';
import { tripKey } from '../lib/trips';
import { AvatarStack } from './Avatar';
import styles from './TripCard.module.scss';

interface Props {
  trip: TripSummary;
  featured?: boolean;
  index?: number;
}

const prefetched = new Set<string>();
function prefetch(id: string) {
  if (prefetched.has(id)) return;
  prefetched.add(id);
  void revalidate(tripKey(id), () => api.getTrip(id)).catch(() => prefetched.delete(id));
}

export function TripCard({ trip, featured, index = 0 }: Props) {
  const status = tripStatus(trip.startDate, trip.endDate);
  const img = sizedImage(trip.coverImage, featured ? 1400 : 800);

  return (
    <Link
      href={`/trip/${trip.id}`}
      className={`${styles.card} ${featured ? styles.featured : ''}`}
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      onPointerEnter={() => prefetch(trip.id)}
      onTouchStart={() => prefetch(trip.id)}
    >
      <div className={styles.media} style={{ background: fallbackGradient(trip.id) }}>
        {img ? (
          <img src={img} alt="" loading={featured ? 'eager' : 'lazy'} decoding="async" />
        ) : (
          <span className={styles.emoji}>{trip.emoji ?? '🚗'}</span>
        )}
        <span className={`${styles.status} ${styles[status.kind]}`}>{status.label}</span>
        {featured && (
          <div className={styles.overlay}>
            <h2>
              {trip.emoji && <span>{trip.emoji} </span>}
              {trip.title}
            </h2>
            {trip.subtitle && <p>{trip.subtitle}</p>}
          </div>
        )}
      </div>
      <div className={styles.body}>
        {!featured && <h3>{trip.title}</h3>}
        <p className={styles.dates}>{formatRange(trip.startDate, trip.endDate)}</p>
        <div className={styles.meta}>
          <span>
            {trip.dayCount} {trip.dayCount === 1 ? 'day' : 'days'}
          </span>
          {trip.distanceKm > 0 && <span>{formatKm(trip.distanceKm)}</span>}
          <span>{trip.stopCount} stops</span>
          {trip.travelers.length > 0 && (
            <span className={styles.people}>
              <AvatarStack names={trip.travelers} size={24} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
