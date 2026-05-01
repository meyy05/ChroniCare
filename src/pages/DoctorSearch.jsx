import React, { useState, useEffect } from 'react';
import API from '../services/api';
import styles from './DoctorSearch.module.css';

export default function DoctorSearch({ token, onRequestSent }) {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentRequests, setSentRequests] = useState(new Set());

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const url = query 
        ? `/doctors?search=${encodeURIComponent(query)}`
        : '/doctors';
      
      const { data } = await API.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDoctors(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load doctors');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    if (e.target.value.trim()) {
      fetchDoctors(e.target.value);
    } else {
      fetchDoctors();
    }
  };

  const handleSendRequest = async (doctorId) => {
    try {
      await API.post('/requests', { doctorId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSentRequests(prev => new Set(prev).add(doctorId));
      onRequestSent?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send request');
    }
  };

  return (
    <div className={styles.container}>
      <h2>Find a Doctor</h2>
      
      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="Search by name, specialty, or workplace..."
          value={search}
          onChange={handleSearch}
          className={styles.searchInput}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Loading doctors...</div>
      ) : doctors.length === 0 ? (
        <div className={styles.empty}>No doctors found</div>
      ) : (
        <div className={styles.doctorsList}>
          {doctors.map(doctor => (
            <div key={doctor.id} className={styles.doctorCard}>
              <div className={styles.doctorInfo}>
                <h3>{doctor.first_name} {doctor.last_name}</h3>
                <p className={styles.specialty}>{doctor.specialty}</p>
                {doctor.workplace_name && (
                  <p className={styles.workplace}>
                    🏥 {doctor.workplace_name}, {doctor.workplace_city}
                  </p>
                )}
                <p className={styles.practice}>
                  Type: <span>{doctor.practice_type}</span>
                </p>
                {doctor.phone && (
                  <p className={styles.phone}>📞 {doctor.phone}</p>
                )}
              </div>
              <button
                onClick={() => handleSendRequest(doctor.id)}
                disabled={sentRequests.has(doctor.id)}
                className={styles.requestBtn}
              >
                {sentRequests.has(doctor.id) ? '✓ Request Sent' : 'Send Request'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
