import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Link, navigate } from '../lib/router.jsx';
import { homeFor } from '../lib/rules.js';
import { DEMO_ACCOUNTS } from '../data/mockData.js';
import { Alert, Field } from '../components/ui.jsx';
import { todayISO } from '../lib/dates.js';

export function Login({ query }) {
  const { login } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const redirect = query.get('redirect');

  const submit = (e) => {
    e.preventDefault();
    if (!email || !password) return setError('Enter your email and password.');
    const r = login(email, password);
    if (!r.ok) return setError(r.error);
    navigate(redirect && r.user.role === 'patient' ? redirect : homeFor(r.user), { replace: true });
  };

  return (
    <div className="auth">
      <section className="auth-card">
        <h1>Log in</h1>
        {redirect && <Alert tone="info">Log in as a patient to finish booking. You'll come straight back to your chosen slot.</Alert>}
        {error && <Alert>{error}</Alert>}
        <form onSubmit={submit} noValidate>
          <Field label="Email" id="login-email">
            <input id="login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" id="login-password">
            <input id="login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <button className="btn btn-primary btn-block" type="submit">Log in</button>
        </form>
        <p className="auth-switch">New patient? <Link to={`/register${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}>Create an account</Link></p>
      </section>
      <aside className="demo-accounts" aria-label="Demo accounts">
        <h2>Demo accounts</h2>
        <p className="muted">Pick a role to fill in the form.</p>
        {DEMO_ACCOUNTS.map((a) => (
          <button key={a.email} className="demo-acc" onClick={() => { setEmail(a.email); setPassword(a.password); setError(''); }}>
            <strong>{a.role}</strong>
            <span>{a.email}</span>
            <code>{a.password}</code>
          </button>
        ))}
        <p className="muted small">Other patients: ben@demo.com, chloe@demo.com. Every doctor logs in as firstname.lastname@hospital.demo / Doctor@123.</p>
      </aside>
    </div>
  );
}

export function Register({ query }) {
  const { register } = useStore();
  const [f, setF] = useState({ name: '', email: '', mobile: '', dob: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address, like name@example.com.';
    if (!/^[0-9+\s]{10,15}$/.test(f.mobile.trim())) e.mobile = 'Enter a mobile number of 10–15 digits.';
    if (!f.dob) e.dob = 'Enter your date of birth.';
    else if (f.dob >= todayISO()) e.dob = 'Date of birth must be in the past.';
    if (f.password.length < 8 || !/\d/.test(f.password)) e.password = 'Use at least 8 characters including a number.';
    if (f.confirm !== f.password) e.confirm = 'Passwords do not match.';
    return e;
  };

  const submit = (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length) return;
    const r = register(f);
    if (!r.ok) {
      if (r.field) setErrors({ [r.field]: r.error });
      else setFormError(r.error);
      return;
    }
    const redirect = query.get('redirect');
    navigate(redirect || '/patient', { replace: true });
  };

  return (
    <div className="auth">
      <section className="auth-card">
        <h1>Create a patient account</h1>
        <p className="muted">Doctor and staff accounts are set up by the hospital.</p>
        {formError && <Alert>{formError}</Alert>}
        <form onSubmit={submit} noValidate>
          <Field label="Full name" id="r-name" error={errors.name}><input id="r-name" value={f.name} onChange={set('name')} autoComplete="name" /></Field>
          <Field label="Email" id="r-email" error={errors.email}><input id="r-email" type="email" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
          <div className="two-col">
            <Field label="Mobile number" id="r-mobile" error={errors.mobile}><input id="r-mobile" type="tel" value={f.mobile} onChange={set('mobile')} autoComplete="tel" /></Field>
            <Field label="Date of birth" id="r-dob" error={errors.dob}><input id="r-dob" type="date" value={f.dob} onChange={set('dob')} max={todayISO()} /></Field>
          </div>
          <Field label="Password" id="r-pass" error={errors.password} hint="At least 8 characters including a number."><input id="r-pass" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" /></Field>
          <Field label="Confirm password" id="r-confirm" error={errors.confirm}><input id="r-confirm" type="password" value={f.confirm} onChange={set('confirm')} autoComplete="new-password" /></Field>
          <button className="btn btn-primary btn-block" type="submit">Create account</button>
        </form>
        <p className="auth-switch">Already registered? <Link to="/login">Log in</Link></p>
      </section>
    </div>
  );
}
