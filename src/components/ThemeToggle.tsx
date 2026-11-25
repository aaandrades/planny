import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';
import styles from './ThemeToggle.module.scss';

interface Props {
  /** "glass" sits on top of photos (trip hero, login scene). */
  variant?: 'plain' | 'glass';
}

export function ThemeToggle({ variant = 'plain' }: Props) {
  const [theme, toggle] = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      className={`${styles.toggle} ${styles[variant]}`}
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={dark ? 'Light theme' : 'Dark theme'}
    >
      <span className={`${styles.icon} ${dark ? styles.hidden : ''}`}>
        <Moon size={19} />
      </span>
      <span className={`${styles.icon} ${dark ? '' : styles.hidden}`}>
        <Sun size={19} />
      </span>
    </button>
  );
}
