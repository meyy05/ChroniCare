import React, { useState, useEffect } from 'react';
import API from '../services/api';
import styles from './DoctorNotifications.module.css';

export default function DoctorNotifications({ token, onRequestProcessed }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data } = await API.get('/requests/doctor/pending', {
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

  const handleAction = async (requestId, action) => {
    setProcessing(requestId);
    try {
      await API.put(`/requests/${requestId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(prev => prev.filter(r => r.id !== requestId));
      onRequestProcessed?.();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${action} request`);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.container}>
      <h2>Patient Requests</h2>

      {error && <div className={styles.error}>{error}</div>}

      {requests.length === 0 ? (
        <div className={styles.empty}>No pending requests</div>
      ) : (
        <div className={styles.requestsList}>
          {requests.map(req => (
            <div key={req.id} className={styles.requestCard}>
              <div className={styles.patientInfo}>
                <h3>{req.first_name} {req.last_name}</h3>
                <p className={styles.email}>{req.email}</p>
                {req.dob && <p className={styles.detail}>📅 DOB: {req.dob}</p>}
                {req.sex && <p className={styles.detail}>Gender: {req.sex}</p>}
                {req.blood_type && <p className={styles.detail}>Blood: {req.blood_type}</p>}
                {req.conditions && <p className={styles.detail}>Conditions: {req.conditions}</p>}
                {req.phone && <p className={styles.detail}>📞 {req.phone}</p>}
                <p className={styles.requestedAt}>
                  Requested {new Date(req.requested_at).toLocaleDateString()}
                </p>
              </div>
              <div className={styles.actions}>
                <button
                  onClick={() => handleAction(req.id, 'accept')}
                  disabled={processing === req.id}
                  className={`${styles.btn} ${styles.acceptBtn}`}
                >
                  ✓ Accept
                </button>
                <button
                  onClick={() => handleAction(req.id, 'reject')}
                  disabled={processing === req.id}
                  className={`${styles.btn} ${styles.rejectBtn}`}
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
