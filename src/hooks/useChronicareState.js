import { useState, useCallback, useEffect } from 'react';
import { defaultThresholds } from '../Data/mockData';
import { generateAlerts } from '../utils/constants';
import API from '../services/api';

const EMPTY_PROFILE = {
  firstName: '',
  lastName: '',
  dob: '',
  sex: '',
  doctor: '',
  conditions: '',
  bloodType: '',
  phone: '',
  email: '',
  practiceType: '',
  workplaceName: '',
  workplaceCity: '',
  specialty: '',
};

function normalizeProfile(user) {
  if (!user) return { ...EMPTY_PROFILE };

  const firstName = user.firstName || user.first_name || '';
  const lastName = user.lastName || user.last_name || '';
  const email = user.email || '';

  if (user.role === 'doctor') {
    const doctorProfile = user.profile || {};
    return {
      ...EMPTY_PROFILE,
      firstName,
      lastName,
      email,
      practiceType: doctorProfile.practice_type || 'hospital',
      workplaceName: doctorProfile.workplace_name || '',
      workplaceCity: doctorProfile.workplace_city || '',
      specialty: doctorProfile.specialty || '',
      doctor: doctorProfile.workplace_name
        ? `${doctorProfile.workplace_name}${doctorProfile.workplace_city ? `, ${doctorProfile.workplace_city}` : ''}`
        : '',
      conditions: doctorProfile.specialty || '',
      phone: doctorProfile.phone || '',
    };
  }

  const patientProfile = user.profile || {};
  return {
    ...EMPTY_PROFILE,
    firstName,
    lastName,
    email,
    dob: patientProfile.dob || '',
    sex: patientProfile.sex || '',
    conditions: patientProfile.conditions || '',
    bloodType: patientProfile.blood_type || '',
    phone: patientProfile.phone || '',
  };
}

export function useChronicareState({ authToken, currentUser }) {
  const [data, setData] = useState([]);
  const [profile, setProfile] = useState(() => normalizeProfile(currentUser));
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [toast, setToast] = useState('');
  const [patientDoctors, setPatientDoctors] = useState([]);

  const alerts = generateAlerts(data, thresholds);

  const addEntry = useCallback(async (entry) => {
    if (!authToken || !currentUser || currentUser.role !== 'patient') {
      setData(prev => [{ ...entry, id: Date.now() }, ...prev]);
      return;
    }

    const response = await API.post(`/patients/${currentUser.id}/entries`, entry, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setData(prev => [response.data, ...prev]);
  }, [authToken, currentUser]);

  const deleteEntry = useCallback(async (id) => {
    if (!authToken || !currentUser || currentUser.role !== 'patient') {
      setData(prev => prev.filter(e => e.id !== id));
      return;
    }

    await API.delete(`/patients/${currentUser.id}/entries/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setData(prev => prev.filter(e => e.id !== id));
  }, [authToken, currentUser]);

  const updateProfile = useCallback(async (updates) => {
    if (!authToken || !currentUser) {
      setProfile(prev => ({ ...prev, ...updates }));
      return;
    }

    if (currentUser.role === 'doctor') {
      await API.put('/auth/me', updates, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setProfile(prev => ({ ...prev, ...updates }));
      return;
    }

    await API.put(`/patients/${currentUser.id}/profile`, updates, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setProfile(prev => ({ ...prev, ...updates }));
  }, [authToken, currentUser]);

  const updateThresholds = useCallback(async (updates) => {
    if (!authToken || !currentUser || currentUser.role !== 'patient') {
      setThresholds(prev => ({ ...prev, ...updates }));
      return;
    }

    const response = await API.put(`/patients/${currentUser.id}/thresholds`, updates, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    setThresholds(response.data.thresholds || updates);
  }, [authToken, currentUser]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }, []);

  // Try to load real data from backend public demo endpoints (falls back to mock data)
  useEffect(() => {
    let cancelled = false;
    if (!authToken || !currentUser) {
      setData([]);
      setProfile(normalizeProfile(currentUser));
      setThresholds(defaultThresholds);
      setPatientDoctors([]);
      return () => { cancelled = true; };
    }

    let mounted = true;
    (async () => {
      try {
        const meRes = await API.get('/auth/me', {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (!mounted || cancelled) return;

        const me = meRes.data;
        setProfile(normalizeProfile(me));

        if (me.role === 'patient') {
          const [entriesRes, thresholdsRes, doctorsRes] = await Promise.all([
            API.get(`/patients/${me.id}/entries`, {
              headers: { Authorization: `Bearer ${authToken}` },
            }),
            API.get(`/patients/${me.id}/thresholds`, {
              headers: { Authorization: `Bearer ${authToken}` },
            }),
            API.get('/patients/me/doctors', {
              headers: { Authorization: `Bearer ${authToken}` },
            }).catch(() => ({ data: [] })),
          ]);

          if (!mounted || cancelled) return;
          const currentDoctors = Array.isArray(doctorsRes.data) ? doctorsRes.data : [];

          setData(entriesRes.data.entries || []);
          setThresholds(thresholdsRes.data || defaultThresholds);
          setPatientDoctors(currentDoctors);

          const doctorNames = currentDoctors
            .map(doctor => `${doctor.firstName} ${doctor.lastName}`.trim())
            .filter(Boolean);
          setProfile(prev => ({
            ...prev,
            doctor: doctorNames.join(', '),
          }));
        } else {
          setData([]);
          setThresholds(defaultThresholds);
          setPatientDoctors([]);
        }
      } catch (e) {
        if (!mounted || cancelled) return;
        setData([]);
        setThresholds(defaultThresholds);
        setProfile(normalizeProfile(currentUser));
        setPatientDoctors([]);
      }
    })();
    return () => { mounted = false; cancelled = true; };
  }, [authToken, currentUser]);

  return {
    data,
    profile,
    thresholds,
    alerts,
    toast,
    addEntry,
    deleteEntry,
    updateProfile,
    updateThresholds,
    showToast,
    patientDoctors,
  };
}
