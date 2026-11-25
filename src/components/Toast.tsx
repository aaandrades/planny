import { useEffect, useState } from 'react';
import styles from './Toast.module.scss';

interface ToastItem {
  id: number;
  message: string;
  tone: 'default' | 'error';
}

const listeners = new Set<(t: ToastItem) => void>();
let seq = 0;

export function toast(message: string, tone: ToastItem['tone'] = 'default') {
  const item = { id: ++seq, message, tone };
  listeners.forEach((fn) => fn(item));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const add = (t: ToastItem) => {
      setItems((prev) => [...prev.slice(-2), t]);
      window.setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 3200);
    };
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, []);

  return (
    <div className={styles.region} role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`${styles.toast} ${t.tone === 'error' ? styles.error : ''}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
