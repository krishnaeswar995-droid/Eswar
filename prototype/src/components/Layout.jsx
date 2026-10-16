import { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Link, navigate } from '../lib/router.jsx';
import { homeFor } from '../lib/rules.js';
import { Toast } from './ui.jsx';

const NAV = {
  guest: [{ to: '/doctors', label: 'Find a doctor' }],
  patient: [{ to: '/doctors', label: 'Find a doctor' }, { to: '/patient', label: 'My appointments' }],
  doctor: [{ to: '/doctor', label: 'My schedule' }, { to: '/doctor?tab=availability', label: 'Availability' }, { to: '/doctor?tab=profile', label: 'Profile' }],
  admin: [{ to: '/admin', label: 'Overview' }, { to: '/admin?tab=appointments', label: 'Appointments' }, { to: '/admin?tab=doctors', label: 'Doctors' }, { to: '/admin?tab=patients', label: 'Patients' }, { to: '/admin?tab=reports', label: 'Reports' }],
};

export default function Layout({ children, path }) {
  const { user, logout, resetDemo } = useStore();
  const [open, setOpen] = useState(false);
  const items = NAV[user?.role || 'guest'];
  const current = `${path}${window.location.hash.includes('?') ? `?${window.location.hash.split('?')[1]}` : ''}`;

  return (
    <div className="app">
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to={user ? homeFor(user) : '/'} className="brand" aria-label="St Hilda's Hospital home">
            <span className="brand-mark" aria-hidden="true">+</span>
            <span>St Hilda's <em>Appointments</em></span>
          </Link>
          <button className="menu-btn" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen(!open)}>Menu</button>
          <nav id="main-nav" className={open ? 'open' : ''} onClick={() => setOpen(false)}>
            {items.map((i) => (
              <Link key={i.to} to={i.to} className={current === i.to ? 'active' : ''}>{i.label}</Link>
            ))}
            {user ? (
              <span className="who">
                <span className="who-name">{user.name}<small>{user.role}</small></span>
                <button className="btn btn-ghost btn-sm" onClick={() => { navigate('/login'); logout(); }}>Log out</button>
              </span>
            ) : (
              <span className="who">
                <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
              </span>
            )}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>{children}</main>
      <footer className="footer">
        <span>Prototype with mock data — no real appointments are made.</span>
        <button className="linklike" onClick={() => { if (confirm('Reset all demo data and log out?')) { resetDemo(); navigate('/'); } }}>Reset demo data</button>
      </footer>
      <Toast />
    </div>
  );
}
