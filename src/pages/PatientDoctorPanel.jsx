import { useEffect, useMemo, useState } from 'react';
import API from '../services/api';
import Chat from './Chat';
import styles from './PatientDoctorPanel.module.css';

export default function PatientDoctorPanel({ token, patientId, currentUserName = '', patientDoctors = [] }) {
  const [doctors, setDoctors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(patientDoctors[0]?.id || null);
  const [search, setSearch] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedDoctorId(prev => prev || patientDoctors[0]?.id || null);
  }, [patientDoctors]);

  useEffect(() => {
    loadConnections();
    loadDoctors('');
  }, []);

  async function loadConnections() {
    setLoadingConnections(true);
    try {
      const [requestsRes] = await Promise.all([
        API.get('/requests/patient', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
    } catch (err) {
      console.error(err);
      setError('Impossible de charger vos médecins');
    } finally {
      setLoadingConnections(false);
    }
  }

  async function loadDoctors(query) {
    setLoadingDoctors(true);
    setError('');
    try {
      const url = query.trim()
        ? `/doctors?search=${encodeURIComponent(query.trim())}`
        : '/doctors';
      const { data } = await API.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError('Impossible de charger la liste des médecins');
    } finally {
      setLoadingDoctors(false);
    }
  }

  const requestStatusByDoctorId = useMemo(() => {
    const map = new Map();
    for (const request of requests) {
      map.set(request.doctor_id, request.status);
    }
    return map;
  }, [requests]);

  const currentDoctorIds = useMemo(() => new Set(patientDoctors.map(doctor => doctor.id)), [patientDoctors]);
  const selectedDoctor = patientDoctors.find(doctor => doctor.id === selectedDoctorId) || null;

  const handleSearch = (value) => {
    setSearch(value);
    loadDoctors(value);
  };

  const handleSendRequest = async (doctorId) => {
    try {
      await API.post('/requests', { doctorId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadConnections();
    } catch (err) {
      setError(err?.response?.data?.error || 'Impossible d’envoyer la requête');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Mon médecin</h2>
          <p>{currentUserName ? `Connecté en tant que ${currentUserName}` : 'Choisissez un médecin et discutez avec lui.'}</p>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.topGrid}>
        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <h3>Mon médecin actuel</h3>
            {loadingConnections && <span className={styles.muted}>Chargement…</span>}
          </div>

          {patientDoctors.length === 0 ? (
            <div className={styles.empty}>
              Aucun médecin n’est encore associé à votre compte.
            </div>
          ) : (
            <div className={styles.currentList}>
              {patientDoctors.map(doctor => (
                <button
                  key={doctor.id}
                  className={`${styles.currentDoctor} ${selectedDoctorId === doctor.id ? styles.currentDoctorActive : ''}`}
                  onClick={() => setSelectedDoctorId(doctor.id)}
                >
                  <div className={styles.doctorName}>Dr. {doctor.firstName} {doctor.lastName}</div>
                  <div className={styles.meta}>{doctor.specialty || 'Spécialité non renseignée'}</div>
                  <div className={styles.meta}>
                    {doctor.workplaceName || doctor.workplaceCity
                      ? `${doctor.workplaceName || 'Lieu non renseigné'}${doctor.workplaceCity ? `, ${doctor.workplaceCity}` : ''}`
                      : 'Structure non renseignée'}
                  </div>
                  <div className={styles.badge}>Médecin actuel</div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <h3>Recherche de médecins</h3>
          </div>
          <input
            className={styles.searchInput}
            placeholder="Rechercher par nom, spécialité ou structure"
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />

          <div className={styles.doctorList}>
            {loadingDoctors ? (
              <div className={styles.empty}>Chargement…</div>
            ) : doctors.length === 0 ? (
              <div className={styles.empty}>Aucun médecin trouvé</div>
            ) : (
              doctors.map(doctor => {
                const status = requestStatusByDoctorId.get(doctor.id);
                const isCurrent = currentDoctorIds.has(doctor.id);
                return (
                  <div key={doctor.id} className={styles.doctorCard}>
                    <div>
                      <div className={styles.doctorName}>Dr. {doctor.first_name} {doctor.last_name}</div>
                      <div className={styles.meta}>{doctor.specialty || 'Spécialité non renseignée'}</div>
                      <div className={styles.meta}>
                        {doctor.workplace_name || doctor.workplace_city
                          ? `${doctor.workplace_name || 'Lieu non renseigné'}${doctor.workplace_city ? `, ${doctor.workplace_city}` : ''}`
                          : 'Structure non renseignée'}
                      </div>
                    </div>
                    <div className={styles.actions}>
                      {isCurrent ? (
                        <button className={styles.chatBtn} onClick={() => setSelectedDoctorId(doctor.id)}>
                          Ouvrir le chat
                        </button>
                      ) : status === 'pending' ? (
                        <span className={styles.statusPill}>Demande envoyée</span>
                      ) : (
                        <button className={styles.requestBtn} onClick={() => handleSendRequest(doctor.id)}>
                          Envoyer une demande
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <section className={styles.chatSection}>
        <div className={styles.sectionHeader}>
          <h3>Chat direct</h3>
          {!selectedDoctor && <span className={styles.muted}>Sélectionnez un médecin actuel</span>}
        </div>
        {selectedDoctor ? (
          <Chat
            token={token}
            currentUserId={patientId}
            currentUserRole="patient"
            contactId={selectedDoctor.id}
            contactName={`Dr. ${selectedDoctor.firstName} ${selectedDoctor.lastName}`}
          />
        ) : (
          <div className={styles.empty}>
            Votre chat apparaîtra ici dès qu’un médecin sera sélectionné.
          </div>
        )}
      </section>
    </div>
  );
}
