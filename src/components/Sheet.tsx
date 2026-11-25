import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './Sheet.module.scss';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

/** Bottom sheet on phones, centered dialog on larger screens. Built on native <dialog>. */
export function Sheet({ open, onClose, title, children, footer, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`${styles.sheet} ${wide ? styles.wide : ''}`}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop tap
      }}
    >
      {open && (
        <div className={styles.inner}>
          <header className={styles.header}>
            <span className={styles.grabber} aria-hidden />
            <h2>{title}</h2>
            <button className={styles.close} onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </header>
          <div className={styles.body}>{children}</div>
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
