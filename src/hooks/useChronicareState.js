import { useState, useCallback } from 'react';
import { mockData, defaultProfile, defaultThresholds } from '../data/mockData';
import { generateAlerts } from '../utils/constants';

export function useChronicareState() {
  const [data, setData] = useState(mockData);
  const [profile, setProfile] = useState(defaultProfile);
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [toast, setToast] = useState('');

  const alerts = generateAlerts(data, thresholds);

  const addEntry = useCallback((entry) => {
    setData(prev => [entry, ...prev]);
  }, []);

  const deleteEntry = useCallback((id) => {
    setData(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateProfile = useCallback((updates) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const updateThresholds = useCallback((updates) => {
    setThresholds(prev => ({ ...prev, ...updates }));
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }, []);

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
  };
}
