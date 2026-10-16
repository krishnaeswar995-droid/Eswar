// Unit tests for the business rules (BRD section 7). Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSeed } from '../src/data/mockData.js';
import {
  validateBooking, validateCancel, validateReschedule, validateAddSlot, validateRemoveSlot,
  validateComplete, canAccess, findBooking,
} from '../src/lib/rules.js';
import { workday, addDays, todayISO } from '../src/lib/dates.js';

// Fixed clock: a Wednesday at 08:00 so results don't depend on when tests run.
const NOW = new Date(2026, 9, 14, 8, 0);
const fresh = () => buildSeed(NOW);
const user = (db, id) => db.users.find((u) => u.id === id);
const free = (db, doctorId, date) => db.availability[doctorId][date].find((t) => !findBooking(db, doctorId, date, t));

test('BR-01 guests and non-patients cannot book', () => {
  const db = fresh();
  const date = workday(4, NOW);
  const time = free(db, 'd7', date);
  assert.equal(validateBooking(db, { user: null, doctorId: 'd7', date, time, now: NOW }).rule, 'BR-01');
  assert.equal(validateBooking(db, { user: user(db, 'u-admin'), doctorId: 'd7', date, time, now: NOW }).rule, 'BR-01');
});

test('successful booking of an open published slot', () => {
  const db = fresh();
  const date = workday(4, NOW);
  assert.deepEqual(validateBooking(db, { user: user(db, 'p1'), doctorId: 'd7', date, time: free(db, 'd7', date), now: NOW }), { ok: true });
});

test('BR-02/BR-03 an occupied slot cannot be booked by another patient', () => {
  const db = fresh();
  const r = validateBooking(db, { user: user(db, 'p3'), doctorId: 'd1', date: workday(2, NOW), time: '10:30', now: NOW });
  assert.equal(r.rule, 'BR-02');
});

test('BR-04/BR-09 past, unpublished, malformed and out-of-horizon times are rejected', () => {
  const db = fresh();
  const p = user(db, 'p3');
  assert.equal(validateBooking(db, { user: p, doctorId: 'd7', date: workday(-1, NOW), time: '10:00', now: NOW }).rule, 'BR-09');
  assert.equal(validateBooking(db, { user: p, doctorId: 'd2', date: workday(3, NOW), time: '15:00', now: NOW }).rule, 'BR-04'); // morning-only doctor
  assert.equal(validateBooking(db, { user: p, doctorId: 'd7', date: '2026-02-30', time: '10:00', now: NOW }).rule, 'BR-04');
  assert.equal(validateBooking(db, { user: p, doctorId: 'd7', date: workday(3, NOW), time: '10:15', now: NOW }).rule, 'BR-09');
  assert.equal(validateBooking(db, { user: p, doctorId: 'd7', date: addDays(todayISO(NOW), 45), time: '10:00', now: NOW }).rule, 'BR-09');
});

test('BR-11 a patient cannot hold two appointments at the same time', () => {
  const db = fresh();
  const a = db.appointments.find((x) => x.patientId === 'p1' && x.doctorId === 'd1' && x.status === 'Booked');
  db.availability.d4[a.date] = [...db.availability.d4[a.date], a.time];
  const r = validateBooking(db, { user: user(db, 'p1'), doctorId: 'd4', date: a.date, time: a.time, now: NOW });
  assert.equal(r.rule, 'BR-11');
});

test('BR-15 inactive doctors cannot be booked', () => {
  const db = fresh();
  const date = workday(3, NOW);
  assert.equal(validateBooking(db, { user: user(db, 'p3'), doctorId: 'd8', date, time: '09:00', now: NOW }).rule, 'BR-15');
});

test('BR-10 patient cannot cancel within 2 hours; admin can', () => {
  const db = fresh();
  const appt = { id: 'X', patientId: 'p1', doctorId: 'd1', date: todayISO(NOW), time: '09:30', status: 'Booked' };
  assert.equal(validateCancel(appt, user(db, 'p1'), NOW).rule, 'BR-10');
  assert.equal(validateCancel(appt, user(db, 'u-admin'), NOW).ok, true);
  assert.equal(validateCancel({ ...appt, time: '10:00' }, user(db, 'p1'), NOW).ok, true); // exactly 2h
});

test('BR-07 patient/doctor cannot act on someone else\'s appointment', () => {
  const db = fresh();
  const bens = db.appointments.find((a) => a.patientId === 'p2' && a.doctorId === 'd4');
  assert.equal(validateCancel(bens, user(db, 'p1'), NOW).rule, 'BR-07');
  assert.equal(validateCancel(bens, user(db, 'u-d1'), NOW).rule, 'BR-07');
});

test('BR-06 reschedule only into an available slot; own slot excluded from clash check', () => {
  const db = fresh();
  const alice = db.appointments.find((a) => a.patientId === 'p1' && a.doctorId === 'd1' && a.status === 'Booked');
  assert.equal(validateReschedule(db, alice, { actor: user(db, 'p1'), date: alice.date, time: '10:30', now: NOW }).rule, 'BR-02');
  assert.equal(validateReschedule(db, alice, { actor: user(db, 'p1'), date: alice.date, time: alice.time, now: NOW }).rule, 'BR-06');
  assert.equal(validateReschedule(db, alice, { actor: user(db, 'p1'), date: alice.date, time: '11:00', now: NOW }).ok, true);
});

test('BR-12 booked slots cannot be removed; open ones can', () => {
  const db = fresh();
  assert.equal(validateRemoveSlot(db, 'd1', workday(2, NOW), '10:30', NOW).rule, 'BR-12');
  assert.equal(validateRemoveSlot(db, 'd1', workday(2, NOW), '11:00', NOW).ok, true);
});

test('availability cannot be added in the past, off the half hour or beyond 30 days', () => {
  assert.equal(validateAddSlot(workday(-1, NOW), '10:00', NOW).rule, 'BR-09');
  assert.equal(validateAddSlot(workday(2, NOW), '10:10', NOW).rule, 'BR-09');
  assert.equal(validateAddSlot(workday(2, NOW), '17:00', NOW).rule, 'BR-09');
  assert.equal(validateAddSlot(addDays(todayISO(NOW), 31), '10:00', NOW).rule, 'BR-09');
  assert.equal(validateAddSlot(workday(2, NOW), '16:30', NOW).ok, true);
});

test('BR-13 complete only after start time', () => {
  const db = fresh();
  const doc = user(db, 'u-d1');
  const past = db.appointments.find((a) => a.doctorId === 'd1' && a.date === workday(-1, NOW));
  const future = db.appointments.find((a) => a.doctorId === 'd1' && a.date === workday(2, NOW));
  assert.equal(validateComplete(past, doc, NOW).ok, true);
  assert.equal(validateComplete(future, doc, NOW).rule, 'BR-13');
});

test('BR-16 max 3 upcoming appointments per patient', () => {
  const db = fresh();
  const p = user(db, 'p2'); // Ben has 2 upcoming + 1 today at 15:30 => 3
  const date = workday(6, NOW);
  assert.equal(validateBooking(db, { user: p, doctorId: 'd7', date, time: free(db, 'd7', date), now: NOW }).rule, 'BR-16');
});

test('FR-05 route access by role', () => {
  const db = fresh();
  assert.equal(canAccess(null, 'patient'), false);
  assert.equal(canAccess(user(db, 'p1'), 'admin'), false);
  assert.equal(canAccess(user(db, 'u-admin'), 'admin'), true);
  assert.equal(canAccess(user(db, 'p4'), 'patient'), false); // deactivated
});
