import { useEffect } from 'react';
import { useStore } from './lib/store.jsx';
import { match, navigate, useLocation } from './lib/router.jsx';
import { homeFor } from './lib/rules.js';
import Layout from './components/Layout.jsx';
import { Empty } from './components/ui.jsx';
import { Login, Register } from './pages/Auth.jsx';
import { DoctorList, DoctorProfile, Home } from './pages/Doctors.jsx';
import { Booking, Confirmation, PatientDashboard, Reschedule } from './pages/Patient.jsx';
import DoctorDashboard from './pages/DoctorDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

// roles: undefined = public; array = roles allowed (FR-05 role-based access).
const ROUTES = [
  { path: '/', page: Home },
  { path: '/login', page: Login, guestOnly: true },
  { path: '/register', page: Register, guestOnly: true },
  { path: '/doctors', page: DoctorList },
  { path: '/doctors/:id', page: DoctorProfile },
  { path: '/book/:doctorId', page: Booking, roles: ['patient'] },
  { path: '/confirmation/:id', page: Confirmation, roles: ['patient', 'admin'] },
  { path: '/patient', page: PatientDashboard, roles: ['patient'] },
  { path: '/reschedule/:id', page: Reschedule, roles: ['patient', 'admin'] },
  { path: '/doctor', page: DoctorDashboard, roles: ['doctor'] },
  { path: '/admin', page: AdminDashboard, roles: ['admin'] },
];

function resolve(path) {
  for (const r of ROUTES) {
    const params = match(r.path, path);
    if (params) return { route: r, params };
  }
  return null;
}

export default function App() {
  const { path, query } = useLocation();
  const { user, notify } = useStore();
  const found = resolve(path);

  // Guards run as an effect so the redirect happens once per navigation.
  const raw = window.location.hash.slice(1) || '/';
  let redirect = null;
  if (found?.route.guestOnly && user) {
    // Return a patient to the booking they started before logging in (FR-24).
    const back = query.get('redirect');
    redirect = back && user.role === 'patient' ? back : homeFor(user);
  }
  else if (found?.route.roles && !user) redirect = `/login?redirect=${encodeURIComponent(raw)}`;
  else if (found?.route.roles && !found.route.roles.includes(user.role)) redirect = homeFor(user);

  useEffect(() => {
    if (!redirect) return;
    if (user && found?.route.roles) notify('You do not have access to that page.', 'error');
    navigate(redirect, { replace: true });
  }, [redirect]); // eslint-disable-line react-hooks/exhaustive-deps

  let content;
  if (redirect) content = null;
  else if (!found) content = <div className="page"><Empty title="Page not found"><a className="btn btn-ghost" href="#/">Go to home</a></Empty></div>;
  else {
    const Page = found.route.page;
    content = <Page key={path} params={found.params} query={query} />;
  }
  return <Layout path={path}>{content}</Layout>;
}
