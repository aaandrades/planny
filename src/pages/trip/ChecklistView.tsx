import { useMemo, useState, type FormEvent } from 'react';
import { Check, Plus, X } from 'lucide-react';
import type { ChecklistItem, Trip } from '../../../shared/trip';
import { toast } from '../../components/Toast';
import { useUser } from '../../lib/auth';
import { patchTrip } from '../../lib/trips';
import styles from './ChecklistView.module.scss';

export function ChecklistView({ trip }: { trip: Trip }) {
  const user = useUser();
  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [hideDone, setHideDone] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of trip.checklist) {
      const key = item.category || 'General';
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [trip.checklist]);

  const total = trip.checklist.length;
  const done = trip.checklist.filter((c) => c.done).length;
  const pct = total ? done / total : 0;

  const run = (p: Parameters<typeof patchTrip>[1]) =>
    patchTrip(trip.id, p, user).catch((err: Error) => toast(err.message, 'error'));

  function add(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    void run({ op: 'addChecklist', text: value, category: category.trim() || 'General' });
    setText('');
  }

  return (
    <section>
      <header className={styles.head}>
        <Ring pct={pct} />
        <div>
          <h2>Checklist</h2>
          <p>
            {total === 0
              ? 'Nothing here yet — add your first item.'
              : done === total
                ? 'All packed. Hit the road! 🎉'
                : `${total - done} left · ${done} done`}
          </p>
        </div>
        {done > 0 && (
          <button className={styles.toggle} onClick={() => setHideDone((h) => !h)}>
            {hideDone ? 'Show done' : 'Hide done'}
          </button>
        )}
      </header>

      <form className={styles.add} onSubmit={add}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add an item… (e.g. Sunscreen)"
          aria-label="New checklist item"
        />
        <input
          className={styles.cat}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category"
          aria-label="Category"
          list="planny-categories"
        />
        <datalist id="planny-categories">
          {groups.map(([g]) => (
            <option key={g} value={g} />
          ))}
        </datalist>
        <button type="submit" className={styles.addBtn} aria-label="Add" disabled={!text.trim()}>
          <Plus size={20} />
        </button>
      </form>

      {groups.map(([group, items]) => {
        const visible = hideDone ? items.filter((i) => !i.done) : items;
        if (!visible.length) return null;
        const groupDone = items.filter((i) => i.done).length;
        return (
          <div key={group} className={styles.group}>
            <h3>
              {group}
              <span>
                {groupDone}/{items.length}
              </span>
            </h3>
            <ul>
              {visible.map((item) => (
                <li key={item.id} className={item.done ? styles.done : ''}>
                  <button
                    className={styles.item}
                    aria-pressed={!!item.done}
                    onClick={() => void run({ op: 'toggleChecklist', itemId: item.id, done: !item.done })}
                  >
                    <span className={styles.box}>
                      <Check size={15} strokeWidth={3.2} />
                    </span>
                    <span className={styles.text}>{item.text}</span>
                    {item.done && item.doneBy && <span className={styles.by}>{item.doneBy}</span>}
                  </button>
                  <button
                    className={styles.remove}
                    aria-label={`Remove ${item.text}`}
                    onClick={() => void run({ op: 'removeChecklist', itemId: item.id })}
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg className={styles.ring} width="64" height="64" viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r={r} className={styles.ringTrack} />
      <circle
        cx="32"
        cy="32"
        r={r}
        className={styles.ringValue}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
      />
      <text x="32" y="37" textAnchor="middle">
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}
