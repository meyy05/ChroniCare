export const UNITS = {
  glycemie:  'g/L',
  tension:   'mmHg',
  poids:     'kg',
  frequence: 'bpm',
};

export const ICONS = {
  glycemie:  '🩸',
  tension:   '💉',
  poids:     '⚖️',
  frequence: '❤️',
};

export const LABELS = {
  glycemie:  'Glycémie',
  tension:   'Tension artérielle',
  poids:     'Poids',
  frequence: 'Fréq. cardiaque',
};

export const HINTS = {
  glycemie:  'Valeurs normales à jeun : 0.70 – 1.10 g/L',
  tension:   'Valeurs normales : 90 – 120 mmHg (systolique)',
  poids:     'En kilogrammes (ex: 73.5)',
  frequence: 'Valeurs normales au repos : 60 – 100 bpm',
};

export const PLACEHOLDERS = {
  glycemie:  '1.20',
  tension:   '128',
  poids:     '73.5',
  frequence: '72',
};

export const CHART_COLORS = {
  glycemie:  '#2fa69e',
  tension:   '#7c3aed',
  poids:     '#059669',
  frequence: '#d97706',
};

export const CONTEXTS = [
  'À jeun',
  'Après repas',
  'Au repos',
  'Après exercice',
  'Avant coucher',
  'Matin',
];

/** Returns { label, level } where level is 'normal'|'warning'|'danger' */
export function getStatus(type, val, thresholds) {
  const t = thresholds[type];
  if (!t) return { label: 'Mesuré', level: 'normal' };

  if (val < t.min || val > t.max) {
    const severity = getOutOfRangeSeverity(type, val, t);
    return { label: severity === 'danger' ? 'Critique' : 'Limite', level: severity };
  }
  return { label: 'Normal', level: 'normal' };
}

function getOutOfRangeSeverity(type, val, t) {
  if (type === 'glycemie') {
    if (val < 0.55 || val > 2.50) return 'danger';
    return 'warning';
  }
  if (type === 'tension') {
    if (val > 160 || val < 80) return 'danger';
    return 'warning';
  }
  if (type === 'frequence') {
    if (val > 120 || val < 50) return 'danger';
    return 'warning';
  }
  return 'warning';
}

export function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function initials(firstName, lastName) {
  return `${(firstName || 'A')[0]}${(lastName || 'B')[0]}`.toUpperCase();
}

export function computeStats(values) {
  if (!values || values.length === 0) return null;
  const nums = values.map(v => v.val);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  const last = nums[nums.length - 1];
  const prev = nums.length > 1 ? nums[nums.length - 2] : null;
  const trend = prev !== null ? (last > prev ? 'up' : last < prev ? 'down' : 'stable') : 'stable';
  return { min, max, avg, trend, count: nums.length };
}

export function generateAlerts(data, thresholds) {
  return data
    .map(item => {
      const s = getStatus(item.type, item.val, thresholds);
      if (s.level === 'normal') return null;
      return {
        id: item.id,
        type: item.type,
        val: item.val,
        date: item.date,
        time: item.time,
        level: s.level,
        label: s.label,
        message: buildAlertMessage(item, thresholds[item.type]),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

function buildAlertMessage(item, t) {
  const label = LABELS[item.type] || item.type;
  const unit = UNITS[item.type] || '';
  if (item.val > t.max) return `${label} élevée : ${item.val} ${unit} (seuil max : ${t.max} ${unit})`;
  if (item.val < t.min) return `${label} basse : ${item.val} ${unit} (seuil min : ${t.min} ${unit})`;
  return `${label} hors normes : ${item.val} ${unit}`;
}
