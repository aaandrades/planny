import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  Download,
  Info,
  ListChecks,
  Map as MapIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import type { Trip } from '../../shared/trip';
import { AvatarStack } from '../components/Avatar';
import { Button } from '../components/Button';
import { Splash } from '../components/Splash';
import { ThemeToggle } from '../components/ThemeToggle';
import { toast } from '../components/Toast';
import { api } from '../lib/api';
import { fallbackGradient, formatHours, formatKm, formatRange, sizedImage, todayIso, tripStatus } from '../lib/format';
import { mutate } from '../lib/store';
import { refreshTrips, tripKey, useTrip } from '../lib/trips';
import { ChecklistView } from './trip/ChecklistView';
import { DayView } from './trip/DayView';
import { InfoView } from './trip/InfoView';
import styles from './TripPage.module.scss';

const MapView = lazy(() => import('./trip/MapView'));
const ImportSheet = lazy(() => import('../components/ImportSheet'));

type Tab = 'plan' | 'map' | 'checklist' | 'info';

const tabStore = (id: string) => `planny:tab:${id}`;

export default function TripPage({ id }: { id: string }) {
  const { data: trip, error } = useTrip(id);
  const [, navigate] = useLocation();
  const [tab, setTabState] = useState<Tab>(() => (sessionStorage.getItem(tabStore(id)) as Tab) || 'plan');
  const setTab = (t: Tab) => {
    setTabState(t);
    sessionStorage.setItem(tabStore(id), t);
    window.scrollTo({ top: Math.min(window.scrollY, heroOffset()), behavior: 'smooth' });
  };

  if (!trip) {
    if (!error) return <Splash />;
    return (
      <div className={styles.missing}>
        <h1>Trip not found</h1>
        <p>{error.message}</p>
        <Button variant="secondary" onClick={() => navigate('/')}>
          Back home
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Hero trip={trip} />

      <main className={styles.main}>
        {tab === 'plan' && <DayView trip={trip} />}
        {tab === 'map' && (
          <Suspense fallback={<div className={styles.mapLoading} />}>
            <MapView trip={trip} />
          </Suspense>
        )}
        {tab === 'checklist' && <ChecklistView trip={trip} />}
        {tab === 'info' && <InfoView trip={trip} />}
      </main>

      <TabBar trip={trip} tab={tab} onChange={setTab} />
    </div>
  );
}

function heroOffset() {
  return (document.getElementById('trip-content')?.offsetTop ?? 0) - 12;
}

function Hero({ trip }: { trip: Trip }) {
  const status = tripStatus(trip.startDate, trip.endDate);
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [, navigate] = useLocation();

  const stats = useMemo(() => {
    const stops = trip.days.flatMap((d) => d.stops);
    return {
      km: trip.days.reduce((n, d) => n + (d.distanceKm ?? 0), 0),
      hours: trip.days.reduce((n, d) => n + (d.driveHours ?? 0), 0),
      stops: stops.length,
      done: stops.filter((s) => s.done).length,
    };
  }, [trip]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  function download() {
    import('../components/ImportSheet').then(({ toEditableJson }) => {
      const blob = new Blob([toEditableJson(trip)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${trip.id}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  async function remove() {
    if (!window.confirm(`Delete “${trip.title}”? This can’t be undone.`)) return;
    try {
      await api.deleteTrip(trip.id);
      mutate(tripKey(trip.id), undefined);
      await refreshTrips();
      toast('Trip deleted');
      navigate('/');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  const img = sizedImage(trip.coverImage, 1600);

  return (
    <>
      <header className={styles.hero} style={{ background: fallbackGradient(trip.id) }}>
        {img ? (
          <img className={styles.cover} src={img} alt="" fetchPriority="high" decoding="async" />
        ) : (
          <span className={styles.coverEmoji} aria-hidden>
            {trip.emoji ?? '🚗'}
          </span>
        )}

        <div className={styles.heroBar}>
          <Link href="/" className={styles.glassBtn} aria-label="Back to trips">
            <ArrowLeft size={20} />
          </Link>
          <div className={styles.menuWrap}>
            <ThemeToggle variant="glass" />
            <button
              className={styles.glassBtn}
              aria-label="Trip options"
              aria-expanded={menu}
              onClick={(e) => {
                e.stopPropagation();
                setMenu((m) => !m);
              }}
            >
              <MoreHorizontal size={20} />
            </button>
            {menu && (
              <div className={styles.menu} role="menu">
                <button role="menuitem" onClick={() => setEditing(true)}>
                  <Pencil size={16} /> Update plan
                </button>
                <button role="menuitem" onClick={download}>
                  <Download size={16} /> Download JSON
                </button>
                <button role="menuitem" className={styles.danger} onClick={() => void remove()}>
                  <Trash2 size={16} /> Delete trip
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.heroText}>
          <span className={`${styles.pill} ${styles[status.kind]}`}>{status.label}</span>
          <h1>{trip.title}</h1>
          {trip.subtitle && <p className={styles.subtitle}>{trip.subtitle}</p>}
          <div className={styles.heroMeta}>
            <span>{formatRange(trip.startDate, trip.endDate)}</span>
            {trip.travelers.length > 0 && <AvatarStack names={trip.travelers} size={26} />}
          </div>
        </div>
      </header>

      <div className={styles.stats} id="trip-content">
        <Stat value={String(trip.days.length)} label={trip.days.length === 1 ? 'day' : 'days'} />
        {stats.km > 0 && <Stat value={formatKm(stats.km)} label="on the road" />}
        {stats.hours > 0 && <Stat value={formatHours(stats.hours)} label="driving" />}
        <Stat value={`${stats.done}/${stats.stops}`} label="stops done" />
      </div>

      {editing && (
        <Suspense fallback={null}>
          <ImportSheet open={editing} onClose={() => setEditing(false)} existing={trip} />
        </Suspense>
      )}
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.stat}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function TabBar({ trip, tab, onChange }: { trip: Trip; tab: Tab; onChange: (t: Tab) => void }) {
  const left = trip.checklist.filter((c) => !c.done).length;
  const showChecklistBadge = left > 0 && todayIso() <= trip.endDate;
  const tabs: { id: Tab; label: string; icon: typeof CalendarDays; badge?: number }[] = [
    { id: 'plan', label: 'Plan', icon: CalendarDays },
    { id: 'map', label: 'Map', icon: MapIcon },
    { id: 'checklist', label: 'Checklist', icon: ListChecks, badge: showChecklistBadge ? left : undefined },
    { id: 'info', label: 'Info', icon: Info },
  ];
  return (
    <nav className={styles.tabbar} aria-label="Trip sections">
      {tabs.map(({ id, label, icon: Icon, badge }) => (
        <button
          key={id}
          className={`${styles.tab} ${tab === id ? styles.tabActive : ''}`}
          aria-current={tab === id ? 'page' : undefined}
          onClick={() => onChange(id)}
        >
          <span className={styles.tabIcon}>
            <Icon size={21} strokeWidth={tab === id ? 2.4 : 2} />
            {badge !== undefined && <span className={styles.badge}>{badge > 99 ? '99+' : badge}</span>}
          </span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
