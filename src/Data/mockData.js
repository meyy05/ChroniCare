export const mockData = [
  { id: 1,  type: 'glycemie',  val: 1.10, date: '2026-04-30', time: '07:30', context: 'À jeun',        note: '' },
  { id: 2,  type: 'tension',   val: 128,  date: '2026-04-30', time: '08:00', context: 'Au repos',       note: '' },
  { id: 3,  type: 'glycemie',  val: 1.85, date: '2026-04-29', time: '12:45', context: 'Après repas',    note: 'Repas copieux' },
  { id: 4,  type: 'poids',     val: 73.5, date: '2026-04-29', time: '07:00', context: 'Matin',          note: '' },
  { id: 5,  type: 'tension',   val: 142,  date: '2026-04-28', time: '09:15', context: 'Après exercice', note: 'Légèrement stressé' },
  { id: 6,  type: 'glycemie',  val: 0.95, date: '2026-04-28', time: '07:00', context: 'À jeun',         note: '' },
  { id: 7,  type: 'frequence', val: 72,   date: '2026-04-27', time: '06:30', context: 'Au repos',       note: '' },
  { id: 8,  type: 'glycemie',  val: 2.10, date: '2026-04-26', time: '14:00', context: 'Après repas',    note: 'Déjeuner au restaurant' },
  { id: 9,  type: 'tension',   val: 118,  date: '2026-04-25', time: '08:30', context: 'Matin',          note: '' },
  { id: 10, type: 'glycemie',  val: 1.05, date: '2026-04-24', time: '07:15', context: 'À jeun',         note: '' },
  { id: 11, type: 'frequence', val: 88,   date: '2026-04-23', time: '17:00', context: 'Après exercice', note: '30 min marche' },
  { id: 12, type: 'poids',     val: 73.8, date: '2026-04-22', time: '07:00', context: 'Matin',          note: '' },
];

export const defaultProfile = {
  firstName: 'Ahmed',
  lastName: 'Bensalem',
  dob: '1978-03-14',
  sex: 'M',
  doctor: 'Dr. Hamed',
  conditions: 'Diabète type 2, Hypertension',
  bloodType: 'A+',
  phone: '',
  email: '',
};

export const defaultThresholds = {
  glycemie:  { min: 0.70, max: 1.26 },
  tension:   { min: 90,   max: 139  },
  poids:     { min: 50,   max: 120  },
  frequence: { min: 60,   max: 100  },
};