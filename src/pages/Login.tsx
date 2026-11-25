import { useState, type FormEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../lib/auth';
import styles from './Login.module.scss';

export default function Login() {
  const { users, login } = useAuth();
  const [name, setName] = useState(users.length === 1 ? users[0]! : '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name || !pin) return;
    setBusy(true);
    setError('');
    try {
      await login(name, pin);
    } catch (err) {
      setError((err as Error).message);
      setPin('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.scene} aria-hidden>
        <div className={styles.sun} />
        <div className={`${styles.hill} ${styles.hill1}`} />
        <div className={`${styles.hill} ${styles.hill2}`} />
        <div className={styles.road} />
      </div>
      <div className={styles.themeCorner}>
        <ThemeToggle variant="glass" />
      </div>

      <form className={styles.card} onSubmit={submit}>
        <h1 className={styles.brand}>Planny</h1>
        <p className={styles.tagline}>Road trips, planned together.</p>

        {users.length === 0 ? (
          <p className={styles.hint}>
            No travelers configured yet. Set <code>PLANNY_USERS</code> in your environment (e.g.{' '}
            <code>Andres:1234,Wife:5678</code>).
          </p>
        ) : (
          <>
            <p className={styles.label}>Who’s traveling?</p>
            <div className={styles.users} role="radiogroup">
              {users.map((u) => (
                <button
                  type="button"
                  key={u}
                  role="radio"
                  aria-checked={name === u}
                  className={`${styles.user} ${name === u ? styles.selected : ''}`}
                  onClick={() => {
                    setName(u);
                    setError('');
                  }}
                >
                  <Avatar name={u} size={52} />
                  <span>{u}</span>
                </button>
              ))}
            </div>

            <div className={`${styles.pinWrap} ${name ? styles.pinVisible : ''}`}>
              <input
                className={`${styles.pin} ${error ? styles.shake : ''}`}
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                placeholder="PIN"
                aria-label="PIN"
                maxLength={12}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={!name}
                autoFocus={!!name}
              />
              {error && <p className={styles.error}>{error}</p>}
              <Button type="submit" size="lg" block disabled={!name || !pin || busy} icon={<ArrowRight size={20} />}>
                {busy ? 'Checking…' : 'Let’s go'}
              </Button>
            </div>
          </>
        )}
      </form>
    </main>
  );
}
