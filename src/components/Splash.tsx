import styles from './Splash.module.scss';

export function Splash() {
  return (
    <div className={styles.splash} aria-busy="true" aria-label="Loading">
      <img src="/logo.svg" alt="" width={72} height={72} className={styles.logo} />
    </div>
  );
}
