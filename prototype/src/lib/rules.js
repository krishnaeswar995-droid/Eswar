// Business rules from the BRD (section 7), as pure functions.
// Each validator returns { ok: true } or { ok: false, error, rule }.
// In production these checks must also run server-side (BRD assumption 8).
import {
  BOOKING_HORIZON_DAYS, CANCEL_CUTOFF_HOURS, MAX_UPCOMING_PER_PATIENT, SLOT_MINUTES,
  WORK_END, WORK_START, addDays, hoursUntil, isPast, isValidISODate, isValidTime, minutesOf, todayISO,
} from './dates.js';

const ok = { ok: true };
const fail = (rule, error) => ({ ok: false, rule, error });

export const ACTIVE = 'Booked';

export function isPublished(state, doctorId, date, time) {
  return (state.availability[doctorId]?.[date] || []).includes(time);
}

export function findBooking(state, doctorId, date, time, excludeId) {
  return state.appointments.find(
    (a) => a.status === ACTIVE && a.doctorId === doctorId && a.date === date && a.time === time && a.id !== excludeId,
  );
}

/** Slot status as shown to patients: 'open' | 'booked' | 'past' | 'unpublished' */
export function slotStatus(state, doctorId, date, time, now = new Date()) {
  if (!isPublished(state, doctorId, date, time)) return 'unpublished';
  if (isPast(date, time, now)) return 'past';
  if (findBooking(state, doctorId, date, time)) return 'booked';
  return 'open';
}

export function openSlots(state, doctorId, date, now = new Date()) {
  return (state.availability[doctorId]?.[date] || [])
    .slice()
    .sort()
    .filter((t) => slotStatus(state, doctorId, date, t, now) === 'open');
}

export function nextOpenSlot(state, doctorId, now = new Date()) {
  const today = todayISO(now);
  for (let i = 0; i <= BOOKING_HORIZON_DAYS; i++) {
    const date = addDays(today, i);
    const slots = openSlots(state, doctorId, date, now);
    if (slots.length) return { date, time: slots[0] };
  }
  return null;
}

export function upcomingFor(state, patientId, now = new Date()) {
  return state.appointments.filter(
    (a) => a.patientId === patientId && a.status === ACTIVE && !isPast(a.date, a.time, now),
  );
}

/** BR-04 / BR-09 — a date & time a patient may choose. */
export function validateDateTime(date, time, now = new Date()) {
  if (!isValidISODate(date) || !isValidTime(time)) return fail('BR-04', 'Select a valid date and time.');
  if (minutesOf(time) % SLOT_MINUTES !== 0 || time < WORK_START || time >= WORK_END)
    return fail('BR-09', 'Appointments start on the half hour between 9:00am and 4:30pm.');
  if (isPast(date, time, now)) return fail('BR-09', 'This date and time is in the past. Choose a future slot.');
  if (date > addDays(todayISO(now), BOOKING_HORIZON_DAYS))
    return fail('BR-09', `Appointments can be booked up to ${BOOKING_HORIZON_DAYS} days ahead.`);
  return ok;
}

/** BR-01 … BR-04, BR-09, BR-11, BR-15, BR-16 */
export function validateBooking(state, { user, doctorId, date, time, now = new Date(), excludeId }) {
  if (!user || user.role !== 'patient') return fail('BR-01', 'Log in as a patient to book an appointment.');
  if (!user.active) return fail('BR-01', 'This account is deactivated. Contact the hospital.');
  const doctor = state.doctors.find((d) => d.id === doctorId);
  if (!doctor || !doctor.active) return fail('BR-15', 'This doctor is not accepting bookings.');
  const dt = validateDateTime(date, time, now);
  if (!dt.ok) return dt;
  if (!isPublished(state, doctorId, date, time))
    return fail('BR-04', 'The doctor is not available at this time. Choose one of the listed slots.');
  if (findBooking(state, doctorId, date, time, excludeId))
    return fail('BR-02', 'This slot is no longer available. Choose another time.');
  const clash = state.appointments.find(
    (a) => a.patientId === user.id && a.status === ACTIVE && a.date === date && a.time === time && a.id !== excludeId,
  );
  if (clash) return fail('BR-11', `You already have an appointment at this time (${clash.id}).`);
  if (!excludeId && upcomingFor(state, user.id, now).length >= MAX_UPCOMING_PER_PATIENT)
    return fail('BR-16', `You can hold up to ${MAX_UPCOMING_PER_PATIENT} upcoming appointments. Cancel one to book another.`);
  return ok;
}

/** BR-05 / BR-10 — patients have a cut-off; doctors/admins do not. */
export function validateCancel(appt, actor, now = new Date()) {
  if (!appt || appt.status !== ACTIVE) return fail('BR-13', 'Only booked appointments can be cancelled.');
  if (actor.role === 'patient') {
    if (appt.patientId !== actor.id) return fail('BR-07', 'You can only manage your own appointments.');
    if (hoursUntil(appt.date, appt.time, now) < CANCEL_CUTOFF_HOURS)
      return fail('BR-10', `Appointments can't be changed online less than ${CANCEL_CUTOFF_HOURS} hours before the start. Call the hospital on 020 7946 0000.`);
  }
  if (actor.role === 'doctor' && appt.doctorId !== actor.doctorId)
    return fail('BR-07', 'Doctors can only manage their own appointments.');
  return ok;
}

/** BR-06 / BR-14 — new slot must be available; same doctor. */
export function validateReschedule(state, appt, { actor, date, time, now = new Date() }) {
  const c = validateCancel(appt, actor, now);
  if (!c.ok) return c;
  if (appt.date === date && appt.time === time) return fail('BR-06', 'Choose a different slot to reschedule.');
  const patient = state.users.find((u) => u.id === appt.patientId);
  return validateBooking(state, { user: patient, doctorId: appt.doctorId, date, time, now, excludeId: appt.id });
}

/** FR-41 — doctor adding availability. */
export function validateAddSlot(date, time, now = new Date()) {
  if (!isValidISODate(date) || !isValidTime(time)) return fail('BR-04', 'Select a valid date and time.');
  if (date < todayISO(now)) return fail('BR-09', 'Availability cannot be added for a past date.');
  if (isPast(date, time, now)) return fail('BR-09', 'This time has already passed.');
  if (date > addDays(todayISO(now), BOOKING_HORIZON_DAYS))
    return fail('BR-09', `Availability can be published up to ${BOOKING_HORIZON_DAYS} days ahead.`);
  if (minutesOf(time) % SLOT_MINUTES !== 0 || time < WORK_START || time >= WORK_END)
    return fail('BR-09', 'Slots run on the half hour between 9:00am and 4:30pm.');
  return ok;
}

/** BR-12 — booked slots cannot be removed. */
export function validateRemoveSlot(state, doctorId, date, time, now = new Date()) {
  if (isPast(date, time, now)) return fail('BR-09', 'Past slots cannot be changed.');
  const b = findBooking(state, doctorId, date, time);
  if (b) return fail('BR-12', `This slot is booked (${b.id}). Cancel the appointment first.`);
  return ok;
}

/** BR-13 — complete only after the start time. */
export function validateComplete(appt, actor, now = new Date()) {
  if (!appt || appt.status !== ACTIVE) return fail('BR-13', 'Only booked appointments can be completed.');
  if (actor.role === 'doctor' && appt.doctorId !== actor.doctorId)
    return fail('BR-07', 'Doctors can only manage their own appointments.');
  if (!isPast(appt.date, appt.time, now))
    return fail('BR-13', 'An appointment can be marked completed only after it has started.');
  return ok;
}

/** FR-05 — route guard. */
export function canAccess(user, requiredRole) {
  if (!requiredRole) return true;
  return !!user && user.active && user.role === requiredRole;
}

export function homeFor(user) {
  if (!user) return '/login';
  return { patient: '/patient', doctor: '/doctor', admin: '/admin' }[user.role] || '/';
}
