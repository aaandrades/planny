import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ClipboardCopy, Download, FileUp, Sparkles, TriangleAlert } from 'lucide-react';
import { useLocation } from 'wouter';
import { parseTrip, TripValidationError, type Trip, type TripData } from '../../shared/trip';
import { AI_PROMPT } from '../lib/aiPrompt';
import { api, ApiError } from '../lib/api';
import { formatRange } from '../lib/format';
import { mutate } from '../lib/store';
import { refreshTrips, tripKey } from '../lib/trips';
import { Button } from './Button';
import { Sheet } from './Sheet';
import { toast } from './Toast';
import styles from './ImportSheet.module.scss';

interface Props {
  open: boolean;
  onClose: () => void;
  /** When given, the sheet edits/replaces this trip's plan. */
  existing?: Trip;
}

type Validation = { ok: true; data: TripData } | { ok: false; issues: string[] } | null;

/** Strip server-only fields so the JSON is clean to edit or hand back to an AI. */
export function toEditableJson(trip: Trip): string {
  const { id: _id, createdAt: _c, updatedAt: _u, createdBy: _b, ...rest } = trip;
  const clean = {
    ...rest,
    days: rest.days.map((d) => ({ ...d, stops: d.stops.map(({ done: _d, doneBy: _db, ...s }) => s) })),
    checklist: rest.checklist.map(({ done: _d, doneBy: _db, ...c }) => c),
  };
  return JSON.stringify(clean, null, 2);
}

function validate(text: string): Validation {
  if (!text.trim()) return null;
  let raw: unknown;
  try {
    // Be forgiving with AI output wrapped in ```json fences.
    raw = JSON.parse(
      text
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/, ''),
    );
  } catch (err) {
    return { ok: false, issues: [`Not valid JSON: ${(err as Error).message}`] };
  }
  try {
    return { ok: true, data: parseTrip(raw) };
  } catch (err) {
    return { ok: false, issues: err instanceof TripValidationError ? err.issues : [(err as Error).message] };
  }
}

export default function ImportSheet({ open, onClose, existing }: Props) {
  const [, navigate] = useLocation();
  const [text, setText] = useState(() => (existing ? toEditableJson(existing) : ''));
  const [result, setResult] = useState<Validation>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setResult(validate(text)), 250);
    return () => window.clearTimeout(t);
  }, [text]);

  const stats = useMemo(() => {
    if (!result?.ok) return null;
    const d = result.data;
    return {
      days: d.days.length,
      stops: d.days.reduce((n, day) => n + day.stops.length, 0),
      stays: d.days.filter((day) => day.stay).length,
      checklist: d.checklist.length,
    };
  }, [result]);

  async function copy(value: string, done: () => void) {
    try {
      await navigator.clipboard.writeText(value);
      done();
    } catch {
      toast('Couldn’t access the clipboard', 'error');
    }
  }

  async function submit() {
    if (!result?.ok) return;
    setBusy(true);
    try {
      const trip = existing ? await api.replaceTrip(existing.id, result.data) : await api.createTrip(result.data);
      mutate(tripKey(trip.id), trip);
      void refreshTrips();
      toast(existing ? 'Plan updated ✨' : 'Trip created — have fun! 🚗');
      onClose();
      if (!existing) navigate(`/trip/${trip.id}`);
    } catch (err) {
      if (err instanceof ApiError && Array.isArray(err.details)) {
        setResult({ ok: false, issues: err.details.map(String) });
      }
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title={existing ? 'Update the plan' : 'New trip'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button block disabled={!result?.ok || busy} onClick={() => void submit()}>
            {busy ? 'Saving…' : existing ? 'Save plan' : 'Create trip'}
          </Button>
        </>
      }
    >
      {existing ? (
        <p className={styles.intro}>
          Edit the JSON below, or paste it to an AI and ask for changes. Things you already ticked off stay ticked.{' '}
          <button className={styles.link} onClick={() => void copy(text, () => toast('JSON copied'))}>
            <ClipboardCopy size={13} /> Copy JSON
          </button>
        </p>
      ) : (
        <ol className={styles.steps}>
          <li>
            <div>
              <strong>Copy the AI prompt</strong>
              <p>Paste it into any AI chat and describe your trip at the end.</p>
            </div>
            <Button
              size="sm"
              variant="dark"
              icon={copied ? <Check size={16} /> : <Sparkles size={16} />}
              onClick={() =>
                void copy(AI_PROMPT, () => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                })
              }
            >
              {copied ? 'Copied' : 'Copy prompt'}
            </Button>
          </li>
          <li>
            <div>
              <strong>Paste the JSON it gives you</strong>
              <p>
                Or upload a <code>.json</code> file.{' '}
                <a href="/sample-trip.json" download className={styles.link}>
                  <Download size={13} /> Example
                </a>
              </p>
            </div>
            <Button size="sm" variant="secondary" icon={<FileUp size={16} />} onClick={() => fileRef.current?.click()}>
              Upload
            </Button>
          </li>
        </ol>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void file.text().then(setText);
        }}
      />

      <textarea
        className={styles.editor}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='{ "title": "Pacific Coast Highway", "startDate": "2026-12-20", … }'
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-label="Trip JSON"
      />

      {result && !result.ok && (
        <div className={styles.issues}>
          <TriangleAlert size={18} />
          <ul>
            {result.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      )}

      {result?.ok && stats && (
        <div className={styles.preview}>
          <span className={styles.previewEmoji}>{result.data.emoji ?? '🚗'}</span>
          <div>
            <strong>{result.data.title}</strong>
            <p>
              {formatRange(result.data.startDate, result.data.endDate)} · {stats.days} days · {stats.stops} stops ·{' '}
              {stats.stays} stays · {stats.checklist} to-dos
            </p>
          </div>
          <Check className={styles.ok} size={22} />
        </div>
      )}
    </Sheet>
  );
}
