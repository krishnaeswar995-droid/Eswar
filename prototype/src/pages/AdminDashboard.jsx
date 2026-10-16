import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { navigate } from '../lib/router.jsx';
import { SPECIALIZATIONS } from '../data/mockData.js';
import { addDays, formatDate, formatTime, isPast, todayISO } from '../lib/dates.js';
import { Alert, Empty, Field, Modal, StatusBadge, Tabs } from '../components/ui.jsx';

const STATUSES = ['Booked', 'Completed', 'Cancelled'];

export default function AdminDashboard({ query }) {
  const tab = query.get('tab') || 'overview';
  return (
    <div className="page wide">
      <header className="page-head"><h1>Hospital administration</h1></header>
      <Tabs
        tabs={['overview', 'appointments', 'doctors', 'patients', 'reports'].map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1) }))}
        active={tab}
        onChange={(t) => navigate(t === 'overview' ? '/admin' : `/admin?tab=${t}`)}
      />
      {tab === 'overview' && <Overview />}
      {tab === 'appointments' && <Appointments />}
      {tab === 'doctors' && <Doctors />}
      {tab === 'patients' && <Patients />}
      {tab === 'reports' && <Reports />}
    </div>
  );
}

function Overview() {
  const { db } = useStore();
  const today = todayISO();
  const todays = db.appointments.filter((a) => a.date === today);
  const next7 = db.appointments.filter((a) => a.status === 'Booked' && a.date >= today && a.date <= addDays(today, 7));
  const perDoctor = db.doctors.map((d) => ({ d, n: next7.filter((a) => a.doctorId === d.id).length })).sort((a, b) => b.n - a.n);
  const maxN = Math.max(1, ...perDoctor.map((x) => x.n));
  return (
    <>
      <div className="stats">
        <div className="stat"><span className="stat-n">{todays.filter((a) => a.status === 'Booked').length}</span><span>booked today</span></div>
        <div className="stat"><span className="stat-n">{todays.filter((a) => a.status === 'Completed').length}</span><span>completed today</span></div>
        <div className="stat"><span className="stat-n">{todays.filter((a) => a.status === 'Cancelled').length}</span><span>cancelled today</span></div>
        <div className="stat"><span className="stat-n">{next7.length}</span><span>booked, next 7 days</span></div>
      </div>
      <div className="two-panel">
        <section className="panel">
          <h2>Bookings per doctor, next 7 days</h2>
          <ul className="bars">
            {perDoctor.map(({ d, n }) => (
              <li key={d.id}>
                <span className="bar-label">{d.name}{!d.active && <small> (inactive)</small>}</span>
                <span className="bar"><span style={{ width: `${(n / maxN) * 100}%` }} /></span>
                <span className="bar-n">{n}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2>Recent activity</h2>
          {db.audit.length === 0 ? <p className="muted">Actions taken in this demo appear here (audit log, FR-57).</p> : (
            <ul className="audit">
              {db.audit.slice(0, 8).map((e, i) => (
                <li key={i}><strong>{e.action}</strong> {e.detail}<small>{e.actor} · {new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</small></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Appointments() {
  const { db, cancel, notify } = useStore();
  const [from, setFrom] = useState(addDays(todayISO(), -7));
  const [to, setTo] = useState(addDays(todayISO(), 14));
  const [doctor, setDoctor] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [toCancel, setToCancel] = useState(null);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState(null);
  const pName = (id) => db.users.find((u) => u.id === id)?.name || '';
  const dName = (id) => db.doctors.find((d) => d.id === id)?.name || '';

  const rows = db.appointments
    .filter((a) => (!from || a.date >= from) && (!to || a.date <= to))
    .filter((a) => !doctor || a.doctorId === doctor)
    .filter((a) => !status || a.status === status)
    .filter((a) => !q.trim() || pName(a.patientId).toLowerCase().includes(q.toLowerCase()) || a.id.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const doCancel = () => {
    const r = cancel(toCancel.id, reason);
    if (!r.ok) return setErr(r);
    notify(`${toCancel.id} cancelled and slot released.`);
    setToCancel(null); setReason(''); setErr(null);
  };

  return (
    <>
      <div className="filters">
        <div className="filter"><label htmlFor="a-from">From</label><input id="a-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="filter"><label htmlFor="a-to">To</label><input id="a-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="filter"><label htmlFor="a-doc">Doctor</label>
          <select id="a-doc" value={doctor} onChange={(e) => setDoctor(e.target.value)}><option value="">All doctors</option>{db.doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
        <div className="filter"><label htmlFor="a-status">Status</label>
          <select id="a-status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div className="filter grow"><label htmlFor="a-q">Patient or reference</label><input id="a-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Alice or APT-1001" /></div>
      </div>
      <p className="muted small">{rows.length} appointment{rows.length === 1 ? '' : 's'}</p>
      {rows.length === 0 ? <Empty title="No appointments match these filters" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Ref</th><th>Date & time</th><th>Patient</th><th>Doctor</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((a) => {
                const live = a.status === 'Booked' && !isPast(a.date, a.time);
                return (
                  <tr key={a.id} data-id={a.id}>
                    <td className="ref">{a.id}</td>
                    <td className="nowrap">{formatDate(a.date, { year: false })}, {formatTime(a.time)}</td>
                    <td>{pName(a.patientId)}</td>
                    <td>{dName(a.doctorId)}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="row-actions">
                      {live && <>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/reschedule/${a.id}`)}>Reschedule</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setErr(null); setToCancel(a); }}>Cancel</button>
                      </>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {toCancel && (
        <Modal title="Cancel appointment" onClose={() => setToCancel(null)} actions={<>
          <button className="btn btn-danger" id="admin-confirm-cancel" onClick={doCancel}>Cancel appointment</button>
          <button className="btn btn-ghost" onClick={() => setToCancel(null)}>Keep</button>
        </>}>
          <p>{toCancel.id}: {pName(toCancel.patientId)} with {dName(toCancel.doctorId)}, {formatDate(toCancel.date)} at {formatTime(toCancel.time)}.</p>
          {err && <Alert rule={err.rule}>{err.error}</Alert>}
          <Field label="Reason (shared with the patient)" id="admin-reason"><textarea id="admin-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Patient called to cancel" /></Field>
        </Modal>
      )}
    </>
  );
}

const blankDoctor = { name: '', email: '', specialization: SPECIALIZATIONS[0], fee: '', experience: '', qualifications: '', languages: 'English', bio: '' };

function Doctors() {
  const { db, updateDoctor, addDoctor, notify } = useStore();
  const [editing, setEditing] = useState(null); // {mode:'add'|'edit', f}
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const futureCount = (id) => db.appointments.filter((a) => a.doctorId === id && a.status === 'Booked' && !isPast(a.date, a.time)).length;

  const toggleActive = (d) => {
    if (d.active) {
      const n = futureCount(d.id);
      if (n && !confirm(`${d.name} has ${n} upcoming appointment(s). Deactivating hides them from search and blocks new bookings, but existing appointments must be cancelled or moved separately. Continue?`)) return;
    }
    updateDoctor(d.id, { active: !d.active });
    notify(`${d.name} ${d.active ? 'deactivated' : 'reactivated'}.`);
  };

  const save = () => {
    const f = editing.f;
    const e = {};
    if (f.name.trim().length < 4) e.name = 'Enter the doctor\'s full name, e.g. Dr Jane Smith.';
    if (editing.mode === 'add' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email.';
    if (!(Number(f.fee) > 0)) e.fee = 'Enter a fee greater than 0.';
    if (f.experience === '' || Number(f.experience) < 0) e.experience = 'Enter years of experience.';
    if (!f.qualifications.trim()) e.qualifications = 'Enter qualifications.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const payload = { name: f.name.trim(), specialization: f.specialization, fee: Number(f.fee), experience: Number(f.experience), qualifications: f.qualifications.trim(), languages: String(f.languages).split(',').map((s) => s.trim()).filter(Boolean), bio: f.bio.trim() };
    if (editing.mode === 'add') {
      const r = addDoctor({ ...payload, email: f.email.trim() });
      if (!r.ok) return setFormError(r.error);
      notify(`${payload.name} added. They can log in with ${f.email} / Doctor@123.`);
    } else {
      updateDoctor(editing.id, payload);
      notify(`${payload.name} updated.`);
    }
    setEditing(null);
  };

  const set = (k) => (e) => setEditing({ ...editing, f: { ...editing.f, [k]: e.target.value } });

  return (
    <>
      <div className="actions"><button className="btn btn-primary" onClick={() => { setErrors({}); setFormError(''); setEditing({ mode: 'add', f: blankDoctor }); }}>Add doctor</button></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Specialization</th><th>Fee</th><th>Upcoming</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {db.doctors.map((d) => (
              <tr key={d.id} data-id={d.id}>
                <td>{d.name}</td><td>{d.specialization}</td><td>£{d.fee}</td><td>{futureCount(d.id)}</td>
                <td><StatusBadge status={d.active ? 'Active' : 'Inactive'} /></td>
                <td className="row-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => { setErrors({}); setFormError(''); setEditing({ mode: 'edit', id: d.id, f: { ...d, languages: d.languages.join(', ') } }); }}>Edit</button>
                  <button className={`btn btn-sm ${d.active ? 'btn-danger' : 'btn-ghost'}`} onClick={() => toggleActive(d)}>{d.active ? 'Deactivate' : 'Reactivate'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <Modal title={editing.mode === 'add' ? 'Add doctor' : 'Edit doctor'} onClose={() => setEditing(null)} actions={<>
          <button className="btn btn-primary" onClick={save} id="save-doctor">{editing.mode === 'add' ? 'Add doctor' : 'Save changes'}</button>
          <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
        </>}>
          {formError && <Alert>{formError}</Alert>}
          <Field label="Full name" id="d-name" error={errors.name}><input id="d-name" value={editing.f.name} onChange={set('name')} /></Field>
          {editing.mode === 'add' && <Field label="Login email" id="d-email" error={errors.email}><input id="d-email" type="email" value={editing.f.email} onChange={set('email')} /></Field>}
          <div className="two-col">
            <Field label="Specialization" id="d-spec"><select id="d-spec" value={editing.f.specialization} onChange={set('specialization')}>{SPECIALIZATIONS.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Fee (£)" id="d-fee" error={errors.fee}><input id="d-fee" type="number" min="1" value={editing.f.fee} onChange={set('fee')} /></Field>
          </div>
          <div className="two-col">
            <Field label="Experience (years)" id="d-exp" error={errors.experience}><input id="d-exp" type="number" min="0" value={editing.f.experience} onChange={set('experience')} /></Field>
            <Field label="Languages" id="d-lang"><input id="d-lang" value={editing.f.languages} onChange={set('languages')} /></Field>
          </div>
          <Field label="Qualifications" id="d-q" error={errors.qualifications}><input id="d-q" value={editing.f.qualifications} onChange={set('qualifications')} /></Field>
          <Field label="About" id="d-bio"><textarea id="d-bio" rows={2} value={editing.f.bio} onChange={set('bio')} /></Field>
        </Modal>
      )}
    </>
  );
}

function Patients() {
  const { db, setPatientActive, notify } = useStore();
  const patients = db.users.filter((u) => u.role === 'patient');
  const upcoming = (id) => db.appointments.filter((a) => a.patientId === id && a.status === 'Booked' && !isPast(a.date, a.time)).length;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Upcoming</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.id} data-id={p.id}>
              <td>{p.name}</td><td>{p.email}</td><td className="nowrap">{p.mobile}</td><td>{upcoming(p.id)}</td>
              <td><StatusBadge status={p.active ? 'Active' : 'Inactive'} /></td>
              <td className="row-actions">
                <button className={`btn btn-sm ${p.active ? 'btn-danger' : 'btn-ghost'}`} onClick={() => { setPatientActive(p.id, !p.active); notify(`${p.name} ${p.active ? 'deactivated — they can no longer log in' : 'reactivated'}.`); }}>{p.active ? 'Deactivate' : 'Reactivate'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Reports() {
  const { db } = useStore();
  const [from, setFrom] = useState(addDays(todayISO(), -14));
  const [to, setTo] = useState(addDays(todayISO(), 14));
  const invalid = from && to && from > to;
  const rows = useMemo(() => db.appointments.filter((a) => a.date >= from && a.date <= to), [db, from, to]);
  const byDoctor = db.doctors.map((d) => {
    const r = rows.filter((a) => a.doctorId === d.id);
    return { name: d.name, spec: d.specialization, total: r.length, ...Object.fromEntries(STATUSES.map((s) => [s, r.filter((a) => a.status === s).length])) };
  }).filter((x) => x.total > 0);

  const exportCsv = () => {
    const pName = (id) => db.users.find((u) => u.id === id)?.name || '';
    const dName = (id) => db.doctors.find((d) => d.id === id)?.name || '';
    const lines = [['Reference', 'Date', 'Time', 'Patient', 'Doctor', 'Status', 'Reason'],
      ...rows.map((a) => [a.id, a.date, a.time, pName(a.patientId), dName(a.doctorId), a.status, a.reason])]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `appointments_${from}_to_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="filters">
        <div className="filter"><label htmlFor="r-from">From</label><input id="r-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="filter"><label htmlFor="r-to">To</label><input id="r-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="filter end"><button className="btn btn-primary" onClick={exportCsv} disabled={invalid || !rows.length} id="export-csv">Export CSV</button></div>
      </div>
      {invalid ? <Alert>The start date must be on or before the end date.</Alert> : (
        <>
          <div className="stats">
            <div className="stat"><span className="stat-n">{rows.length}</span><span>appointments</span></div>
            {STATUSES.map((s) => <div className="stat" key={s}><span className="stat-n">{rows.filter((a) => a.status === s).length}</span><span>{s.toLowerCase()}</span></div>)}
          </div>
          <p className="muted small">{formatDate(from)} to {formatDate(to)}</p>
          {byDoctor.length === 0 ? <Empty title="No appointments in this period" /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Doctor</th><th>Specialization</th><th>Total</th>{STATUSES.map((s) => <th key={s}>{s}</th>)}</tr></thead>
                <tbody>{byDoctor.map((r) => <tr key={r.name}><td>{r.name}</td><td>{r.spec}</td><td><strong>{r.total}</strong></td>{STATUSES.map((s) => <td key={s}>{r[s]}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
