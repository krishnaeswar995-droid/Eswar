// App state: mock "database" persisted in localStorage, plus the logged-in session.
// Every mutating action validates with rules.js first, so the UI cannot bypass a business rule.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { buildSeed } from '../data/mockData.js';
import {
  validateAddSlot, validateBooking, validateCancel, validateComplete, validateRemoveSlot, validateReschedule,
} from './rules.js';

const DB_KEY = 'hab-demo-db-v1';
const SESSION_KEY = 'hab-demo-session-v1';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback();
  } catch {
    return fallback();
  }
}
function save(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* storage unavailable — demo still works in memory */ }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [db, setDbState] = useState(() => load(DB_KEY, () => buildSeed()));
  const [sessionId, setSessionId] = useState(() => load(SESSION_KEY, () => null));
  const [toast, setToast] = useState(null);
  const dbRef = useRef(db);

  const setDb = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(dbRef.current) : updater;
    dbRef.current = next;
    save(DB_KEY, next);
    setDbState(next);
  }, []);

  const user = db.users.find((u) => u.id === sessionId) || null;

  const notify = useCallback((message, tone = 'success') => {
    setToast({ message, tone, id: Date.now() });
    setTimeout(() => setToast((t) => (t && t.message === message ? null : t)), 4500);
  }, []);

  const audit = (d, actor, action, detail) => ({
    ...d,
    audit: [{ at: new Date().toISOString(), actor: actor?.name || 'System', role: actor?.role, action, detail }, ...d.audit].slice(0, 200),
  });

  const actions = useMemo(() => {
    const current = () => dbRef.current;
    const me = () => current().users.find((u) => u.id === load(SESSION_KEY, () => null));

    return {
      login(email, password) {
        const u = current().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
        if (!u || u.password !== password) return { ok: false, error: 'Invalid email or password.' };
        if (!u.active) return { ok: false, error: 'This account is deactivated. Contact the hospital.' };
        save(SESSION_KEY, u.id);
        setSessionId(u.id);
        return { ok: true, user: u };
      },
      logout() {
        save(SESSION_KEY, null);
        setSessionId(null);
      },
      register({ name, email, mobile, dob, password }) {
        const d = current();
        if (d.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase()))
          return { ok: false, field: 'email', error: 'An account with this email already exists.' };
        const u = { id: `p${Date.now()}`, role: 'patient', name: name.trim(), email: email.trim(), mobile, dob, password, active: true };
        setDb(audit({ ...d, users: [...d.users, u] }, u, 'Registered', u.email));
        save(SESSION_KEY, u.id);
        setSessionId(u.id);
        return { ok: true, user: u };
      },

      book({ doctorId, date, time, reason }) {
        const d = current();
        const u = me();
        const v = validateBooking(d, { user: u, doctorId, date, time });
        if (!v.ok) return v;
        const appt = {
          id: `APT-${d.nextRef}`, patientId: u.id, doctorId, date, time, status: 'Booked',
          reason: reason?.trim() || '', createdAt: new Date().toISOString(), history: [],
        };
        setDb(audit({ ...d, appointments: [...d.appointments, appt], nextRef: d.nextRef + 1 }, u, 'Booked', `${appt.id} ${date} ${time}`));
        return { ok: true, appt };
      },

      cancel(apptId, reason = '') {
        const d = current();
        const u = me();
        const appt = d.appointments.find((a) => a.id === apptId);
        const v = validateCancel(appt, u);
        if (!v.ok) return v;
        if (u.role !== 'patient' && !reason.trim()) return { ok: false, error: 'Enter a reason for cancelling.' };
        const updated = { ...appt, status: 'Cancelled', cancelledBy: u.role, cancelReason: reason.trim() };
        setDb(audit({ ...d, appointments: d.appointments.map((a) => (a.id === apptId ? updated : a)) }, u, 'Cancelled', `${apptId} — slot released`));
        return { ok: true, appt: updated };
      },

      reschedule(apptId, date, time) {
        const d = current();
        const u = me();
        const appt = d.appointments.find((a) => a.id === apptId);
        const v = validateReschedule(d, appt, { actor: u, date, time });
        if (!v.ok) return v;
        const updated = {
          ...appt, date, time,
          history: [...appt.history, { from: `${appt.date} ${appt.time}`, to: `${date} ${time}`, by: u.role, at: new Date().toISOString() }],
        };
        setDb(audit({ ...d, appointments: d.appointments.map((a) => (a.id === apptId ? updated : a)) }, u, 'Rescheduled', `${apptId} ${appt.date} ${appt.time} → ${date} ${time}`));
        return { ok: true, appt: updated };
      },

      complete(apptId) {
        const d = current();
        const u = me();
        const appt = d.appointments.find((a) => a.id === apptId);
        const v = validateComplete(appt, u);
        if (!v.ok) return v;
        setDb(audit({ ...d, appointments: d.appointments.map((a) => (a.id === apptId ? { ...a, status: 'Completed' } : a)) }, u, 'Completed', apptId));
        return { ok: true };
      },

      addSlots(doctorId, date, times) {
        const d = current();
        const u = me();
        for (const t of times) {
          const v = validateAddSlot(date, t);
          if (!v.ok) return v;
        }
        const existing = d.availability[doctorId]?.[date] || [];
        const merged = [...new Set([...existing, ...times])].sort();
        setDb(audit({ ...d, availability: { ...d.availability, [doctorId]: { ...d.availability[doctorId], [date]: merged } } }, u, 'Availability added', `${doctorId} ${date}: ${times.join(', ')}`));
        return { ok: true };
      },

      removeSlot(doctorId, date, time) {
        const d = current();
        const u = me();
        const v = validateRemoveSlot(d, doctorId, date, time);
        if (!v.ok) return v;
        const remaining = (d.availability[doctorId]?.[date] || []).filter((t) => t !== time);
        setDb(audit({ ...d, availability: { ...d.availability, [doctorId]: { ...d.availability[doctorId], [date]: remaining } } }, u, 'Availability removed', `${doctorId} ${date} ${time}`));
        return { ok: true };
      },

      updateDoctor(doctorId, changes) {
        const d = current();
        const u = me();
        setDb(audit({
          ...d,
          doctors: d.doctors.map((x) => (x.id === doctorId ? { ...x, ...changes } : x)),
          users: d.users.map((x) => (x.doctorId === doctorId && 'active' in changes ? { ...x, active: changes.active } : x)),
        }, u, 'Doctor updated', `${doctorId}: ${Object.keys(changes).join(', ')}`));
        return { ok: true };
      },

      addDoctor(doc) {
        const d = current();
        const u = me();
        if (d.users.some((x) => x.email.toLowerCase() === doc.email.toLowerCase()))
          return { ok: false, error: 'An account with this email already exists.' };
        const id = `d${Date.now()}`;
        const { email, ...profile } = doc;
        setDb(audit({
          ...d,
          doctors: [...d.doctors, { id, ...profile, active: true }],
          users: [...d.users, { id: `u-${id}`, role: 'doctor', doctorId: id, name: doc.name, email, password: 'Doctor@123', active: true }],
          availability: { ...d.availability, [id]: {} },
        }, u, 'Doctor added', doc.name));
        return { ok: true, id };
      },

      setPatientActive(patientId, active) {
        const d = current();
        const u = me();
        setDb(audit({ ...d, users: d.users.map((x) => (x.id === patientId ? { ...x, active } : x)) }, u, active ? 'Patient reactivated' : 'Patient deactivated', patientId));
        return { ok: true };
      },

      /** Demo helper: simulates a different patient taking a slot while you are on the review screen. */
      simulateOtherBooking(doctorId, date, time) {
        const d = current();
        const other = { id: `APT-${d.nextRef}`, patientId: 'p3', doctorId, date, time, status: 'Booked', reason: 'Booked by another patient', createdAt: new Date().toISOString(), history: [] };
        setDb({ ...d, appointments: [...d.appointments, other], nextRef: d.nextRef + 1 });
      },

      resetDemo() {
        setDb(buildSeed());
        save(SESSION_KEY, null);
        setSessionId(null);
      },
    };
  }, [setDb]);

  const value = { db, user, toast, notify, ...actions };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
