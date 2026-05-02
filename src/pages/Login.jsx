import styles from './Auth.module.css';
import logo from '../assets/logo.png';

export default function Login({ onLogin, onSwitchToRegister, loading = false, error = '' }) {
  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onLogin({
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || ''),
    });
  }

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <section className={styles.hero}>
          <div>
            <h1 className={styles.heroTitle}>Vos données de santé, claires et faciles à suivre.</h1>
            <p className={styles.heroText}>
              Connectez-vous pour voir votre tableau de bord, saisir vos mesures et tout garder au même endroit.
            </p>
            <div className={styles.heroLogoLarge}>
              <img src={logo} alt="ChroniCare" />
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.title}>Connexion</h2>
              <p className={styles.subtitle}>Entrez votre email et votre mot de passe pour continuer.</p>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input className={styles.input} name="email" type="email" autoComplete="email" required />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Password</span>
              <input className={styles.input} name="password" type="password" autoComplete="current-password" required />
            </label>

            <div className={styles.actions}>
              <button className={styles.primaryBtn} type="submit" disabled={loading}>
                {loading ? 'Connexion…' : 'Se connecter'}
              </button>
            </div>
          </form>

          <div className={styles.switchRow}>
            Nouveau ici ?
            <button type="button" className={styles.switchLink} onClick={onSwitchToRegister}>
              Créer un compte
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
