// End-to-end execution of the test cases in docs/testing/test-cases.xlsx.
// Runs every case in a fresh browser context against the built prototype, with the
// browser clock fixed so the mock data (generated relative to "now") is deterministic.
//
//   npm run build && node tests/e2e.mjs            (needs: npm i -D playwright && npx playwright install chromium)
//
// Writes ../docs/testing/results.json, which feeds the Actual result / Status columns.
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const BASE = pathToFileURL(resolve(here, '../dist/index.html')).href;
const OUT = resolve(here, '../../docs/testing/results.json');

// Fixed clock: Wednesday 14 Oct 2026, 08:00 London. Seed data then gives:
const T0 = '2026-10-14T08:00:00+01:00';
const D = { yday: '2026-10-13', today: '2026-10-14', thu: '2026-10-15', fri: '2026-10-16', sat: '2026-10-17', mon: '2026-10-19', tue: '2026-10-20', wed: '2026-10-21' };
const ALICE = ['alice@demo.com', 'Patient@123'];
const BEN = ['ben@demo.com', 'Patient@123'];
const CHLOE = ['chloe@demo.com', 'Patient@123'];
const PRIYA = ['priya.raman@hospital.demo', 'Doctor@123'];
const ADMIN = ['admin@hospital.demo', 'Admin@123'];

class Check extends Error {}
const expect = (cond, msg) => { if (!cond) throw new Check(msg); };

function helpers(page) {
  const h = {
    page,
    go: async (hash) => { await page.goto(`${BASE}#${hash}`); await page.waitForTimeout(120); },
    url: () => decodeURIComponent(page.url().split('#')[1] || ''),
    login: async ([email, pw]) => {
      await h.go('/login');
      await page.fill('#login-email', email);
      await page.fill('#login-password', pw);
      await page.click('form button[type=submit]');
      await page.waitForTimeout(150);
    },
    logout: async () => { await h.go('/login'); await page.evaluate(() => localStorage.removeItem('hab-demo-session-v1')); await page.reload(); },
    pickSlot: async (date, time) => {
      await page.click(`.date-chip[data-date="${date}"]`);
      await page.click(`.time-chip[data-time="${time}"]`);
    },
    chip: (time) => page.locator(`.time-chip[data-time="${time}"]`),
    text: async (sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim(),
    has: async (sel) => (await page.locator(sel).count()) > 0,
    alert: async () => ((await page.locator('.alert').count()) ? (await page.locator('.alert').first().innerText()).replace(/\s+/g, ' ') : ''),
    register: async (name, email) => {
      await h.go('/register');
      await page.fill('#r-name', name); await page.fill('#r-email', email); await page.fill('#r-mobile', '07700900555');
      await page.fill('#r-dob', '1990-05-05'); await page.fill('#r-pass', 'Test1234'); await page.fill('#r-confirm', 'Test1234');
      await page.click('form button[type=submit]'); await page.waitForTimeout(150);
    },
    book: async (doctorId, date, time, reason = '') => {
      await h.go(`/doctors/${doctorId}`);
      await h.pickSlot(date, time);
      await page.click('#continue-booking'); await page.waitForTimeout(120);
      if (reason) await page.fill('#reason', reason);
      await page.click('#confirm-booking'); await page.waitForTimeout(150);
    },
    setDay: async (date) => { await page.fill('.day-nav input[type=date]', date); await page.waitForTimeout(80); },
    row: (id) => page.locator(`[data-id="${id}"]`),
  };
  return h;
}

// ---------------------------------------------------------------------------
// Test cases: metadata is exported to Excel; run() returns the observed result.
// ---------------------------------------------------------------------------
export const CASES = [
  // 1. Successful appointment booking
  { id: 'TC-01', area: 'Successful booking', req: 'FR-20, FR-22, BR-01', priority: 'High',
    scenario: 'Logged-in patient books an open slot',
    pre: 'Alice is registered and logged in; Dr Grace Chen has an open slot on Mon 19 Oct 11:00.',
    steps: ['Open Find a doctor and select Dr Grace Chen', 'Select Mon 19 Oct and the 11:00am slot', 'Click Continue to book', 'Enter a reason and click Confirm booking', 'Open My appointments'],
    data: 'alice@demo.com / Patient@123; Doctor d7; 2026-10-19 11:00; Reason "Persistent cough"',
    expected: 'Confirmation page "Appointment confirmed" with reference APT-1013; the appointment is listed under Upcoming with status Booked.',
    run: async (h) => {
      await h.login(ALICE); await h.book('d7', D.mon, '11:00', 'Persistent cough');
      const title = await h.text('h1'); const ref = await h.text('.summary .ref');
      expect(title === 'Appointment confirmed' && ref === 'APT-1013', `Got "${title}" / ${ref}`);
      await h.go('/patient');
      const row = await h.row('APT-1013').innerText();
      expect(/Booked/.test(row), 'Not in Upcoming');
      return `Confirmation shown with reference ${ref}; APT-1013 listed under Upcoming as Booked.`;
    } },
  { id: 'TC-02', area: 'Successful booking', req: 'BR-01, FR-24', priority: 'High',
    scenario: 'Guest selects a slot, is asked to log in, and returns to complete the booking',
    pre: 'User is not logged in.',
    steps: ['Open Dr Grace Chen profile as a guest', 'Select Mon 19 Oct 11:00 and click Continue to book', 'Log in as Alice', 'Click Confirm booking'],
    data: 'alice@demo.com / Patient@123; d7; 2026-10-19 11:00',
    expected: 'Guest is redirected to Log in with a message; after login the Review and confirm page opens for the same slot; booking is confirmed.',
    run: async (h) => {
      await h.go('/doctors/d7'); await h.pickSlot(D.mon, '11:00'); await h.page.click('#continue-booking'); await h.page.waitForTimeout(120);
      expect(h.url().startsWith('/login?redirect='), `URL ${h.url()}`);
      const info = await h.alert();
      await h.page.fill('#login-email', ALICE[0]); await h.page.fill('#login-password', ALICE[1]); await h.page.click('form button[type=submit]'); await h.page.waitForTimeout(200);
      expect(h.url().startsWith('/book/d7?date=2026-10-19&time=11:00'), `After login URL ${h.url()}`);
      await h.page.click('#confirm-booking'); await h.page.waitForTimeout(150);
      expect((await h.text('h1')) === 'Appointment confirmed', 'Not confirmed');
      return `Redirected to login ("${info.slice(0, 60)}…"); returned to the same slot after login; booking confirmed (${await h.text('.summary .ref')}).`;
    } },
  { id: 'TC-03', area: 'Successful booking', req: 'FR-01, FR-03, FR-20', priority: 'High',
    scenario: 'New patient registers and books their first appointment',
    pre: 'Email test.patient@demo.com is not registered.',
    steps: ['Open Register and complete all fields', 'Click Create account', 'Book Dr Amelia Okafor, Tue 20 Oct 14:00'],
    data: 'Test Patient; test.patient@demo.com; 07700900555; 05/05/1990; Test1234',
    expected: 'Account created and patient dashboard opens with 0 upcoming; booking is confirmed and shown in Upcoming.',
    run: async (h) => {
      await h.register('Test Patient', 'test.patient@demo.com');
      expect(h.url() === '/patient', `URL ${h.url()}`);
      const hello = await h.text('.page-head p');
      await h.book('d3', D.tue, '14:00');
      expect((await h.text('h1')) === 'Appointment confirmed', 'Not confirmed');
      return `Account created, dashboard showed "${hello}"; booking with Dr Okafor confirmed.`;
    } },

  // 2. Booking an unavailable slot
  { id: 'TC-04', area: 'Unavailable slot', req: 'BR-02, FR-14', priority: 'High',
    scenario: 'An already-booked slot is shown as unavailable and cannot be selected',
    pre: 'Ben has Dr Priya Raman on Fri 16 Oct 10:30.',
    steps: ['Log in as Alice', 'Open Dr Priya Raman, select Fri 16 Oct', 'Try to click 10:30am'],
    data: 'alice@demo.com; d1; 2026-10-16 10:30',
    expected: '10:30am is struck through and disabled; clicking it does not select it; Continue to book stays disabled.',
    run: async (h) => {
      await h.login(ALICE); await h.go('/doctors/d1'); await h.page.click(`.date-chip[data-date="${D.fri}"]`);
      const chip = h.chip('10:30');
      expect(await chip.isDisabled(), 'Chip enabled');
      expect((await chip.getAttribute('class')).includes('booked'), 'Not styled booked');
      await chip.click({ force: true });
      expect(await h.page.locator('#continue-booking').isDisabled(), 'Continue enabled');
      return '10:30am shown as booked (struck through, disabled); click had no effect; Continue to book remained disabled.';
    } },
  { id: 'TC-05', area: 'Unavailable slot', req: 'BR-02, FR-21', priority: 'High',
    scenario: 'Booking an occupied slot by opening the booking URL directly is rejected',
    pre: 'Alice logged in; d1 Fri 16 Oct 10:30 booked by Ben.',
    steps: ['Navigate to #/book/d1?date=2026-10-16&time=10:30'],
    data: 'URL parameters date=2026-10-16, time=10:30',
    expected: 'Error "This slot is no longer available. Choose another time." [BR-02]; Confirm booking disabled.',
    run: async (h) => {
      await h.login(ALICE); await h.go(`/book/d1?date=${D.fri}&time=10:30`);
      const a = await h.alert();
      expect(/no longer available/.test(a) && /BR-02/.test(a), a);
      expect(await h.page.locator('#confirm-booking').isDisabled(), 'Confirm enabled');
      return `Error shown: "${a}"; Confirm booking disabled.`;
    } },
  { id: 'TC-06', area: 'Unavailable slot', req: 'FR-21, NFR-03', priority: 'High',
    scenario: 'Slot is taken by another patient while the first patient is on the review page',
    pre: 'Alice on Review and confirm for d7 Mon 19 Oct 11:30.',
    steps: ['Select d7 Mon 19 Oct 11:30 and continue', 'Open Demo tools and click "Another patient books this slot"', 'Attempt to confirm'],
    data: 'd7; 2026-10-19 11:30',
    expected: 'Booking is blocked with "This slot is no longer available" and a link to choose another time; no appointment is created for Alice.',
    run: async (h) => {
      await h.login(ALICE); await h.go('/doctors/d7'); await h.pickSlot(D.mon, '11:30'); await h.page.click('#continue-booking');
      await h.page.click('.demo-tools summary'); await h.page.click('#simulate-other'); await h.page.waitForTimeout(100);
      const a = await h.alert();
      expect(/no longer available/.test(a), a);
      expect(await h.page.locator('#confirm-booking').isDisabled(), 'Confirm enabled');
      await h.go('/patient');
      expect((await h.page.locator('.appt').count()) === 2, 'Extra appointment created');
      return `Error shown: "${a}"; Confirm disabled; Alice still has 2 upcoming appointments (none created).`;
    } },

  // 3. Double-booking prevention
  { id: 'TC-07', area: 'Double-booking prevention', req: 'BR-11, FR-25', priority: 'High',
    scenario: 'Patient cannot book two appointments at the same date and time with different doctors',
    pre: 'Alice has APT-1001 with Dr Raman on Fri 16 Oct 10:00.',
    steps: ['Open Dr Tomasz Nowak', 'Select Fri 16 Oct 10:00 and continue'],
    data: 'd4; 2026-10-16 10:00',
    expected: 'Error "You already have an appointment at this time (APT-1001)." [BR-11]; Confirm disabled.',
    run: async (h) => {
      await h.login(ALICE); await h.go('/doctors/d4'); await h.pickSlot(D.fri, '10:00'); await h.page.click('#continue-booking'); await h.page.waitForTimeout(100);
      const a = await h.alert();
      expect(/already have an appointment/.test(a) && /BR-11/.test(a), a);
      return `Blocked: "${a}".`;
    } },
  { id: 'TC-08', area: 'Double-booking prevention', req: 'BR-02, BR-03', priority: 'High',
    scenario: 'Once a slot is booked, a second patient cannot book the same doctor and time',
    pre: 'Dr Omar Haddad Mon 19 Oct 14:00 is open.',
    steps: ['Alice books d6 Mon 19 Oct 14:00', 'Log out; register a second patient', 'Open d6 profile on Mon 19 Oct', 'Open #/book/d6?date=2026-10-19&time=14:00 directly'],
    data: 'alice@demo.com; second.patient@demo.com / Test1234',
    expected: 'Second patient sees 2:00pm as booked; direct booking shows BR-02 error; the doctor has only one appointment at that time.',
    run: async (h) => {
      await h.login(ALICE); await h.book('d6', D.mon, '14:00');
      expect((await h.text('h1')) === 'Appointment confirmed', 'First booking failed');
      await h.logout(); await h.register('Second Patient', 'second.patient@demo.com');
      await h.go('/doctors/d6'); await h.page.click(`.date-chip[data-date="${D.mon}"]`);
      expect(await h.chip('14:00').isDisabled(), 'Slot still open');
      await h.go(`/book/d6?date=${D.mon}&time=14:00`);
      const a = await h.alert();
      expect(/BR-02/.test(a), a);
      const n = await h.page.evaluate((d) => JSON.parse(localStorage.getItem('hab-demo-db-v1')).appointments.filter((x) => x.doctorId === 'd6' && x.date === d && x.time === '14:00' && x.status === 'Booked').length, D.mon);
      expect(n === 1, `Count ${n}`);
      return `Slot shown booked to second patient; direct URL blocked ("${a}"); exactly ${n} booking at d6 14:00.`;
    } },

  // 4. Invalid date or time
  { id: 'TC-09', area: 'Invalid date/time', req: 'BR-04, BR-09', priority: 'High',
    scenario: 'Booking a date/time in the past is rejected',
    pre: 'Alice logged in. Current time Wed 14 Oct 08:00.',
    steps: ['Open the profile: past dates are not shown and today\'s past slots are disabled', 'Navigate to #/book/d7?date=2026-10-13&time=10:00'],
    data: 'date=2026-10-13, time=10:00',
    expected: 'Date strip starts today; error "This date and time is in the past. Choose a future slot." [BR-09]; Confirm disabled.',
    run: async (h) => {
      await h.login(ALICE); await h.go('/doctors/d7');
      const first = await h.page.locator('.date-chip').first().getAttribute('data-date');
      expect(first === D.today, `Strip starts ${first}`);
      await h.go(`/book/d7?date=${D.yday}&time=10:00`);
      const a = await h.alert();
      expect(/in the past/.test(a), a);
      return `Date strip starts on ${first}; direct URL rejected: "${a}".`;
    } },
  { id: 'TC-10', area: 'Invalid date/time', req: 'BR-09', priority: 'Medium',
    scenario: 'Time not on a 30-minute boundary or outside 09:00–16:30 is rejected',
    pre: 'Alice logged in.',
    steps: ['Navigate to #/book/d7?date=2026-10-19&time=10:15', 'Navigate to #/book/d7?date=2026-10-19&time=18:00'],
    data: 'time=10:15; time=18:00',
    expected: 'Both show "Appointments start on the half hour between 9:00am and 4:30pm." [BR-09].',
    run: async (h) => {
      await h.login(ALICE);
      await h.go(`/book/d7?date=${D.mon}&time=10:15`); const a1 = await h.alert();
      await h.go(`/book/d7?date=${D.mon}&time=18:00`); const a2 = await h.alert();
      expect(/half hour/.test(a1) && /half hour/.test(a2), `${a1} | ${a2}`);
      return `10:15 and 18:00 both rejected: "${a1}".`;
    } },
  { id: 'TC-11', area: 'Invalid date/time', req: 'BR-04', priority: 'Medium',
    scenario: 'Time outside the doctor\'s published availability, and non-clinic days',
    pre: 'Dr James Whitfield works mornings only. No clinics at weekends.',
    steps: ['Open Dr Priya Raman, select Sat 17 Oct', 'Navigate to #/book/d2?date=2026-10-19&time=15:00'],
    data: 'Saturday 2026-10-17; d2 15:00',
    expected: 'Saturday shows "Closed" and "No clinic on this day"; direct booking shows "The doctor is not available at this time." [BR-04].',
    run: async (h) => {
      await h.login(ALICE); await h.go('/doctors/d1'); await h.page.click(`.date-chip[data-date="${D.sat}"]`);
      const lbl = await h.text(`.date-chip[data-date="${D.sat}"] .dc-count`); const msg = await h.text('.slot-empty');
      await h.go(`/book/d2?date=${D.mon}&time=15:00`); const a = await h.alert();
      expect(lbl === 'Closed' && /No clinic/.test(msg) && /not available at this time/.test(a), `${lbl} ${msg} ${a}`);
      return `Saturday labelled "${lbl}" with "${msg}"; d2 15:00 rejected: "${a}".`;
    } },
  { id: 'TC-12', area: 'Invalid date/time', req: 'BR-04, BR-09', priority: 'Medium',
    scenario: 'Malformed date/time and dates beyond the 30-day booking horizon are rejected',
    pre: 'Alice logged in.',
    steps: ['Navigate to #/book/d7?date=2026-02-30&time=10:00', 'Navigate to #/book/d7?date=2026-10-19&time=25:00', 'Navigate to #/book/d7?date=2026-11-20&time=10:00'],
    data: '2026-02-30; 25:00; 2026-11-20 (37 days ahead)',
    expected: 'First two: "Select a valid date and time." [BR-04]. Third: "Appointments can be booked up to 30 days ahead." [BR-09].',
    run: async (h) => {
      await h.login(ALICE);
      await h.go('/book/d7?date=2026-02-30&time=10:00'); const a1 = await h.alert();
      await h.go(`/book/d7?date=${D.mon}&time=25:00`); const a2 = await h.alert();
      await h.go('/book/d7?date=2026-11-20&time=10:00'); const a3 = await h.alert();
      expect(/valid date/.test(a1) && /valid date/.test(a2) && /30 days/.test(a3), `${a1} | ${a2} | ${a3}`);
      return `Invalid date and time rejected ("${a1}"); 37 days ahead rejected ("${a3}").`;
    } },

  // 5. Appointment cancellation
  { id: 'TC-13', area: 'Cancellation', req: 'FR-31, BR-05', priority: 'High',
    scenario: 'Patient cancels an upcoming appointment more than 2 hours ahead',
    pre: 'Alice has APT-1001 (Fri 16 Oct 10:00).',
    steps: ['Open My appointments', 'Click Cancel on APT-1001', 'Click Cancel appointment in the dialog', 'Open Past & cancelled tab'],
    data: 'APT-1001',
    expected: 'Dialog asks for confirmation; toast confirms the slot is free; APT-1001 leaves Upcoming and appears under Past & cancelled as Cancelled.',
    run: async (h) => {
      await h.login(ALICE); await h.go('/patient');
      await h.row('APT-1001').getByRole('button', { name: 'Cancel' }).click();
      const dlg = await h.text('.modal h2'); await h.page.click('#confirm-cancel'); await h.page.waitForTimeout(100);
      const toast = await h.text('.toast');
      expect(!(await h.has('[data-id="APT-1001"]')), 'Still in Upcoming');
      await h.page.getByRole('tab', { name: /Past/ }).click();
      const row = await h.row('APT-1001').innerText();
      expect(/Cancelled/.test(row), row);
      return `Dialog "${dlg}"; toast "${toast}"; APT-1001 now under Past & cancelled as Cancelled.`;
    } },
  { id: 'TC-14', area: 'Cancellation', req: 'BR-05', priority: 'High',
    scenario: 'A cancelled appointment releases the slot for other patients',
    pre: 'Alice has cancelled APT-1001 (d1 Fri 16 Oct 10:00).',
    steps: ['Alice cancels APT-1001', 'Log out and register a new patient', 'Open Dr Priya Raman, Fri 16 Oct', 'Book 10:00am'],
    data: 'release.test@demo.com / Test1234',
    expected: '10:00am shows as available again and the new patient can book it.',
    run: async (h) => {
      await h.login(ALICE); await h.go('/patient');
      await h.row('APT-1001').getByRole('button', { name: 'Cancel' }).click(); await h.page.click('#confirm-cancel');
      await h.logout(); await h.register('Release Test', 'release.test@demo.com');
      await h.go('/doctors/d1'); await h.page.click(`.date-chip[data-date="${D.fri}"]`);
      expect(!(await h.chip('10:00').isDisabled()), 'Slot not released');
      await h.book('d1', D.fri, '10:00');
      expect((await h.text('h1')) === 'Appointment confirmed', 'Rebook failed');
      return `10:00am became available after cancellation and was booked by the new patient (${await h.text('.summary .ref')}).`;
    } },
  { id: 'TC-15', area: 'Cancellation', req: 'BR-10, FR-33', priority: 'High',
    scenario: 'Patient cannot cancel online less than 2 hours before the appointment',
    pre: 'Clock 10:00 on Wed 14 Oct. Chloe has APT-1011 today at 11:30.',
    steps: ['Log in as Chloe', 'Open My appointments and find APT-1011'],
    data: 'chloe@demo.com; APT-1011 (today 11:30)',
    expected: 'Cancel and Reschedule are disabled; message says changes are not possible online within 2 hours and gives the hospital phone number.',
    clock: '2026-10-14T10:00:00+01:00',
    run: async (h) => {
      await h.login(CHLOE); await h.go('/patient');
      const r = h.row('APT-1011');
      const c = await r.getByRole('button', { name: 'Cancel' }).isDisabled();
      const rs = await r.getByRole('button', { name: 'Reschedule' }).isDisabled();
      const msg = await r.locator('.warn').innerText();
      expect(c && rs && /2 hours/.test(msg), `${c} ${rs} ${msg}`);
      return `Cancel and Reschedule disabled; message "${msg}".`;
    } },
  { id: 'TC-16', area: 'Cancellation', req: 'FR-45, BR-05', priority: 'Medium',
    scenario: 'Doctor cancels an appointment with a reason; patient sees it cancelled',
    pre: 'Dr Raman logged in; APT-1001 on Fri 16 Oct 10:00.',
    steps: ['Schedule tab, go to Fri 16 Oct', 'Click Cancel on APT-1001', 'Click Cancel appointment with an empty reason', 'Enter a reason and confirm', 'Log in as Alice and check Past & cancelled'],
    data: 'Reason "Doctor unwell"',
    expected: 'Empty reason is rejected ("Enter a reason for cancelling."); with a reason the status becomes Cancelled; Alice sees APT-1001 as Cancelled.',
    run: async (h) => {
      await h.login(PRIYA); await h.setDay(D.fri);
      await h.row('APT-1001').getByRole('button', { name: 'Cancel' }).click();
      await h.page.click('#doctor-confirm-cancel'); const e = await h.text('.modal .alert');
      expect(/Enter a reason/.test(e), e);
      await h.page.fill('#cancel-reason', 'Doctor unwell'); await h.page.click('#doctor-confirm-cancel'); await h.page.waitForTimeout(100);
      const st = await h.row('APT-1001').locator('.badge').innerText();
      await h.logout(); await h.login(ALICE); await h.page.getByRole('tab', { name: /Past/ }).click();
      const row = await h.row('APT-1001').innerText();
      expect(st === 'Cancelled' && /Cancelled/.test(row), `${st} ${row}`);
      return `Empty reason rejected ("${e}"); status changed to ${st}; Alice sees APT-1001 as Cancelled.`;
    } },

  // 6. Appointment rescheduling
  { id: 'TC-17', area: 'Rescheduling', req: 'FR-32, BR-06, BR-14', priority: 'High',
    scenario: 'Patient reschedules to another open slot with the same doctor',
    pre: 'Alice has APT-1001 (d1 Fri 16 Oct 10:00).',
    steps: ['Click Reschedule on APT-1001', 'Select Fri 16 Oct 11:00', 'Click Confirm new time', 'Check Dr Raman Fri 16 Oct 10:00 as another patient'],
    data: 'New slot 2026-10-16 11:00',
    expected: 'Confirmation shows Fri 16 Oct 11:00am with the same reference APT-1001; the old 10:00 slot is available again.',
    run: async (h) => {
      await h.login(ALICE); await h.go('/patient');
      await h.row('APT-1001').getByRole('button', { name: 'Reschedule' }).click(); await h.page.waitForTimeout(100);
      await h.pickSlot(D.fri, '11:00'); await h.page.click('#confirm-reschedule'); await h.page.waitForTimeout(150);
      const ref = await h.text('.summary .ref'); const s = await h.text('.summary');
      expect(ref === 'APT-1001' && /11:00am/.test(s), s);
      await h.go('/doctors/d1'); await h.page.click(`.date-chip[data-date="${D.fri}"]`);
      expect(!(await h.chip('10:00').isDisabled()), 'Old slot not released');
      return `Moved to Fri 16 Oct 11:00am, reference still ${ref}; 10:00am slot released (selectable).`;
    } },
  { id: 'TC-18', area: 'Rescheduling', req: 'BR-06', priority: 'High',
    scenario: 'Patient cannot reschedule into an unavailable slot',
    pre: 'Alice rescheduling APT-1001; Ben holds 10:30 the same day.',
    steps: ['Open Reschedule for APT-1001', 'Select Fri 16 Oct', 'Try 10:30am and the current 10:00am slot'],
    data: '2026-10-16 10:30 (booked), 10:00 (current)',
    expected: 'Both slots disabled (10:00 labelled "current"); Confirm new time stays disabled; appointment unchanged.',
    run: async (h) => {
      await h.login(ALICE); await h.go('/reschedule/APT-1001'); await h.page.click(`.date-chip[data-date="${D.fri}"]`);
      const b = await h.chip('10:30').isDisabled(); const c = await h.chip('10:00').isDisabled(); const lbl = await h.chip('10:00').innerText();
      expect(b && c && /current/.test(lbl) && await h.page.locator('#confirm-reschedule').isDisabled(), 'Selectable');
      return 'Booked 10:30am and current 10:00am both disabled (current is labelled); Confirm new time disabled.';
    } },
  { id: 'TC-19', area: 'Rescheduling', req: 'BR-10', priority: 'Medium',
    scenario: 'Rescheduling is blocked less than 2 hours before the appointment',
    pre: 'Clock 10:00 Wed 14 Oct; Chloe\'s APT-1011 is today 11:30.',
    steps: ['Log in as Chloe', 'Navigate to #/reschedule/APT-1011'],
    data: 'APT-1011',
    expected: 'Error with BR-10; no slot picker shown.',
    clock: '2026-10-14T10:00:00+01:00',
    run: async (h) => {
      await h.login(CHLOE); await h.go('/reschedule/APT-1011');
      const a = await h.alert();
      expect(/BR-10/.test(a) && !(await h.has('.slot-picker')), a);
      return `Blocked: "${a}"; slot picker not shown.`;
    } },
  { id: 'TC-20', area: 'Rescheduling', req: 'FR-53, BR-08', priority: 'Medium',
    scenario: 'Admin reschedules an appointment on behalf of a patient',
    pre: 'Admin logged in; Ben has APT-1007 with Dr Nowak Mon 19 Oct 11:00.',
    steps: ['Admin > Appointments', 'Click Reschedule on APT-1007', 'Select Mon 19 Oct 11:30, confirm'],
    data: 'APT-1007 → 2026-10-19 11:30',
    expected: 'Returns to the admin appointment list; APT-1007 shows Mon 19 Oct, 11:30am.',
    run: async (h) => {
      await h.login(ADMIN); await h.go('/admin?tab=appointments');
      await h.row('APT-1007').getByRole('button', { name: 'Reschedule' }).click(); await h.page.waitForTimeout(100);
      await h.pickSlot(D.mon, '11:30'); await h.page.click('#confirm-reschedule'); await h.page.waitForTimeout(150);
      const row = (await h.row('APT-1007').innerText()).replace(/\s+/g, ' ');
      expect(/19 Oct, 11:30am/.test(row), row);
      return `APT-1007 now "${row}".`;
    } },

  // 7. Login and role-based access
  { id: 'TC-21', area: 'Login & role-based access', req: 'FR-03, US-02', priority: 'High',
    scenario: 'Each role lands on its own dashboard after login',
    pre: 'Demo accounts exist for each role.',
    steps: ['Log in as patient', 'Log out, log in as doctor', 'Log out, log in as admin'],
    data: 'alice@demo.com; priya.raman@hospital.demo; admin@hospital.demo',
    expected: 'Patient → My appointments; Doctor → Schedule; Admin → Hospital administration.',
    run: async (h) => {
      const out = [];
      for (const [acc, path] of [[ALICE, '/patient'], [PRIYA, '/doctor'], [ADMIN, '/admin']]) {
        await h.login(acc); out.push(`${acc[0]} → ${h.url()} ("${await h.text('h1')}")`);
        expect(h.url() === path, h.url()); await h.logout();
      }
      return out.join('; ');
    } },
  { id: 'TC-22', area: 'Login & role-based access', req: 'FR-04', priority: 'High',
    scenario: 'Invalid or missing credentials are rejected with a generic message',
    pre: 'On the Log in page.',
    steps: ['Submit empty form', 'Submit alice@demo.com with a wrong password', 'Submit an unknown email'],
    data: 'wrong password "Wrong@123"; nobody@demo.com',
    expected: 'Empty: "Enter your email and password." Wrong password and unknown email both show the same "Invalid email or password." User stays on Log in.',
    run: async (h) => {
      await h.go('/login'); await h.page.click('form button[type=submit]'); const a1 = await h.alert();
      await h.page.fill('#login-email', ALICE[0]); await h.page.fill('#login-password', 'Wrong@123'); await h.page.click('form button[type=submit]'); const a2 = await h.alert();
      await h.page.fill('#login-email', 'nobody@demo.com'); await h.page.click('form button[type=submit]'); const a3 = await h.alert();
      expect(/Enter your email/.test(a1) && a2 === a3 && /Invalid email or password/.test(a2) && h.url() === '/login', `${a1}|${a2}|${a3}`);
      return `Empty: "${a1}"; wrong password and unknown email both: "${a2}"; stayed on /login.`;
    } },
  { id: 'TC-23', area: 'Login & role-based access', req: 'FR-05, BR-01', priority: 'High',
    scenario: 'Guest cannot open protected pages',
    pre: 'Not logged in.',
    steps: ['Navigate to #/patient', 'Navigate to #/admin', 'Navigate to #/book/d7?date=2026-10-19&time=10:00'],
    data: 'Protected URLs',
    expected: 'Each redirects to Log in (with return path).',
    run: async (h) => {
      const res = [];
      for (const p of ['/patient', '/admin', `/book/d7?date=${D.mon}&time=10:00`]) { await h.go(p); res.push(h.url()); }
      expect(res.every((u) => u.startsWith('/login?redirect=')), res.join(' '));
      return `All redirected to login: ${res.join(' | ')}`;
    } },
  { id: 'TC-24', area: 'Login & role-based access', req: 'FR-05, BR-07', priority: 'High',
    scenario: 'Users cannot open another role\'s pages; doctors see only their own appointments',
    pre: 'Alice and Dr Raman accounts.',
    steps: ['As Alice open #/admin and #/doctor', 'As Dr Raman open #/admin', 'As Dr Raman view Mon 19 Oct schedule'],
    data: 'APT-1007 belongs to Dr Nowak on Mon 19 Oct',
    expected: 'Alice is returned to My appointments with "You do not have access to that page."; doctor returned to Schedule; Dr Raman\'s schedule never shows APT-1007.',
    run: async (h) => {
      await h.login(ALICE); await h.go('/admin'); await h.page.waitForTimeout(100); const u1 = h.url(); const t = await h.text('.toast');
      await h.go('/doctor'); await h.page.waitForTimeout(100); const u2 = h.url();
      await h.logout(); await h.login(PRIYA); await h.go('/admin'); await h.page.waitForTimeout(100); const u3 = h.url();
      await h.setDay(D.mon); const other = await h.has('[data-id="APT-1007"]');
      expect(u1 === '/patient' && u2 === '/patient' && u3 === '/doctor' && !other && /do not have access/.test(t), `${u1} ${u2} ${u3} ${other}`);
      return `Patient → ${u1} with "${t}"; patient /doctor → ${u2}; doctor /admin → ${u3}; APT-1007 not visible to Dr Raman.`;
    } },
  { id: 'TC-25', area: 'Login & role-based access', req: 'FR-51', priority: 'Medium',
    scenario: 'Deactivated patient cannot log in',
    pre: 'Daniel Price\'s account is deactivated.',
    steps: ['Log in as daniel@demo.com'],
    data: 'daniel@demo.com / Patient@123',
    expected: '"This account is deactivated. Contact the hospital." and the user stays on Log in.',
    run: async (h) => {
      await h.login(['daniel@demo.com', 'Patient@123']); const a = await h.alert();
      expect(/deactivated/.test(a) && h.url() === '/login', a);
      return `Login refused: "${a}".`;
    } },
  { id: 'TC-26', area: 'Admin appointment management', req: 'FR-53, BR-08', priority: 'Medium',
    scenario: 'Admin cancels a patient\'s appointment with a reason',
    pre: 'Admin logged in; APT-1002 (Alice, Dr Chen, Wed 21 Oct) is Booked.',
    steps: ['Admin > Appointments', 'Click Cancel on APT-1002', 'Enter reason "Patient called to cancel" and confirm'],
    data: 'APT-1002',
    expected: 'Status changes to Cancelled; slot released; action appears in Recent activity.',
    run: async (h) => {
      await h.login(ADMIN); await h.go('/admin?tab=appointments');
      await h.row('APT-1002').getByRole('button', { name: 'Cancel' }).click(); await h.page.fill('#admin-reason', 'Patient called to cancel');
      await h.page.click('#admin-confirm-cancel'); await h.page.waitForTimeout(100);
      const st = await h.row('APT-1002').locator('.badge').innerText();
      await h.go('/admin'); const act = await h.text('.audit li');
      expect(st === 'Cancelled' && /APT-1002/.test(act), `${st} ${act}`);
      return `APT-1002 status ${st}; activity log: "${act}".`;
    } },

  // 8. Doctor availability changes
  { id: 'TC-27', area: 'Doctor availability', req: 'FR-41, US-09', priority: 'High',
    scenario: 'Doctor publishes a new slot and patients can see it',
    pre: 'Dr Raman has no 12:30 slot on Tue 20 Oct.',
    steps: ['Doctor > Availability, go to Tue 20 Oct', 'Click 12:30pm (Not available)', 'Log out; open Dr Raman profile as guest on Tue 20 Oct'],
    data: '2026-10-20 12:30',
    expected: 'Slot changes to Open; guest sees 12:30pm as an available slot.',
    run: async (h) => {
      await h.login(PRIYA); await h.go('/doctor?tab=availability'); await h.setDay(D.tue);
      await h.page.click('.avail[data-time="12:30"]'); const st = await h.text('.avail[data-time="12:30"] small');
      await h.logout(); await h.go('/doctors/d1'); await h.page.click(`.date-chip[data-date="${D.tue}"]`);
      expect(st === 'Open' && await h.has('.time-chip[data-time="12:30"].open'), st);
      return `Slot state "${st}"; 12:30pm visible and selectable on the patient profile.`;
    } },
  { id: 'TC-28', area: 'Doctor availability', req: 'FR-42', priority: 'High',
    scenario: 'Doctor removes an open slot and it disappears for patients',
    pre: 'Dr Raman has an open 09:00 slot on Tue 20 Oct.',
    steps: ['Availability > Tue 20 Oct, click 9:00am (Open)', 'Check the profile as a guest'],
    data: '2026-10-20 09:00',
    expected: 'Slot shows Not available; 9:00am no longer listed on the profile.',
    run: async (h) => {
      await h.login(PRIYA); await h.go('/doctor?tab=availability'); await h.setDay(D.tue);
      await h.page.click('.avail[data-time="09:00"]'); const st = await h.text('.avail[data-time="09:00"] small');
      await h.logout(); await h.go('/doctors/d1'); await h.page.click(`.date-chip[data-date="${D.tue}"]`);
      expect(st === 'Not available' && !(await h.has('.time-chip[data-time="09:00"]')), st);
      return `Slot state "${st}"; 9:00am no longer offered to patients.`;
    } },
  { id: 'TC-29', area: 'Doctor availability', req: 'BR-12, FR-43', priority: 'High',
    scenario: 'Doctor cannot remove a slot that is already booked',
    pre: 'APT-1001 (Alice) occupies Fri 16 Oct 10:00.',
    steps: ['Availability > Fri 16 Oct', 'Click 10:00am (Booked)'],
    data: '2026-10-16 10:00',
    expected: 'Error "This slot is booked (APT-1001). Cancel the appointment first." [BR-12]; slot stays Booked.',
    run: async (h) => {
      await h.login(PRIYA); await h.go('/doctor?tab=availability'); await h.setDay(D.fri);
      await h.page.click('.avail[data-time="10:00"]'); const a = await h.alert(); const st = await h.text('.avail[data-time="10:00"] small');
      expect(/BR-12/.test(a) && st === 'Booked', `${a} ${st}`);
      return `Blocked: "${a}"; slot still ${st}.`;
    } },
  { id: 'TC-30', area: 'Doctor availability', req: 'BR-09', priority: 'Medium',
    scenario: 'Doctor cannot add availability for a past date or beyond 30 days',
    pre: 'Dr Raman logged in.',
    steps: ['Availability > Tue 13 Oct (yesterday)', 'Click a Not available slot', 'Go to Sat 14 Nov (31 days ahead)'],
    data: '2026-10-13; 2026-11-14',
    expected: 'Past date: warning and "Publish whole day" disabled; adding a slot is rejected. Beyond 30 days: warning and Publish disabled.',
    run: async (h) => {
      await h.login(PRIYA); await h.go('/doctor?tab=availability'); await h.setDay(D.yday);
      const a1 = await h.alert(); const d1 = await h.page.getByRole('button', { name: 'Publish whole day' }).isDisabled();
      await h.page.click('.avail[data-time="12:30"]'); const e1 = (await h.page.locator('.alert').allInnerTexts()).join(' | ');
      await h.setDay('2026-11-14'); const a2 = await h.alert(); const d2 = await h.page.getByRole('button', { name: 'Publish whole day' }).isDisabled();
      expect(/past date/.test(a1) && d1 && d2 && /30 days/.test(a2) && /past|passed/.test(e1), `${a1} ${a2}`);
      return `Past date: "${a1}", publish disabled, click rejected. 31 days ahead: "${a2}", publish disabled.`;
    } },
  { id: 'TC-31', area: 'Doctor availability', req: 'FR-45, BR-13', priority: 'Medium',
    scenario: 'Doctor can mark an appointment completed only after its start time',
    pre: 'APT-1006 (Ben) was yesterday 09:00 and is still Booked; APT-1001 is Fri 16 Oct.',
    steps: ['Schedule > Tue 13 Oct, click Mark completed on APT-1006', 'Go to Fri 16 Oct and check APT-1001'],
    data: 'APT-1006, APT-1001',
    expected: 'APT-1006 becomes Completed; "Mark completed" is disabled for future APT-1001.',
    run: async (h) => {
      await h.login(PRIYA); const pend = await h.text('.stat-warn');
      await h.setDay(D.yday); await h.row('APT-1006').getByRole('button', { name: 'Mark completed' }).click(); await h.page.waitForTimeout(80);
      const st = await h.row('APT-1006').locator('.badge').innerText();
      await h.setDay(D.fri); const dis = await h.row('APT-1001').getByRole('button', { name: 'Mark completed' }).isDisabled();
      expect(st === 'Completed' && dis, `${st} ${dis}`);
      return `Dashboard flagged "${pend}"; APT-1006 → ${st}; future APT-1001 "Mark completed" disabled.`;
    } },
  { id: 'TC-32', area: 'Doctor availability', req: 'FR-41', priority: 'Medium',
    scenario: 'Doctor publishes a whole day further ahead and patients see the new slots',
    pre: 'Mon 2 Nov has no availability for Dr Raman.',
    steps: ['Availability > Mon 2 Nov', 'Click Publish whole day', 'Open Dr Raman profile as a patient, scroll the date strip to 2 Nov'],
    data: '2026-11-02',
    expected: 'All 16 slots (9:00–16:30) become Open; patient date strip shows "16 free" for 2 Nov.',
    run: async (h) => {
      await h.login(PRIYA); await h.go('/doctor?tab=availability'); await h.setDay('2026-11-02');
      await h.page.getByRole('button', { name: 'Publish whole day' }).click(); await h.page.waitForTimeout(80);
      const open = await h.page.locator('.avail.open').count();
      await h.logout(); await h.go('/doctors/d1'); const lbl = await h.text('.date-chip[data-date="2026-11-02"] .dc-count');
      expect(open === 16 && lbl === '16 free', `${open} ${lbl}`);
      return `${open} slots published; patient view shows "${lbl}" on Mon 2 Nov.`;
    } },

  // Admin and additional edge cases
  { id: 'TC-33', area: 'Admin doctor management', req: 'FR-50, FR-56, BR-15', priority: 'Medium',
    scenario: 'Admin deactivates a doctor; doctor disappears from search',
    pre: 'Dr Grace Chen is active with upcoming bookings.',
    steps: ['Admin > Doctors, click Deactivate for Dr Grace Chen', 'Accept the warning', 'As guest open Find a doctor and #/doctors/d7'],
    data: 'd7',
    expected: 'Warning shows the number of upcoming appointments; status Inactive; Dr Chen not listed; profile shows "Doctor not available".',
    run: async (h) => {
      let msg = ''; h.page.once('dialog', (d) => { msg = d.message(); d.accept(); });
      await h.login(ADMIN); await h.go('/admin?tab=doctors');
      await h.row('d7').getByRole('button', { name: 'Deactivate' }).click(); await h.page.waitForTimeout(80);
      const st = await h.row('d7').locator('.badge').innerText();
      await h.logout(); await h.go('/doctors'); const listed = (await h.page.locator('.doctor-list').innerText()).includes('Grace Chen');
      await h.go('/doctors/d7'); const t = await h.text('.empty-title');
      expect(/upcoming appointment/.test(msg) && st === 'Inactive' && !listed && t === 'Doctor not available', `${msg} ${st} ${listed} ${t}`);
      return `Warning: "${msg.slice(0, 70)}…"; status ${st}; not in search; profile "${t}".`;
    } },
  { id: 'TC-34', area: 'Admin doctor management', req: 'FR-50', priority: 'Medium',
    scenario: 'Admin adds a doctor (with validation)',
    pre: 'Admin logged in.',
    steps: ['Admin > Doctors > Add doctor', 'Click Add doctor with empty form', 'Fill details and save', 'As guest filter Find a doctor by ENT'],
    data: 'Dr Test Doctor; test.doctor@hospital.demo; ENT; £75; 5 yrs; MBBS',
    expected: 'Empty form shows field errors; after saving the doctor appears in the table and in ENT search with "No free slots in the next 30 days".',
    run: async (h) => {
      await h.login(ADMIN); await h.go('/admin?tab=doctors');
      await h.page.getByRole('button', { name: 'Add doctor' }).click(); await h.page.click('#save-doctor');
      const errs = await h.page.locator('.field-error').count();
      await h.page.fill('#d-name', 'Dr Test Doctor'); await h.page.fill('#d-email', 'test.doctor@hospital.demo'); await h.page.selectOption('#d-spec', 'ENT');
      await h.page.fill('#d-fee', '75'); await h.page.fill('#d-exp', '5'); await h.page.fill('#d-q', 'MBBS'); await h.page.click('#save-doctor'); await h.page.waitForTimeout(80);
      const inTable = (await h.page.locator('table').innerText()).includes('Dr Test Doctor');
      await h.logout(); await h.go('/doctors?spec=ENT'); const card = await h.text('.doctor-list');
      expect(errs >= 4 && inTable && /Dr Test Doctor/.test(card) && /No free slots/.test(card), `${errs} ${inTable} ${card}`);
      return `${errs} field errors on empty form; doctor added; ENT search shows Dr Test Doctor with "No free slots in the next 30 days".`;
    } },
  { id: 'TC-35', area: 'Admin reporting', req: 'FR-52, FR-55, US-15', priority: 'Medium',
    scenario: 'Admin filters appointments and exports a report',
    pre: 'Admin logged in; seed data loaded.',
    steps: ['Appointments tab: filter Status = Cancelled', 'Reports tab: keep default range', 'Click Export CSV', 'Set From after To'],
    data: 'Status Cancelled; default range ±14 days',
    expected: 'Only cancelled appointments listed (APT-1004); report shows totals by status and doctor; CSV downloads with one row per appointment; invalid range shows an error.',
    run: async (h) => {
      await h.login(ADMIN); await h.go('/admin?tab=appointments'); await h.page.selectOption('#a-status', 'Cancelled');
      const rows = await h.page.locator('tbody tr').allInnerTexts();
      expect(rows.length === 1 && rows[0].includes('APT-1004'), rows.join('|'));
      await h.go('/admin?tab=reports'); const total = await h.text('.stat .stat-n');
      const [dl] = await Promise.all([h.page.waitForEvent('download'), h.page.click('#export-csv')]);
      const csv = await (await import('node:fs')).promises.readFile(await dl.path(), 'utf8');
      const lines = csv.trim().split('\n').length - 1;
      await h.page.fill('#r-from', '2026-10-30'); await h.page.fill('#r-to', '2026-10-01'); const a = await h.alert();
      expect(Number(total) === lines && /start date/.test(a), `${total} ${lines} ${a}`);
      return `Filter returned only APT-1004; report total ${total}; CSV "${dl.suggestedFilename()}" with ${lines} rows; invalid range: "${a}".`;
    } },
  { id: 'TC-36', area: 'Registration validation', req: 'FR-01, FR-02', priority: 'Medium',
    scenario: 'Registration rejects a duplicate email and invalid fields',
    pre: 'alice@demo.com already registered.',
    steps: ['Open Register, click Create account with empty form', 'Enter alice@demo.com, valid other fields, mismatched confirm password', 'Fix the password and submit'],
    data: 'alice@demo.com; Test1234 / Test9999',
    expected: 'Empty form: errors on all 5 required fields. Mismatch: "Passwords do not match." Duplicate: "An account with this email already exists." No account created.',
    run: async (h) => {
      await h.go('/register'); await h.page.click('form button[type=submit]'); const n = await h.page.locator('.field-error').count();
      await h.page.fill('#r-name', 'Alice Two'); await h.page.fill('#r-email', 'alice@demo.com'); await h.page.fill('#r-mobile', '07700900999');
      await h.page.fill('#r-dob', '1990-01-01'); await h.page.fill('#r-pass', 'Test1234'); await h.page.fill('#r-confirm', 'Test9999');
      await h.page.click('form button[type=submit]'); const m = await h.text('.field-error');
      await h.page.fill('#r-confirm', 'Test1234'); await h.page.click('form button[type=submit]'); const d = await h.text('.field-error');
      expect(n === 5 && /do not match/.test(m) && /already exists/.test(d) && h.url() === '/register', `${n} ${m} ${d}`);
      return `${n} field errors on empty form; mismatch "${m}"; duplicate "${d}"; stayed on Register.`;
    } },
  { id: 'TC-37', area: 'Booking limits', req: 'BR-16', priority: 'Low',
    scenario: 'Patient with 3 upcoming appointments cannot book a fourth',
    pre: 'Ben has 3 upcoming appointments.',
    steps: ['Log in as Ben', 'Select Dr Grace Chen Mon 19 Oct 10:00 and continue'],
    data: 'ben@demo.com',
    expected: '"You can hold up to 3 upcoming appointments. Cancel one to book another." [BR-16]; Confirm disabled.',
    run: async (h) => {
      await h.login(BEN); await h.go('/doctors/d7'); await h.pickSlot(D.mon, '10:00'); await h.page.click('#continue-booking'); await h.page.waitForTimeout(100);
      const a = await h.alert();
      expect(/BR-16/.test(a) && await h.page.locator('#confirm-booking').isDisabled(), a);
      return `Blocked: "${a}".`;
    } },
  { id: 'TC-38', area: 'Responsive UI', req: 'NFR-01', priority: 'Medium',
    scenario: 'Booking journey works on a mobile screen (390 × 844)',
    pre: 'Mobile viewport.',
    steps: ['Open the site on a 390px wide screen', 'Open the Menu', 'Log in as Alice and book Dr Grace Chen Mon 19 Oct 10:00'],
    data: 'Viewport 390×844',
    expected: 'Navigation collapses behind a Menu button; no horizontal scrolling; booking completes.',
    viewport: { width: 390, height: 844 },
    run: async (h) => {
      await h.go('/'); const navHidden = !(await h.page.locator('#main-nav').isVisible());
      await h.page.click('.menu-btn'); const navShown = await h.page.locator('#main-nav').isVisible();
      await h.login(ALICE); await h.book('d7', D.mon, '10:00');
      const overflow = await h.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(navHidden && navShown && !overflow && (await h.text('h1')) === 'Appointment confirmed', `${navHidden} ${navShown} ${overflow}`);
      return 'Menu collapsed and opened correctly; no horizontal overflow; booking confirmed on mobile.';
    } },
];

// ---------------------------------------------------------------------------
async function main() {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const results = [];
  for (const tc of CASES) {
    const ctx = await browser.newContext({ timezoneId: 'Europe/London', locale: 'en-GB', viewport: tc.viewport || { width: 1280, height: 860 }, acceptDownloads: true });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date(tc.clock || T0));
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    let actual; let status;
    try {
      actual = await tc.run(helpers(page));
      status = errors.length ? 'Fail' : 'Pass';
      if (errors.length) actual += ` Console errors: ${errors.join('; ')}`;
    } catch (e) {
      status = 'Fail';
      actual = e instanceof Check ? `Check failed: ${e.message}` : `Error: ${e.message.split('\n')[0]}`;
    }
    results.push({ id: tc.id, status, actual });
    console.log(`${status === 'Pass' ? '✔' : '✘'} ${tc.id} ${tc.scenario}${status === 'Pass' ? '' : `\n    ${actual}`}`);
    await ctx.close();
  }
  await browser.close();
  const meta = CASES.map(({ run, viewport, ...m }) => m);
  writeFileSync(OUT, JSON.stringify({ executedAt: new Date().toISOString(), clock: T0, cases: meta, results }, null, 2));
  const failed = results.filter((r) => r.status !== 'Pass').length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
