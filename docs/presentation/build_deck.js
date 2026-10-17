// Builds presentation.pptx (business logic, design decisions, assumptions).
// node build_deck.js   — needs pptxgenjs; theme colours applied with the pptx skill's applyTheme.
const pptxgen = require('pptxgenjs');
const path = require('path');
const SHOTS = path.join(__dirname, '../screenshots');

const THEME = {
  name: 'St Hildas',
  headFontFace: 'Arial',
  bodyFontFace: 'Arial',
  colors: {
    dk1: '14303A', lt1: 'FFFFFF', dk2: '3E5862', lt2: 'F3F6F5',
    accent1: '17735F', accent2: '24527A', accent3: 'B3261E', accent4: '8A5A00', accent5: '9FD0C1', accent6: 'D6E0DE',
    hlink: '24527A', folHlink: '3E5862',
  },
};

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9'; // 10 x 5.625
pres.author = 'Eswara Krishna Bodi';
pres.title = 'Hospital Appointment Booking System';
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

pres.defineSlideMaster({
  title: 'Title Dark',
  background: { color: C.text1 },
  objects: [{ rect: { x: 0.6, y: 2.55, w: 0.9, h: 0.06, fill: { color: C.accent1 } } }],
  placeholders: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 1.0, w: 8.6, h: 1.45, fontSize: 36, bold: true, color: C.background1, valign: 'bottom', margin: 0 }, text: 'Title' } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.6, y: 2.8, w: 8.4, h: 1.6, fontSize: 16, color: C.accent5, valign: 'top', margin: 0 }, text: 'Subtitle' } },
  ],
});
pres.defineSlideMaster({
  title: 'Title Only',
  background: { color: C.background1 },
  objects: [
    { rect: { x: 0, y: 5.3, w: 10, h: 0.325, fill: { color: C.background2 } } },
    { text: { text: 'Hospital Appointment Booking System', options: { x: 0.5, y: 5.3, w: 6, h: 0.325, fontSize: 9, color: C.text2, valign: 'middle', margin: 0 } } },
  ],
  slideNumber: { x: 9.0, y: 5.32, w: 0.5, h: 0.28, fontSize: 9, color: C.text2, align: 'right' },
  placeholders: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 24, bold: true, color: C.text1, valign: 'top', margin: 0 }, text: 'Title' } },
  ],
});

const title = (slide, text) => slide.addText(text, { isTextBox: true, x: 0.5, y: 0.3, w: 9, h: 0.85, fontSize: 22, bold: true, color: C.text1, valign: 'top', margin: 0, fontFace: THEME.headFontFace, objectName: 'title' });
const txt = (slide, text, o) => slide.addText(text, { isTextBox: true, margin: 0, fontSize: 12, color: C.text1, valign: 'top', ...o });

// 1. Title
pres.addSection({ title: 'Introduction' });
let s = pres.addSlide({ masterName: 'Title Dark', sectionTitle: 'Introduction' });
s.addText('Hospital Appointment Booking System', { isTextBox: true, x: 0.6, y: 1.0, w: 8.6, h: 1.45, fontSize: 36, bold: true, color: C.background1, valign: 'bottom', margin: 0 });
s.addText('Business analysis, design and clickable prototype\nEswara Krishna Bodi · October 2026', { isTextBox: true, x: 0.6, y: 2.8, w: 8.4, h: 1.0, fontSize: 16, color: C.accent5, valign: 'top', margin: 0 });
s.addNotes('Walkthrough of the assessment: problem, business logic, design decisions, assumptions, testing and how Claude and GitHub were used.');

// 2. Problem & objectives
s = pres.addSlide({ masterName: 'Title Only', sectionTitle: 'Introduction' });
title(s, 'Manual booking hides real availability, so slots clash and cancellations go to waste');
txt(s, [
  { text: 'Today', options: { bold: true, fontSize: 14, breakLine: true } },
  { text: 'Appointments are booked by phone and at the front desk.', options: { bullet: true, breakLine: true } },
  { text: 'Two patients can be given the same doctor and time.', options: { bullet: true, breakLine: true } },
  { text: 'A cancelled slot is not visible to anyone who could use it.', options: { bullet: true, breakLine: true } },
  { text: 'Doctors have no single view of their day.', options: { bullet: true } },
], { x: 0.5, y: 1.35, w: 4.2, h: 3.4, paraSpaceAfter: 8, fontSize: 13 });
const kpis = [['≥ 60%', 'of outpatient bookings made online within 6 months'], ['0', 'confirmed double bookings'], ['≤ 3 min', 'to complete a booking']];
kpis.forEach(([n, l], i) => {
  const y = 1.35 + i * 1.22;
  s.addShape(pres.ShapeType.rect, { x: 5.2, y, w: 4.3, h: 1.05, fill: { color: C.background2 }, line: { color: C.accent6 }, objectName: `kpi-${i}` });
  s.addShape(pres.ShapeType.rect, { x: 5.2, y, w: 0.08, h: 1.05, fill: { color: C.accent1 }, line: { color: C.accent1 } });
  txt(s, n, { x: 5.45, y: y + 0.12, w: 1.5, h: 0.8, fontSize: 26, bold: true, color: C.accent1, valign: 'middle' });
  txt(s, l, { x: 7.0, y: y + 0.12, w: 2.35, h: 0.8, fontSize: 12, valign: 'middle' });
});
s.addNotes('Objectives BO-01 to BO-05 in the BRD. The three shown are the measurable targets that drive the design: online share, zero double bookings and booking time.');

// 3. Deliverables
s = pres.addSlide({ masterName: 'Title Only', sectionTitle: 'Introduction' });
title(s, 'Every deliverable lives in one GitHub repository, traced to the same requirement IDs');
const dels = [
  ['BRD', '5 objectives, 50+ functional requirements, 16 business rules, 15 user stories with acceptance criteria, gaps and assumptions', 'docs/BRD.md · .docx'],
  ['User flows', 'Patient, doctor, admin and access-control flows plus the appointment lifecycle', 'docs/user-flows'],
  ['Wireframes', 'All eight required screens, annotated with requirement IDs', 'docs/wireframes'],
  ['Prototype', 'Responsive React app with mock data: book, cancel, reschedule, doctor and admin tools', 'prototype/'],
  ['Test cases', '38 cases executed in a browser, actual results recorded, plus 14 rule unit tests', 'docs/testing'],
  ['This deck', 'Business logic, design decisions and assumptions', 'docs/presentation'],
];
dels.forEach(([h, b, p], i) => {
  const x = 0.5 + (i % 3) * 3.05; const y = 1.35 + Math.floor(i / 3) * 1.9;
  s.addShape(pres.ShapeType.rect, { x, y, w: 2.85, h: 1.7, fill: { color: C.background1 }, line: { color: C.accent6, width: 1 }, objectName: `deliverable-${i}` });
  txt(s, h, { x: x + 0.18, y: y + 0.15, w: 2.5, h: 0.35, fontSize: 14, bold: true });
  txt(s, b, { x: x + 0.18, y: y + 0.52, w: 2.5, h: 0.8, fontSize: 10, color: C.text2 });
  txt(s, p, { x: x + 0.18, y: y + 1.35, w: 2.5, h: 0.25, fontSize: 9, color: C.accent1, bold: true });
});

// 4. Business logic
pres.addSection({ title: 'Business logic' });
s = pres.addSlide({ masterName: 'Title Only', sectionTitle: 'Business logic' });
title(s, 'One rule decides whether a slot can be booked, so double bookings cannot happen');
const conds = [['Published', 'The doctor has made this time available'], ['In the future', 'Not passed; within 30 days; on the half hour'], ['Not taken', 'No appointment with status Booked holds it']];
conds.forEach(([h, b], i) => {
  const x = 0.5 + i * 2.25;
  s.addShape(pres.ShapeType.rect, { x, y: 1.5, w: 2.0, h: 1.35, fill: { color: C.background2 }, line: { color: C.accent6 }, objectName: `cond-${i}` });
  txt(s, h, { x: x + 0.15, y: 1.62, w: 1.75, h: 0.35, fontSize: 14, bold: true });
  txt(s, b, { x: x + 0.15, y: 2.0, w: 1.75, h: 0.75, fontSize: 10.5, color: C.text2 });
  if (i < 2) txt(s, 'and', { x: x + 2.0, y: 2.0, w: 0.25, h: 0.3, fontSize: 9, color: C.text2, align: 'center' });
});
s.addShape(pres.ShapeType.rect, { x: 7.35, y: 1.5, w: 2.15, h: 1.35, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: 'open-result' });
txt(s, 'Slot is open', { x: 7.5, y: 1.62, w: 1.9, h: 0.35, fontSize: 15, bold: true, color: C.background1 });
txt(s, 'Shown as selectable and checked again on Confirm', { x: 7.5, y: 2.0, w: 1.9, h: 0.75, fontSize: 10.5, color: C.background1 });
txt(s, '=', { x: 7.1, y: 1.95, w: 0.25, h: 0.4, fontSize: 16, bold: true, color: C.text2, align: 'center' });
txt(s, [
  { text: 'Why it works', options: { bold: true, fontSize: 13, breakLine: true } },
  { text: 'Availability is derived from appointments, never stored twice, so it cannot drift out of sync.', options: { bullet: true, breakLine: true } },
  { text: 'Cancel only changes a status, so the slot is released immediately (BR-05).', options: { bullet: true, breakLine: true } },
  { text: 'Reschedule moves one appointment, so the old slot frees and the new one is held in one step (BR-06).', options: { bullet: true, breakLine: true } },
  { text: 'Production needs the same check on the server plus a unique constraint on doctor + start time (NFR-03).', options: { bullet: true } },
], { x: 0.5, y: 3.15, w: 9, h: 2.0, fontSize: 12, paraSpaceAfter: 5 });
s.addNotes('The checks run in rules.js as pure functions; the UI, the store and the unit tests all call the same functions. Rule IDs are shown in error messages for traceability.');

// 5. Rules & gaps
s = pres.addSlide({ masterName: 'Title Only', sectionTitle: 'Business logic' });
title(s, 'The brief gave eight rules; analysis found eight more that the system needs');
const hdr = (t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text1 } } });
const rows = [
  [hdr('Gap in the brief'), hdr('Decision'), hdr('Rule')],
  ['How long is a slot? When is the clinic open?', '30 minutes, 09:00–16:30; book up to 30 days ahead', 'BR-09'],
  ['Can patients cancel at the last minute?', 'Online changes allowed until 2 hours before', 'BR-10'],
  ['Can a patient book two doctors at the same time?', 'No — blocked at confirm', 'BR-11'],
  ['What if a doctor removes a booked slot?', 'Not allowed; cancel the appointment first', 'BR-12'],
  ['Two patients confirm the same slot at once', 'Re-check on confirm; server unique constraint', 'FR-21'],
  ['When can a visit be marked completed?', 'Only after its start time', 'BR-13'],
  ['Can reschedule change the doctor?', 'No — cancel and book again', 'BR-14'],
  ['One patient holding many slots', 'Maximum 3 upcoming appointments', 'BR-16'],
];
s.addTable(rows, { x: 0.5, y: 1.3, w: 9, colW: [3.9, 4.2, 0.9], fontSize: 10.5, color: C.text1, border: { type: 'solid', pt: 0.5, color: 'D6E0DE' }, rowH: 0.36, valign: 'middle', margin: [3, 6, 3, 6] });
s.addNotes('Full gap list (G-01 to G-17) is in BRD section 11. Each decision is an assumption to confirm with the hospital.');

// 6. Patient journey
pres.addSection({ title: 'Design' });
s = pres.addSlide({ masterName: 'Title Only', sectionTitle: 'Design' });
title(s, 'A patient goes from search to confirmed booking in four screens');
const pj = [['03-doctor-profile', 'Choose a free slot', 'Booked times are struck through and cannot be picked'], ['04-booking-review', 'Review and confirm', 'All rules re-checked before saving'], ['06-confirmation', 'Confirmation', 'Reference number and the 2-hour cut-off'], ['07-patient-dashboard', 'Manage', 'Cancel or reschedule from one list']];
pj.forEach(([f, h, b], i) => {
  const x = 0.5 + i * 2.28;
  s.addImage({ path: path.join(SHOTS, `${f}.png`), x, y: 1.3, w: 2.12, h: 1.325, objectName: `shot-${f}` });
  s.addShape(pres.ShapeType.rect, { x, y: 1.3, w: 2.12, h: 1.325, fill: { type: 'none' }, line: { color: C.accent6, width: 0.75 } });
  txt(s, `${i + 1}. ${h}`, { x, y: 2.8, w: 2.12, h: 0.3, fontSize: 12, bold: true });
  txt(s, b, { x, y: 3.12, w: 2.12, h: 0.6, fontSize: 10, color: C.text2 });
});
txt(s, 'Guests can search and view profiles; login is asked for only at the booking step, and returns them to the slot they picked.', { x: 0.5, y: 4.15, w: 9, h: 0.6, fontSize: 12, color: C.accent1, bold: true });

// 7. Doctor & admin
s = pres.addSlide({ masterName: 'Title Only', sectionTitle: 'Design' });
title(s, 'Doctors control their own availability; administrators see and fix everything');
[['11-doctor-availability', 'Doctor availability', 'Click a time to publish or remove it. Booked times are locked with the reason shown (BR-12).'], ['12-admin-overview', 'Admin overview', "Today's totals, demand per doctor and an activity log; tabs for appointments, doctors, patients and reports."]].forEach(([f, h, b], i) => {
  const x = 0.5 + i * 4.6;
  s.addImage({ path: path.join(SHOTS, `${f}.png`), x, y: 1.3, w: 4.4, h: 2.75, objectName: `shot-${f}` });
  s.addShape(pres.ShapeType.rect, { x, y: 1.3, w: 4.4, h: 2.75, fill: { type: 'none' }, line: { color: C.accent6, width: 0.75 } });
  txt(s, h, { x, y: 4.18, w: 4.4, h: 0.3, fontSize: 12, bold: true });
  txt(s, b, { x, y: 4.5, w: 4.4, h: 0.6, fontSize: 10, color: C.text2 });
});

// 8. Design decisions
s = pres.addSlide({ masterName: 'Title Only', sectionTitle: 'Design' });
title(s, 'Five design decisions shaped the screens');
const dd = [
  ['Prevent errors instead of reporting them', 'Unavailable slots cannot be selected, so most invalid bookings never reach the confirm step.'],
  ['Show the rule when an action is blocked', 'Disabled buttons carry the reason (e.g. the 2-hour cut-off and the phone number to call).'],
  ['One login, role-based landing', 'Patients, doctors and admins share a login; each lands on their own dashboard and other pages redirect.'],
  ['Readable for every patient', 'Atkinson Hyperlegible typeface, large touch targets, keyboard focus, layouts that work at 390 px.'],
  ['Rules in one place', 'All business rules are pure functions reused by the UI and the tests — the same logic a backend would own.'],
];
dd.forEach(([h, b], i) => {
  const y = 1.25 + i * 0.8;
  s.addShape(pres.ShapeType.rect, { x: 0.5, y: y + 0.05, w: 0.08, h: 0.6, fill: { color: C.accent1 }, line: { color: C.accent1 } });
  txt(s, h, { x: 0.75, y, w: 3.4, h: 0.7, fontSize: 13, bold: true, valign: 'middle' });
  txt(s, b, { x: 4.3, y, w: 5.2, h: 0.7, fontSize: 11, color: C.text2, valign: 'middle' });
});

// 9. Assumptions
s = pres.addSlide({ masterName: 'Title Only', sectionTitle: 'Design' });
title(s, 'Assumptions to confirm with the hospital before build');
const as = [
  'Single site, single time zone (Europe/London).', 'One appointment = one 30-minute slot, one patient, one doctor.',
  'Fees are paid at the hospital; no online payment in this phase.', 'Doctors keep their own availability; admins can edit it for them.',
  'Patients book only for themselves (no family accounts yet).', 'Email is the unique login for every role.',
  'Email/SMS is sent by an existing hospital service.', 'The prototype enforces rules in the browser only; production enforces them on the server.',
];
txt(s, as.slice(0, 4).map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < 3 } })), { x: 0.5, y: 1.35, w: 4.3, h: 3.4, fontSize: 12.5, paraSpaceAfter: 10 });
txt(s, as.slice(4).map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < 3 } })), { x: 5.1, y: 1.35, w: 4.4, h: 3.4, fontSize: 12.5, paraSpaceAfter: 10 });
txt(s, 'Out of scope: online payment, medical records, video consultations, native apps, PAS/HIS integration.', { x: 0.5, y: 4.55, w: 9, h: 0.45, fontSize: 11, color: C.text2, italic: true });

// 10. Testing
pres.addSection({ title: 'Testing and next steps' });
s = pres.addSlide({ masterName: 'Title Only', sectionTitle: 'Testing and next steps' });
title(s, '38 test cases were executed in a real browser, and all passed');
const areas = [['Successful booking', 3], ['Unavailable slot', 3], ['Double booking', 2], ['Invalid date/time', 4], ['Cancellation', 4], ['Rescheduling', 4], ['Login & access', 5], ['Doctor availability', 6], ['Admin & edge cases', 7]];
s.addChart(pres.ChartType.bar, [{ name: 'Test cases', labels: areas.map((a) => a[0]), values: areas.map((a) => a[1]) }], {
  x: 0.4, y: 1.2, w: 5.6, h: 3.9, barDir: 'bar', chartColors: [THEME.colors.accent1], showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 10,
  dataLabelColor: THEME.colors.dk1, catAxisLabelFontSize: 10, catAxisLabelColor: THEME.colors.dk2, valAxisHidden: true, valGridLine: { style: 'none' },
  catGridLine: { style: 'none' }, catAxisOrientation: 'maxMin', showLegend: false, showTitle: true, title: 'Test cases by area', titleFontSize: 12,
  titleColor: THEME.colors.dk1, catAxisLabelFontFace: '+mn-lt', titleFontFace: '+mn-lt', dataLabelFontFace: '+mn-lt', barGapWidthPct: 60,
});
[['38 / 38', 'passed (Playwright, fixed clock, fresh data per case)'], ['14', 'unit tests on the business rules'], ['2', 'viewports: desktop 1280 px and mobile 390 px']].forEach(([n, l], i) => {
  const y = 1.3 + i * 1.0;
  txt(s, n, { x: 6.3, y, w: 1.4, h: 0.6, fontSize: 24, bold: true, color: C.accent1, valign: 'middle' });
  txt(s, l, { x: 7.7, y, w: 1.85, h: 0.6, fontSize: 10.5, valign: 'middle' });
});
txt(s, 'Limitation: with no backend, simultaneous booking (TC-06) is simulated in the page.', { x: 6.3, y: 4.35, w: 3.2, h: 0.65, fontSize: 10, italic: true, color: C.text2 });

// 11. Claude + GitHub workflow
s = pres.addSlide({ masterName: 'Title Only', sectionTitle: 'Testing and next steps' });
title(s, 'Claude did the analysis, design and build; GitHub holds every version');
const wf = [
  ['Analyse', 'Claude reviewed the brief, drafted the BRD and surfaced 17 gaps for decision'],
  ['Design', 'User flows in Mermaid and annotated HTML wireframes for all eight screens'],
  ['Build', 'React prototype written with Claude, business rules isolated in one tested module'],
  ['Test', 'Claude wrote and ran 38 browser test cases; results fed straight into the Excel sheet'],
  ['Version', 'One commit per deliverable, pushed to GitHub; README links every artefact'],
];
wf.forEach(([h, b], i) => {
  const x = 0.5 + i * 1.83;
  s.addShape(pres.ShapeType.rect, { x, y: 1.4, w: 1.68, h: 2.3, fill: { color: i === 4 ? C.accent1 : C.background2 }, line: { color: i === 4 ? C.accent1 : C.accent6 }, objectName: `step-${i}` });
  txt(s, `${i + 1}`, { x: x + 0.15, y: 1.52, w: 1.4, h: 0.4, fontSize: 20, bold: true, color: i === 4 ? C.background1 : C.accent1 });
  txt(s, h, { x: x + 0.15, y: 1.95, w: 1.4, h: 0.35, fontSize: 13, bold: true, color: i === 4 ? C.background1 : C.text1 });
  txt(s, b, { x: x + 0.15, y: 2.32, w: 1.4, h: 1.3, fontSize: 9.5, color: i === 4 ? C.background1 : C.text2 });
});
txt(s, 'Every artefact is reproducible from the repository: the BRD Word file, test sheet and this deck are generated by scripts kept beside them.', { x: 0.5, y: 4.0, w: 9, h: 0.6, fontSize: 12, color: C.text2 });

// 12. Closing
s = pres.addSlide({ masterName: 'Title Dark', sectionTitle: 'Testing and next steps' });
s.addText('Next steps', { isTextBox: true, x: 0.6, y: 1.0, w: 8.6, h: 1.45, fontSize: 36, bold: true, color: C.background1, valign: 'bottom', margin: 0 });
s.addText([
  { text: 'Confirm the assumptions and added rules with operations and clinical leads', options: { bullet: true, breakLine: true } },
  { text: 'Build the API and database with a unique constraint on doctor + slot start', options: { bullet: true, breakLine: true } },
  { text: 'Connect email/SMS notifications; complete a DPIA for patient data', options: { bullet: true, breakLine: true } },
  { text: 'Run UAT with patients, doctors and front-desk staff using the test sheet', options: { bullet: true } },
], { isTextBox: true, x: 0.6, y: 2.8, w: 8.6, h: 2.2, valign: 'top', margin: 0, paraSpaceAfter: 6, color: C.background1, fontSize: 15 });
s.addNotes('Claude was used for requirement analysis, wireframes, the React code, the test suite and documentation; GitHub holds the repository with commit history per deliverable.');

(async () => {
  const out = path.join(__dirname, 'presentation.pptx');
  await pres.writeFile({ fileName: out });
  const { applyTheme } = require('/mnt/skills/public/pptx/scripts/apply_theme.js');
  await applyTheme(out, THEME);
  console.log('written', out);
})();
