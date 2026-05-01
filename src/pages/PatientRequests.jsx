import React, { useState, useEffect } from 'react';
import API from '../services/api';
import styles from './PatientRequests.module.css';

export default function PatientRequests({ token }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data } = await API.get('/requests/patient', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load requests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  const pending = requests.filter(r => r.status === 'pending');
  const processed = requests.filter(r => r.status !== 'pending');

  return (
    <div className={styles.container}>
      <h2>My Doctor Requests</h2>

      {error && <div className={styles.error}>{error}</div>}

      {pending.length === 0 && processed.length === 0 ? (
        <div className={styles.empty}>
          No requests yet. <br /> Search for a doctor to send a request.
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className={styles.section}>
              <h3>Pending ({pending.length})</h3>
              <div className={styles.requestsList}>
                {pending.map(req => (
                  <div key={req.id} className={`${styles.requestCard} ${styles.pending}`}>
                    <div>
                      <p className={styles.doctorName}>Dr. {req.doctor_name}</p>
                      <p className={styles.specialty}>{req.specialty}</p>
                      <p className={styles.date}>
                        Sent {new Date(req.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={styles.status}>⏳ Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {processed.length > 0 && (
            <div className={styles.section}>
              <h3>History</h3>
              <div className={styles.requestsList}>
                {processed.map(req => (
                  <div key={req.id} className={`${styles.requestCard} ${styles[req.status]}`}>
                    <div>
                      <p className={styles.doctorName}>Dr. {req.doctor_name}</p>
                      <p className={styles.specialty}>{req.specialty}</p>
                      <p className={styles.date}>
                        {req.status === 'accepted' ? 'Accepted' : 'Rejected'} {new Date(req.responded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={styles.status}>
                      {req.status === 'accepted' ? '✓ Accepted' : '✗ Rejected'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
