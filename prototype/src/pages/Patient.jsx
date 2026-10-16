import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Link, navigate } from '../lib/router.jsx';
import { validateBooking, validateCancel } from '../lib/rules.js';
import { CANCEL_CUTOFF_HOURS, formatDate, formatTime, isPast, parseDateTime } from '../lib/dates.js';
import { Alert, Empty, Modal, StatusBadge, Tabs } from '../components/ui.jsx';
import SlotPicker from '../components/SlotPicker.jsx';

function Summary({ doctor, date, time, reason, refId }) {
  return (
    <dl className="summary">
      {refId && <div><dt>Reference</dt><dd className="ref">{refId}</dd></div>}
      <div><dt>Doctor</dt><dd>{doctor.name}<small>{doctor.specialization}</small></dd></div>
      <div><dt>Date</dt><dd>{formatDate(date)}</dd></div>
      <div><dt>Time</dt><dd>{formatTime(time)} (30 minutes)</dd></div>
      <div><dt>Fee</dt><dd>£{doctor.fee}, paid at the hospital</dd></div>
      {reason !== undefined && <div><dt>Reason for visit</dt><dd>{reason || <span className="muted">Not given</span>}</dd></div>}
    </dl>
  );
}

export function Booking({ params, query }) {
  const { db, user, book, notify, simulateOtherBooking } = useStore();
  const doctor = db.doctors.find((d) => d.id === params.doctorId);
  const date = query.get('date') || '';
  const time = query.get('time') || '';
  const [reason, setReason] = useState('');
  const [result, setResult] = useState(null);

  if (!doctor) return <div className="page"><Empty title="Doctor not found"><Link to="/doctors">Back to doctors</Link></Empty></div>;

  const precheck = validateBooking(db, { user, doctorId: doctor.id, date, time });
  const error = result && !result.ok ? result : !precheck.ok ? precheck : null;

  const confirmBooking = () => {
    const r = book({ doctorId: doctor.id, date, time, reason });
    setResult(r);
    if (r.ok) {
      notify(`Booked. Confirmation sent to ${user.email}.`);
      navigate(`/confirmation/${r.appt.id}`, { replace: true });
    }
  };

  return (
    <div className="page narrow">
      <Link to={`/doctors/${doctor.id}`} className="back">Back to {doctor.name}</Link>
      <h1>Review and confirm</h1>
      <ol className="progress" aria-label="Booking steps">
        <li className="done">Doctor</li><li className="done">Time</li><li className="current" aria-current="step">Confirm</li>
      </ol>
      {error && (
        <Alert rule={error.rule}>
          {error.error} {(error.rule === 'BR-02' || error.rule === 'BR-04' || error.rule === 'BR-09') && <Link to={`/doctors/${doctor.id}`}>Choose another time</Link>}
        </Alert>
      )}
      {(date && time) && <Summary doctor={doctor} date={date} time={time} />}
      <div className="field">
        <label htmlFor="reason">Reason for visit <span className="muted">(optional)</span></label>
        <textarea id="reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Briefly describe your symptoms or the reason for the appointment" />
      </div>
      <div className="actions">
        <button className="btn btn-primary" id="confirm-booking" onClick={confirmBooking} disabled={!precheck.ok}>Confirm booking</button>
        <Link className="btn btn-ghost" to={`/doctors/${doctor.id}`}>Change time</Link>
      </div>
      {precheck.ok && (
        <details className="demo-tools">
          <summary>Demo tools</summary>
          <p className="small muted">Simulate another patient booking this exact slot while you're on this page, then press Confirm to see the double-booking check (FR-21).</p>
          <button className="btn btn-ghost btn-sm" id="simulate-other" onClick={() => { simulateOtherBooking(doctor.id, date, time); setResult(null); }}>Another patient books this slot</button>
        </details>
      )}
    </div>
  );
}

export function Confirmation({ params }) {
  const { db, user } = useStore();
  const appt = db.appointments.find((a) => a.id === params.id);
  if (!appt || (user.role === 'patient' && appt.patientId !== user.id)) {
    return <div className="page"><Empty title="Appointment not found"><Link to="/patient">Go to my appointments</Link></Empty></div>;
  }
  const doctor = db.doctors.find((d) => d.id === appt.doctorId);
  return (
    <div className="page narrow">
      <div className="confirm-head">
        <span className="tick" aria-hidden="true">✓</span>
        <div>
          <h1>{appt.status === 'Booked' ? 'Appointment confirmed' : `Appointment ${appt.status.toLowerCase()}`}</h1>
          <p className="muted">We've sent the details to {user.email}.</p>
        </div>
      </div>
      <Summary doctor={doctor} date={appt.date} time={appt.time} reason={appt.reason} refId={appt.id} />
      <div className="notice">
        <p><strong>Before you come:</strong> arrive 10 minutes early and bring photo ID. You can cancel or reschedule online up to {CANCEL_CUTOFF_HOURS} hours before the appointment.</p>
      </div>
      <div className="actions">
        <Link className="btn btn-primary" to="/patient">Go to my appointments</Link>
        <Link className="btn btn-ghost" to="/doctors">Book another</Link>
      </div>
    </div>
  );
}

function ApptRow({ a, doctor, onCancel, canChange }) {
  return (
    <li className="appt" data-id={a.id}>
      <div className="appt-when">
        <span className="aw-day">{parseDateTime(a.date, a.time).getDate()}</span>
        <span className="aw-month">{parseDateTime(a.date, a.time).toLocaleDateString('en-GB', { month: 'short' })}</span>
      </div>
      <div className="appt-main">
        <p className="appt-title">{doctor.name} <StatusBadge status={a.status} /></p>
        <p className="muted">{doctor.specialization} · {formatDate(a.date)} at {formatTime(a.time)} · <span className="ref">{a.id}</span></p>
        {a.history.length > 0 && <p className="small muted">Rescheduled from {a.history.at(-1).from.replace(' ', ' at ')}</p>}
        {!canChange.ok && a.status === 'Booked' && !isPast(a.date, a.time) && <p className="small warn">{canChange.error}</p>}
      </div>
      <div className="appt-actions">
        <Link className="btn btn-ghost btn-sm" to={`/confirmation/${a.id}`}>Details</Link>
        {a.status === 'Booked' && !isPast(a.date, a.time) && (
          <>
            <button className="btn btn-ghost btn-sm" disabled={!canChange.ok} onClick={() => navigate(`/reschedule/${a.id}`)}>Reschedule</button>
            <button className="btn btn-danger btn-sm" disabled={!canChange.ok} onClick={() => onCancel(a)}>Cancel</button>
          </>
        )}
      </div>
    </li>
  );
}

export function PatientDashboard() {
  const { db, user, cancel, notify } = useStore();
  const [tab, setTab] = useState('upcoming');
  const [toCancel, setToCancel] = useState(null);
  const [cancelError, setCancelError] = useState(null);
  const now = new Date();
  const mine = db.appointments.filter((a) => a.patientId === user.id);
  const upcoming = mine.filter((a) => a.status === 'Booked' && !isPast(a.date, a.time, now))
    .sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
  const past = mine.filter((a) => !upcoming.includes(a))
    .sort((x, y) => (y.date + y.time).localeCompare(x.date + x.time));
  const list = tab === 'upcoming' ? upcoming : past;
  const doc = (id) => db.doctors.find((d) => d.id === id);

  const doCancel = () => {
    const r = cancel(toCancel.id);
    if (!r.ok) return setCancelError(r);
    notify(`Appointment ${toCancel.id} cancelled. The slot is now free for other patients.`);
    setToCancel(null);
  };

  return (
    <div className="page">
      <header className="page-head row">
        <div>
          <h1>My appointments</h1>
          <p className="muted">Hello {user.name.split(' ')[0]}. You have {upcoming.length} upcoming appointment{upcoming.length === 1 ? '' : 's'}.</p>
        </div>
        <Link className="btn btn-primary" to="/doctors">Book an appointment</Link>
      </header>
      <Tabs tabs={[{ id: 'upcoming', label: 'Upcoming', count: upcoming.length }, { id: 'past', label: 'Past & cancelled', count: past.length }]} active={tab} onChange={setTab} />
      {list.length === 0 ? (
        <Empty title={tab === 'upcoming' ? 'No upcoming appointments' : 'No past appointments'}>
          {tab === 'upcoming' && <Link className="btn btn-primary" to="/doctors">Find a doctor</Link>}
        </Empty>
      ) : (
        <ul className="appt-list">
          {list.map((a) => <ApptRow key={a.id} a={a} doctor={doc(a.doctorId)} onCancel={(x) => { setCancelError(null); setToCancel(x); }} canChange={validateCancel(a, user, now)} />)}
        </ul>
      )}
      {toCancel && (
        <Modal
          title="Cancel this appointment?"
          onClose={() => setToCancel(null)}
          actions={<>
            <button className="btn btn-danger" id="confirm-cancel" onClick={doCancel}>Cancel appointment</button>
            <button className="btn btn-ghost" onClick={() => setToCancel(null)}>Keep appointment</button>
          </>}
        >
          {cancelError && <Alert rule={cancelError.rule}>{cancelError.error}</Alert>}
          <p>{doc(toCancel.doctorId).name}, {formatDate(toCancel.date)} at {formatTime(toCancel.time)} ({toCancel.id}).</p>
          <p className="muted">The time will be released for other patients straight away. This can't be undone.</p>
        </Modal>
      )}
    </div>
  );
}

export function Reschedule({ params }) {
  const { db, user, reschedule, notify } = useStore();
  const appt = db.appointments.find((a) => a.id === params.id);
  const [pick, setPick] = useState(null);
  const [error, setError] = useState(null);
  if (!appt || (user.role === 'patient' && appt.patientId !== user.id)) {
    return <div className="page"><Empty title="Appointment not found"><Link to="/patient">Go to my appointments</Link></Empty></div>;
  }
  const doctor = db.doctors.find((d) => d.id === appt.doctorId);
  const back = user.role === 'admin' ? '/admin?tab=appointments' : '/patient';
  const can = validateCancel(appt, user);

  const submit = () => {
    const r = reschedule(appt.id, pick.date, pick.time);
    if (!r.ok) return setError(r);
    notify(`Rescheduled ${appt.id} to ${formatDate(pick.date)}, ${formatTime(pick.time)}. The old time has been released.`);
    navigate(user.role === 'admin' ? back : `/confirmation/${appt.id}`);
  };

  return (
    <div className="page">
      <Link to={back} className="back">Back</Link>
      <h1>Reschedule appointment</h1>
      <p className="muted">{appt.id} with {doctor.name}. Currently <strong>{formatDate(appt.date)} at {formatTime(appt.time)}</strong>. To see a different doctor, cancel and book again.</p>
      {!can.ok && <Alert rule={can.rule}>{can.error}</Alert>}
      {error && <Alert rule={error.rule}>{error.error}</Alert>}
      {can.ok && (
        <>
          <SlotPicker doctorId={doctor.id} value={pick} onChange={(p) => { setPick(p); setError(null); }} current={{ date: appt.date, time: appt.time }} />
          <div className="book-bar">
            <p>{pick ? <>New time: <strong>{formatDate(pick.date)}, {formatTime(pick.time)}</strong></> : <span className="muted">Select a new available time.</span>}</p>
            <button className="btn btn-primary" id="confirm-reschedule" disabled={!pick} onClick={submit}>Confirm new time</button>
          </div>
        </>
      )}
    </div>
  );
}

