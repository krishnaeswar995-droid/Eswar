# Prototype — St Hilda's Appointments

Clickable, responsive frontend for the Hospital Appointment Booking System. React 19, bundled with esbuild, mock data in local storage. No backend.

## Run

```bash
npm install
npm run dev      # dev server with rebuild on save: http://localhost:5173
npm run build    # production bundle in dist/ (committed, so dist/index.html opens without installing)
npm test         # business-rule unit tests (node:test)
npm run test:e2e # 38 end-to-end cases; first: npx playwright install chromium && npm run build
```

## Code map

| Path | Responsibility |
|---|---|
| `src/lib/rules.js` | Every business rule (BR-01 – BR-16) as a pure validator returning `{ ok }` or `{ ok: false, rule, error }` |
| `src/lib/store.jsx` | App state and actions (login, book, cancel, reschedule, availability, admin). Each action validates with `rules.js` before changing data, and writes an audit entry |
| `src/lib/dates.js` | Slot length, working hours, horizon, cut-off constants and date helpers |
| `src/lib/router.jsx` | Tiny hash router so the app works from GitHub Pages or the file system |
| `src/data/mockData.js` | Seed data generated relative to today, so there are always upcoming, today's and past appointments |
| `src/App.jsx` | Route table and role-based guards (FR-05) |
| `src/components/SlotPicker.jsx` | Date strip + time grid shared by booking and rescheduling |
| `src/pages/` | Auth, doctor search/profile, patient booking and dashboard, doctor dashboard, admin dashboard |
| `tests/rules.test.js` | Unit tests with a fixed clock |
| `tests/e2e.mjs` | Playwright run of the test-case sheet; writes `../docs/testing/results.json` |

## Design notes

- Slot availability is derived (`published && future && not booked`), never stored twice.
- Blocked actions are disabled with the reason shown, and error messages include the BRD rule ID.
- Typeface: Atkinson Hyperlegible (designed for low-vision readers). Layouts collapse to one column under 600 px; navigation moves behind a Menu button under 860 px.
