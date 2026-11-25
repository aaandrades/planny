import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.scss';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Common {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  block?: boolean;
}

const cls = ({ variant = 'primary', size = 'md', block }: Common, extra?: string) =>
  [styles.btn, styles[variant], styles[size], block && styles.block, extra].filter(Boolean).join(' ');

export function Button({
  variant,
  size,
  icon,
  block,
  className,
  children,
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cls({ variant, size, block }, className)} {...rest}>
      {icon}
      {children && <span>{children}</span>}
    </button>
  );
}

export function LinkButton({
  variant,
  size,
  icon,
  block,
  className,
  children,
  ...rest
}: Common & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={cls({ variant, size, block }, className)} target="_blank" rel="noreferrer" {...rest}>
      {icon}
      {children && <span>{children}</span>}
    </a>
  );
}
