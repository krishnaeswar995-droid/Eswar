import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Link, navigate } from '../lib/router.jsx';
import { SPECIALIZATIONS } from '../data/mockData.js';
import { nextOpenSlot } from '../lib/rules.js';
import { formatDate, formatTime } from '../lib/dates.js';
import { Alert, Avatar, Empty } from '../components/ui.jsx';
import SlotPicker from '../components/SlotPicker.jsx';

export function Home() {
  const [spec, setSpec] = useState('');
  return (
    <div className="home">
      <section className="hero">
        <h1>Book a consultation with a St Hilda's specialist.</h1>
        <p className="lede">See every doctor's real availability, pick a time that suits you, and manage your appointment online — no phone queue.</p>
        <form className="hero-search" onSubmit={(e) => { e.preventDefault(); navigate(`/doctors${spec ? `?spec=${encodeURIComponent(spec)}` : ''}`); }}>
          <label htmlFor="hero-spec" className="sr-only">Specialization</label>
          <select id="hero-spec" value={spec} onChange={(e) => setSpec(e.target.value)}>
            <option value="">All specializations</option>
            {SPECIALIZATIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary" type="submit">Find a doctor</button>
        </form>
      </section>
      <section className="steps" aria-label="How booking works">
        <ol>
          <li><strong>Choose a doctor</strong><span>Filter by specialization and compare fees and experience.</span></li>
          <li><strong>Pick a free slot</strong><span>Only times that are genuinely open can be selected.</span></li>
          <li><strong>Confirm</strong><span>Get a booking reference straight away. Cancel or move it up to 2 hours before.</span></li>
        </ol>
      </section>
    </div>
  );
}

export function DoctorList({ query }) {
  const { db } = useStore();
  const [spec, setSpec] = useState(query.get('spec') || '');
  const [q, setQ] = useState('');
  const now = new Date();

  const list = useMemo(() => db.doctors
    .filter((d) => d.active)
    .filter((d) => !spec || d.specialization === spec)
    .filter((d) => !q.trim() || d.name.toLowerCase().includes(q.trim().toLowerCase()))
    .map((d) => ({ ...d, next: nextOpenSlot(db, d.id, now) })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [db, spec, q]);

  return (
    <div className="page">
      <header className="page-head">
        <h1>Find a doctor</h1>
        <p className="muted">{list.length} doctor{list.length === 1 ? '' : 's'} available to book</p>
      </header>
      <div className="filters">
        <div className="filter">
          <label htmlFor="f-spec">Specialization</label>
          <select id="f-spec" value={spec} onChange={(e) => setSpec(e.target.value)}>
            <option value="">All specializations</option>
            {SPECIALIZATIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="filter grow">
          <label htmlFor="f-name">Doctor name</label>
          <input id="f-name" type="search" placeholder="e.g. Raman" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {list.length === 0 ? (
        <Empty title="No doctors found">
          <p>No active doctor matches these filters.</p>
          <button className="btn btn-ghost" onClick={() => { setSpec(''); setQ(''); }}>Clear filters</button>
        </Empty>
      ) : (
        <ul className="doctor-list">
          {list.map((d) => (
            <li key={d.id} className="doctor-card">
              <Avatar name={d.name} />
              <div className="dc-main">
                <h2><Link to={`/doctors/${d.id}`}>{d.name}</Link></h2>
                <p className="dc-spec">{d.specialization} · {d.experience} years</p>
                <p className="muted small">{d.qualifications}</p>
              </div>
              <div className="dc-side">
                <p className="fee">£{d.fee}<small>per consultation</small></p>
                <p className="next">
                  {d.next ? <>Next free: <strong>{formatDate(d.next.date, { year: false })}, {formatTime(d.next.time)}</strong></> : <span className="muted">No free slots in the next 30 days</span>}
                </p>
                <Link className="btn btn-primary btn-sm" to={`/doctors/${d.id}`}>View & book</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DoctorProfile({ params }) {
  const { db, user } = useStore();
  const doctor = db.doctors.find((d) => d.id === params.id);
  const [pick, setPick] = useState(null);

  if (!doctor || !doctor.active) {
    return (
      <div className="page">
        <Empty title="Doctor not available">
          <p>This doctor isn't taking bookings at the moment.</p>
          <Link className="btn btn-ghost" to="/doctors">Back to doctors</Link>
        </Empty>
      </div>
    );
  }

  const book = () => {
    const target = `/book/${doctor.id}?date=${pick.date}&time=${pick.time}`;
    if (!user) navigate(`/login?redirect=${encodeURIComponent(target)}`);
    else navigate(target);
  };

  return (
    <div className="page">
      <Link to="/doctors" className="back">Back to doctors</Link>
      <div className="profile">
        <section className="profile-info">
          <Avatar name={doctor.name} size={72} />
          <h1>{doctor.name}</h1>
          <p className="dc-spec">{doctor.specialization}</p>
          <dl className="facts">
            <div><dt>Consultation fee</dt><dd>£{doctor.fee}</dd></div>
            <div><dt>Experience</dt><dd>{doctor.experience} years</dd></div>
            <div><dt>Qualifications</dt><dd>{doctor.qualifications}</dd></div>
            <div><dt>Languages</dt><dd>{doctor.languages.join(', ')}</dd></div>
          </dl>
          <p className="bio">{doctor.bio}</p>
          <p className="muted small">Fee is paid at the hospital on the day.</p>
        </section>
        <section className="profile-slots" aria-labelledby="slots-h">
          <h2 id="slots-h">Choose a time</h2>
          {user && user.role !== 'patient' && <Alert tone="info">You're logged in as {user.role}. Only patients can book appointments.</Alert>}
          <SlotPicker doctorId={doctor.id} value={pick} onChange={setPick} />
          <div className="book-bar">
            <p>{pick ? <>Selected: <strong>{formatDate(pick.date)}, {formatTime(pick.time)}</strong></> : <span className="muted">Select an available time to continue.</span>}</p>
            <button className="btn btn-primary" disabled={!pick || (user && user.role !== 'patient')} onClick={book} id="continue-booking">Continue to book</button>
          </div>
        </section>
      </div>
    </div>
  );
}
