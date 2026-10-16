import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { navigate } from '../lib/router.jsx';
import { findBooking, validateComplete, validateRemoveSlot } from '../lib/rules.js';
import {
  BOOKING_HORIZON_DAYS, addDays, formatDate, formatTime, isPast, todayISO, workday, workingSlots,
} from '../lib/dates.js';
import { Alert, Empty, Field, Modal, StatusBadge, Tabs } from '../components/ui.jsx';

export default function DoctorDashboard({ query }) {
  const { user } = useStore();
  const tab = query.get('tab') || 'schedule';
  return (
    <div className="page">
      <header className="page-head">
        <h1>{user.name}</h1>
      </header>
      <Tabs
        tabs={[{ id: 'schedule', label: 'Schedule' }, { id: 'availability', label: 'Availability' }, { id: 'profile', label: 'Profile' }]}
        active={tab}
        onChange={(t) => navigate(t === 'schedule' ? '/doctor' : `/doctor?tab=${t}`)}
      />
      {tab === 'schedule' && <Schedule />}
      {tab === 'availability' && <Availability />}
      {tab === 'profile' && <Profile />}
    </div>
  );
}

function DayNav({ date, setDate, min, max }) {
  return (
    <div className="day-nav">
      <button className="btn btn-ghost btn-sm" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))} disabled={min && date <= min}>‹</button>
      <input type="date" value={date} min={min} max={max} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Date" />
      <button className="btn btn-ghost btn-sm" aria-label="Next day" onClick={() => setDate(addDays(date, 1))} disabled={max && date >= max}>›</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setDate(todayISO())}>Today</button>
      <strong className="day-label">{formatDate(date)}</strong>
    </div>
  );
}

function Schedule() {
  const { db, user, complete, cancel, notify } = useStore();
  const [date, setDate] = useState(todayISO());
  const [toCancel, setToCancel] = useState(null);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState(null);
  const now = new Date();
  const mine = db.appointments.filter((a) => a.doctorId === user.doctorId); // BR-07
  const day = mine.filter((a) => a.date === date).sort((a, b) => a.time.localeCompare(b.time));
  const patient = (id) => db.users.find((u) => u.id === id);
  const awaiting = mine.filter((a) => a.status === 'Booked' && isPast(a.date, a.time, now) && a.date < todayISO(now));
  const week = mine.filter((a) => a.status === 'Booked' && a.date >= todayISO(now) && a.date <= addDays(todayISO(now), 7));

  const doComplete = (a) => {
    const r = complete(a.id);
    if (!r.ok) return setErr(r);
    setErr(null);
    notify(`${a.id} marked as completed.`);
  };
  const doCancel = () => {
    const r = cancel(toCancel.id, reason);
    if (!r.ok) return setErr(r);
    notify(`${toCancel.id} cancelled. The patient has been notified and the slot released.`);
    setToCancel(null);
    setReason('');
    setErr(null);
  };

  return (
    <>
      <div className="stats">
        <div className="stat"><span className="stat-n">{day.filter((a) => a.status === 'Booked').length}</span><span>booked on this day</span></div>
        <div className="stat"><span className="stat-n">{week.length}</span><span>booked in the next 7 days</span></div>
        <div className={`stat ${awaiting.length ? 'stat-warn' : ''}`}><span className="stat-n">{awaiting.length}</span><span>past appointments still to close</span></div>
      </div>
      {awaiting.length > 0 && (
        <Alert tone="info">
          Still to close: {awaiting.map((a) => <button key={a.id} className="linklike" onClick={() => setDate(a.date)}>{formatDate(a.date, { year: false })} {formatTime(a.time)}</button>)}
        </Alert>
      )}
      <DayNav date={date} setDate={setDate} />
      {err && !toCancel && <Alert rule={err.rule}>{err.error}</Alert>}
      {day.length === 0 ? (
        <Empty title="No appointments on this day"><p className="muted">Open slots you publish under Availability can be booked by patients.</p></Empty>
      ) : (
        <table className="table schedule">
          <thead><tr><th>Time</th><th>Patient</th><th>Reason</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {day.map((a) => {
              const canComplete = validateComplete(a, user, now);
              return (
                <tr key={a.id} data-id={a.id}>
                  <td className="nowrap"><strong>{formatTime(a.time)}</strong></td>
                  <td>{patient(a.patientId)?.name}<small className="block muted">{a.id}</small></td>
                  <td>{a.reason || <span className="muted">—</span>}{a.cancelReason && <small className="block muted">Cancelled: {a.cancelReason}</small>}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td className="row-actions">
                    {a.status === 'Booked' && (
                      <>
                        <button className="btn btn-ghost btn-sm" disabled={!canComplete.ok} title={canComplete.ok ? '' : canComplete.error} onClick={() => doComplete(a)}>Mark completed</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setErr(null); setToCancel(a); }}>Cancel</button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {toCancel && (
        <Modal
          title="Cancel appointment"
          onClose={() => setToCancel(null)}
          actions={<>
            <button className="btn btn-danger" id="doctor-confirm-cancel" onClick={doCancel}>Cancel appointment</button>
            <button className="btn btn-ghost" onClick={() => setToCancel(null)}>Keep</button>
          </>}
        >
          <p>{patient(toCancel.patientId)?.name} — {formatDate(toCancel.date)} at {formatTime(toCancel.time)}.</p>
          {err && <Alert rule={err.rule}>{err.error}</Alert>}
          <Field label="Reason (shared with the patient)" id="cancel-reason">
            <textarea id="cancel-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </Modal>
      )}
    </>
  );
}

function Availability() {
  const { db, user, addSlots, removeSlot, notify } = useStore();
  const today = todayISO();
  const max = addDays(today, BOOKING_HORIZON_DAYS);
  const [date, setDate] = useState(workday(1));
  const [err, setErr] = useState(null);
  const now = new Date();
  const published = db.availability[user.doctorId]?.[date] || [];
  const all = workingSlots();

  const toggle = (t) => {
    setErr(null);
    const r = published.includes(t) ? removeSlot(user.doctorId, date, t) : addSlots(user.doctorId, date, [t]);
    if (!r.ok) setErr(r);
  };
  const addAll = () => {
    const free = all.filter((t) => !published.includes(t) && !isPast(date, t, now));
    if (!free.length) return;
    const r = addSlots(user.doctorId, date, free);
    if (!r.ok) return setErr(r);
    notify(`Published ${free.length} slots on ${formatDate(date)}.`);
  };
  const clearOpen = () => {
    const open = published.filter((t) => validateRemoveSlot(db, user.doctorId, date, t, now).ok);
    open.forEach((t) => removeSlot(user.doctorId, date, t));
    const kept = published.length - open.length;
    notify(`Removed ${open.length} open slots${kept ? `; ${kept} booked or past slot(s) kept` : ''}.`);
  };

  return (
    <>
      <p className="muted">Click a time to publish or remove it. Patients can book published times. Booked times are locked — cancel the appointment first.</p>
      <DayNav date={date} setDate={(d) => { setDate(d); setErr(null); }} />
      {date < today && <Alert rule="BR-09">Availability cannot be added for a past date.</Alert>}
      {date > max && <Alert rule="BR-09">Availability can be published up to {BOOKING_HORIZON_DAYS} days ahead.</Alert>}
      {err && <Alert rule={err.rule}>{err.error}</Alert>}
      <div className="avail-grid" aria-label="Slots for this day">
        {all.map((t) => {
          const booking = findBooking(db, user.doctorId, date, t);
          const past = isPast(date, t, now);
          const state = booking ? 'booked' : published.includes(t) ? 'open' : 'off';
          return (
            <button
              key={t}
              className={`avail ${state} ${past ? 'past' : ''}`}
              onClick={() => toggle(t)}
              data-time={t}
              aria-pressed={state !== 'off'}
              title={booking ? `Booked by ${db.users.find((u) => u.id === booking.patientId)?.name}` : ''}
            >
              <span>{formatTime(t)}</span>
              <small>{booking ? 'Booked' : state === 'open' ? 'Open' : 'Not available'}</small>
            </button>
          );
        })}
      </div>
      <div className="actions">
        <button className="btn btn-primary" onClick={addAll} disabled={date < today || date > max}>Publish whole day</button>
        <button className="btn btn-ghost" onClick={clearOpen} disabled={!published.length}>Remove open slots</button>
      </div>
    </>
  );
}

function Profile() {
  const { db, user, updateDoctor, notify } = useStore();
  const doc = db.doctors.find((d) => d.id === user.doctorId);
  const [f, setF] = useState({ bio: doc.bio, qualifications: doc.qualifications, languages: doc.languages.join(', '), experience: doc.experience });
  const save = (e) => {
    e.preventDefault();
    updateDoctor(doc.id, { ...f, experience: Number(f.experience) || 0, languages: f.languages.split(',').map((s) => s.trim()).filter(Boolean) });
    notify('Profile saved. Patients will see the changes straight away.');
  };
  return (
    <form className="form-card" onSubmit={save}>
      <div className="two-col">
        <Field label="Specialization" id="p-spec" hint="Changed by the hospital administrator."><input id="p-spec" value={doc.specialization} disabled /></Field>
        <Field label="Consultation fee (£)" id="p-fee" hint="Changed by the hospital administrator."><input id="p-fee" value={doc.fee} disabled /></Field>
      </div>
      <Field label="Qualifications" id="p-q"><input id="p-q" value={f.qualifications} onChange={(e) => setF({ ...f, qualifications: e.target.value })} /></Field>
      <div className="two-col">
        <Field label="Years of experience" id="p-exp"><input id="p-exp" type="number" min="0" value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value })} /></Field>
        <Field label="Languages" id="p-lang" hint="Separate with commas."><input id="p-lang" value={f.languages} onChange={(e) => setF({ ...f, languages: e.target.value })} /></Field>
      </div>
      <Field label="About" id="p-bio"><textarea id="p-bio" rows={4} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
      <button className="btn btn-primary" type="submit">Save profile</button>
    </form>
  );
}
