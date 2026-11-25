import { lazy, Suspense, useMemo, useState } from 'react';
import { LogOut, Plus, WifiOff } from 'lucide-react';
import type { TripSummary } from '../../shared/trip';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';
import { TripCard } from '../components/TripCard';
import { useAuth } from '../lib/auth';
import { todayIso } from '../lib/format';
import { useTrips } from '../lib/trips';
import styles from './Home.module.scss';

const ImportSheet = lazy(() => import('../components/ImportSheet'));

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Ongoing trip first, else the soonest upcoming one. */
function pickFeatured(trips: TripSummary[]): TripSummary | undefined {
  const today = todayIso();
  const ongoing = trips.find((t) => t.startDate <= today && t.endDate >= today);
  if (ongoing) return ongoing;
  return [...trips].filter((t) => t.startDate > today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
}

export function Home() {
  const { user, logout } = useAuth();
  const { data: trips, error, loading } = useTrips();
  const [importing, setImporting] = useState(false);
  const [menu, setMenu] = useState(false);

  const featured = useMemo(() => (trips ? pickFeatured(trips) : undefined), [trips]);
  const rest = useMemo(() => {
    const today = todayIso();
    const others = (trips ?? []).filter((t) => t.id !== featured?.id);
    return {
      upcoming: others.filter((t) => t.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)),
      past: others.filter((t) => t.endDate < today),
    };
  }, [trips, featured]);

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <div className={styles.logo}>
          <img src="/logo.svg" alt="" width={34} height={34} />
          <span>Planny</span>
        </div>
        <div className={styles.actions}>
          <Button className={styles.desktopNew} size="sm" icon={<Plus size={18} />} onClick={() => setImporting(true)}>
            New trip
          </Button>
          <ThemeToggle />
          <button className={styles.me} onClick={() => setMenu((m) => !m)} aria-label="Account" aria-expanded={menu}>
            <Avatar name={user ?? '?'} size={38} />
          </button>
          {menu && (
            <div className={styles.menu} role="menu">
              <p>
                Signed in as <strong>{user}</strong>
              </p>
              <button role="menuitem" onClick={() => void logout()}>
                <LogOut size={16} /> Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hello}>
          <p>
            {greeting()}, {user}
          </p>
          <h1>Where to next?</h1>
        </section>

        {error && !trips && (
          <div className={styles.notice}>
            <WifiOff size={18} /> {error.message}
          </div>
        )}

        {!trips && loading && (
          <div className={styles.skeletonHero} aria-label="Loading trips" />
        )}

        {trips && trips.length === 0 && (
          <section className={styles.empty}>
            <div className={styles.emptyArt} aria-hidden>
              🗺️
            </div>
            <h2>Your first adventure starts here</h2>
            <p>Generate a trip plan with any AI using our template, paste it in, and you’re ready to roll.</p>
            <Button size="lg" icon={<Plus size={20} />} onClick={() => setImporting(true)}>
              Create a trip
            </Button>
          </section>
        )}

        {featured && (
          <section className={styles.section}>
            <TripCard trip={featured} featured />
          </section>
        )}

        {rest.upcoming.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Coming up</h2>
            <div className={styles.grid}>
              {rest.upcoming.map((t, i) => (
                <TripCard key={t.id} trip={t} index={i} />
              ))}
            </div>
          </section>
        )}

        {rest.past.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Past trips</h2>
            <div className={styles.grid}>
              {rest.past.map((t, i) => (
                <TripCard key={t.id} trip={t} index={i} />
              ))}
            </div>
          </section>
        )}
      </main>

      <button className={styles.fab} onClick={() => setImporting(true)} aria-label="New trip">
        <Plus size={26} />
      </button>

      {importing && (
        <Suspense fallback={null}>
          <ImportSheet open={importing} onClose={() => setImporting(false)} />
        </Suspense>
      )}
    </div>
  );
}
