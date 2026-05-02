import { useMemo, useState } from 'react';
import styles from './Auth.module.css';
import logo from '../assets/logo.png';

const PATIENT_FIELDS = [
  { name: 'dob', label: 'Date de naissance', type: 'date' },
  { name: 'sex', label: 'Sexe', type: 'select', options: ['M', 'F'] },
  { name: 'bloodType', label: 'Groupe sanguin', type: 'text', placeholder: 'A+' },
  { name: 'conditions', label: 'Pathologies', type: 'textarea', placeholder: 'Diabète, hypertension...' },
  { name: 'phone', label: 'Téléphone', type: 'text', placeholder: '+216...' },
];

const DOCTOR_FIELDS = [
  { name: 'practiceType', label: 'Type de pratique', type: 'select', options: ['hospital', 'cabinet'] },
  { name: 'workplaceName', label: 'Nom de l’hôpital / cabinet / structure', type: 'text', placeholder: 'CHU Demo' },
  { name: 'workplaceCity', label: 'Ville', type: 'text', placeholder: 'Tunis' },
  { name: 'specialty', label: 'Spécialité', type: 'text', placeholder: 'Médecine générale' },
  { name: 'phone', label: 'Téléphone', type: 'text', placeholder: '+216...' },
];

export default function Register({ onRegister, onSwitchToLogin, loading = false, error = '' }) {
  const [role, setRole] = useState('patient');
  const visibleFields = useMemo(() => (role === 'doctor' ? DOCTOR_FIELDS : PATIENT_FIELDS), [role]);

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      role,
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || ''),
      firstName: String(formData.get('firstName') || '').trim(),
      lastName: String(formData.get('lastName') || '').trim(),
    };

    for (const field of visibleFields) {
      payload[field.name] = String(formData.get(field.name) || '').trim();
    }

    onRegister(payload);
  }

  return (
    <div className={styles.shell}>
      <div className={styles.card}>
        <section className={styles.hero}>
          <div>
            <h1 className={styles.heroTitle}>Créez un compte patient ou médecin.</h1>
            <p className={styles.heroText}>
              Les patients ajoutent leur profil santé. Les médecins renseignent leur lieu de travail pour contextualiser l’application.
            </p>
            <div className={styles.heroLogoLarge}>
              <img src={logo} alt="ChroniCare" />
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2 className={styles.title}>Inscription</h2>
              <p className={styles.subtitle}>Utilisez un email valide et un mot de passe d’au moins 6 caractères.</p>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span className={styles.label}>Prénom</span>
                <input className={styles.input} name="firstName" type="text" autoComplete="given-name" required />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Nom</span>
                <input className={styles.input} name="lastName" type="text" autoComplete="family-name" required />
              </label>
            </div>

            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                <span className={styles.label}>Email</span>
                <input className={styles.input} name="email" type="email" autoComplete="email" required />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Mot de passe</span>
                <input className={styles.input} name="password" type="password" autoComplete="new-password" minLength="6" required />
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Type de compte</span>
              <select className={styles.select} name="role" value={role} onChange={e => setRole(e.target.value)}>
                <option value="patient">Patient</option>
                <option value="doctor">Médecin</option>
              </select>
            </label>

            <h3 className={styles.sectionTitle}>{role === 'doctor' ? 'Détails médecin' : 'Détails patient'}</h3>
            <p className={styles.helper}>
              {role === 'doctor'
                ? 'Indiquez votre lieu de pratique et votre manière d’exercer.'
                : 'Renseignez les champs de profil utiles à votre suivi.'}
            </p>

            {visibleFields.map(field => (
              <label className={styles.field} key={field.name}>
                <span className={styles.label}>{field.label}</span>
                {field.type === 'select' ? (
                  <select className={styles.select} name={field.name} defaultValue={field.options[0]}>
                    {field.options.map(option => (
                      <option value={option} key={option}>{option}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea className={styles.textarea} name={field.name} placeholder={field.placeholder} />
                ) : (
                  <input className={styles.input} name={field.name} type={field.type} placeholder={field.placeholder} />
                )}
              </label>
            ))}

            <div className={styles.actions}>
              <button className={styles.primaryBtn} type="submit" disabled={loading}>
                {loading ? 'Création…' : 'Créer le compte'}
              </button>
            </div>
          </form>

          <div className={styles.switchRow}>
            Vous avez déjà un compte ?
            <button type="button" className={styles.switchLink} onClick={onSwitchToLogin}>
              Retour à la connexion
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
