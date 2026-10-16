// Minimal hash router: works from GitHub Pages or straight from the file system.
import { useEffect, useState } from 'react';

function read() {
  const raw = window.location.hash.slice(1) || '/';
  const [path, qs] = raw.split('?');
  return { path, query: new URLSearchParams(qs || '') };
}

/** Re-renders on hash change and always returns the *current* hash, so a
 *  navigate() followed by a state change in the same tick is seen consistently. */
export function useLocation() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => { setTick((n) => n + 1); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return read();
}

export function navigate(to, { replace = false } = {}) {
  if (replace) window.location.replace(`#${to}`);
  else window.location.hash = to;
}

/** match('/doctors/:id', '/doctors/d1') -> { id: 'd1' } | null */
export function match(pattern, path) {
  const p = pattern.split('/').filter(Boolean);
  const s = path.split('/').filter(Boolean);
  if (p.length !== s.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i]);
    else if (p[i] !== s[i]) return null;
  }
  return params;
}

export function Link({ to, children, ...rest }) {
  return <a href={`#${to}`} {...rest}>{children}</a>;
}
