import { initials } from '../lib/format';
import styles from './Avatar.module.scss';

const COLORS = ['var(--sunset)', 'var(--pine)', 'var(--plum)', 'var(--sky)', '#c2410c'];

export function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 17 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length]!;
}

interface Props {
  name: string;
  size?: number;
  ring?: boolean;
}

export function Avatar({ name, size = 32, ring }: Props) {
  return (
    <span
      className={`${styles.avatar} ${ring ? styles.ring : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.4, background: avatarColor(name) }}
      title={name}
      aria-label={name}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, size = 28 }: { names: string[]; size?: number }) {
  return (
    <span className={styles.stack}>
      {names.map((n) => (
        <Avatar key={n} name={n} size={size} ring />
      ))}
    </span>
  );
}
