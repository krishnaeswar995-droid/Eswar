// Mock data for the prototype. Generated relative to "now" so the demo always
// has upcoming slots, today's schedule and past history whenever it is opened.
import { addDays, isWeekend, todayISO, workday, workingSlots } from '../lib/dates.js';

export const SPECIALIZATIONS = [
  'Cardiology', 'Dermatology', 'ENT', 'General Medicine', 'Neurology', 'Orthopaedics', 'Paediatrics',
];

const DOCTORS = [
  { id: 'd1', name: 'Dr Priya Raman', specialization: 'Cardiology', experience: 14, fee: 120,
    qualifications: 'MBBS, MD (Cardiology), FRCP', languages: ['English', 'Tamil', 'Hindi'],
    bio: 'Consultant cardiologist with a focus on hypertension, heart failure and preventive cardiology.',
    pattern: 'full', active: true },
  { id: 'd2', name: 'Dr James Whitfield', specialization: 'Cardiology', experience: 9, fee: 110,
    qualifications: 'MBChB, MRCP (Cardiology)', languages: ['English'],
    bio: 'Cardiologist specialising in arrhythmia, palpitations and ECG-led assessment.',
    pattern: 'morning', active: true },
  { id: 'd3', name: 'Dr Amelia Okafor', specialization: 'Dermatology', experience: 11, fee: 95,
    qualifications: 'MBBS, MRCP (Dermatology)', languages: ['English', 'Yoruba'],
    bio: 'Dermatologist treating eczema, psoriasis, acne and skin-lesion checks.',
    pattern: 'afternoon', active: true },
  { id: 'd4', name: 'Dr Tomasz Nowak', specialization: 'Orthopaedics', experience: 16, fee: 130,
    qualifications: 'MD, FRCS (Tr & Orth)', languages: ['English', 'Polish'],
    bio: 'Orthopaedic surgeon for knee, hip and sports injuries.',
    pattern: 'full', active: true },
  { id: 'd5', name: 'Dr Sarah Lindqvist', specialization: 'Paediatrics', experience: 8, fee: 85,
    qualifications: 'MBBS, MRCPCH', languages: ['English', 'Swedish'],
    bio: 'Paediatrician for children from birth to 16, including asthma and allergy clinics.',
    pattern: 'morning', active: true },
  { id: 'd6', name: 'Dr Omar Haddad', specialization: 'Neurology', experience: 12, fee: 140,
    qualifications: 'MBBS, PhD, MRCP (Neurology)', languages: ['English', 'Arabic', 'French'],
    bio: 'Neurologist with clinics for headache, epilepsy and movement disorders.',
    pattern: 'afternoon', active: true },
  { id: 'd7', name: 'Dr Grace Chen', specialization: 'General Medicine', experience: 6, fee: 60,
    qualifications: 'MBBS, MRCGP', languages: ['English', 'Mandarin'],
    bio: 'General physician for routine consultations, follow-ups and referrals.',
    pattern: 'full', active: true },
  { id: 'd8', name: 'Dr Rahul Mehta', specialization: 'ENT', experience: 10, fee: 90,
    qualifications: 'MBBS, MS (ENT), FRCS', languages: ['English', 'Hindi', 'Gujarati'],
    bio: 'ENT surgeon for sinus, hearing and throat conditions. Currently on leave.',
    pattern: 'morning', active: false },
];

const PATTERNS = {
  full: (s) => s.filter((t) => t < '12:30' || t >= '14:00'),
  morning: (s) => s.filter((t) => t < '13:00'),
  afternoon: (s) => s.filter((t) => t >= '13:00'),
};

const emailFor = (name) =>
  `${name.replace(/^Dr /, '').toLowerCase().replace(/\s+/g, '.')}@hospital.demo`;

export function buildSeed(now = new Date()) {
  const today = todayISO(now);
  const all = workingSlots();

  // Published availability for every weekday from 7 days ago to 14 days ahead.
  const availability = {};
  for (const doc of DOCTORS) {
    availability[doc.id] = {};
    for (let i = -7; i <= 14; i++) {
      const date = addDays(today, i);
      if (isWeekend(date)) continue;
      availability[doc.id][date] = PATTERNS[doc.pattern](all);
    }
  }

  const users = [
    { id: 'u-admin', role: 'admin', name: 'Hospital Admin', email: 'admin@hospital.demo', password: 'Admin@123', active: true },
    { id: 'p1', role: 'patient', name: 'Alice Morgan', email: 'alice@demo.com', password: 'Patient@123',
      mobile: '07700 900111', dob: '1988-04-12', active: true },
    { id: 'p2', role: 'patient', name: 'Ben Carter', email: 'ben@demo.com', password: 'Patient@123',
      mobile: '07700 900222', dob: '1975-09-30', active: true },
    { id: 'p3', role: 'patient', name: 'Chloe Adeyemi', email: 'chloe@demo.com', password: 'Patient@123',
      mobile: '07700 900333', dob: '1996-01-21', active: true },
    { id: 'p4', role: 'patient', name: 'Daniel Price', email: 'daniel@demo.com', password: 'Patient@123',
      mobile: '07700 900444', dob: '1969-06-02', active: false },
    ...DOCTORS.map((d) => ({
      id: `u-${d.id}`, role: 'doctor', doctorId: d.id, name: d.name, email: emailFor(d.name),
      password: 'Doctor@123', active: d.active,
    })),
  ];

  let ref = 1000;
  const appt = (patientId, doctorId, date, time, status, extra = {}) => ({
    id: `APT-${++ref}`, patientId, doctorId, date, time, status,
    reason: extra.reason || '', createdAt: now.toISOString(), history: [], ...extra,
  });

  const appointments = [
    // Alice — 2 upcoming, 2 past
    appt('p1', 'd1', workday(2, now), '10:00', 'Booked', { reason: 'Follow-up on blood pressure readings' }),
    appt('p1', 'd7', workday(5, now), '14:30', 'Booked', { reason: 'Annual health check' }),
    appt('p1', 'd3', workday(-6, now), '14:00', 'Completed', { reason: 'Rash on forearm' }),
    appt('p1', 'd1', workday(-3, now), '09:30', 'Cancelled', { reason: 'Chest tightness', cancelledBy: 'patient', cancelReason: 'Feeling better' }),
    // Ben — occupies the slot next to Alice's (used for double-booking demos)
    appt('p2', 'd1', workday(2, now), '10:30', 'Booked', { reason: 'Palpitations' }),
    appt('p2', 'd1', workday(-1, now), '09:00', 'Booked', { reason: 'Review of ECG results' }),
    appt('p2', 'd4', workday(3, now), '11:00', 'Booked', { reason: 'Knee pain after running' }),
    // Chloe
    appt('p3', 'd1', workday(1, now), '09:00', 'Booked', { reason: 'Shortness of breath on exercise' }),
    appt('p3', 'd1', workday(-2, now), '15:00', 'Completed', { reason: 'Routine review' }),
    appt('p3', 'd5', workday(4, now), '09:30', 'Booked', { reason: 'Child vaccination query' }),
    // Today for Dr Raman (shows on doctor dashboard)
    appt('p3', 'd1', workday(0, now), '11:30', 'Booked', { reason: 'Medication review' }),
    appt('p2', 'd1', workday(0, now), '15:30', 'Booked', { reason: 'Blood test results' }),
  ];

  return {
    version: 1,
    seededAt: now.toISOString(),
    doctors: DOCTORS.map(({ pattern, ...d }) => d),
    users,
    availability,
    appointments,
    nextRef: ref + 1,
    audit: [],
  };
}

export const DEMO_ACCOUNTS = [
  { role: 'Patient', email: 'alice@demo.com', password: 'Patient@123' },
  { role: 'Doctor', email: 'priya.raman@hospital.demo', password: 'Doctor@123' },
  { role: 'Admin', email: 'admin@hospital.demo', password: 'Admin@123' },
];
