// Date strip + time grid. Shows open slots as selectable; booked and past slots disabled (FR-14).
import { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { addDays, formatTime, parseDateTime, todayISO } from '../lib/dates.js';
import { slotStatus } from '../lib/rules.js';

const DAYS_SHOWN = 14;

export default function SlotPicker({ doctorId, value, onChange, current }) {
  const { db } = useStore();
  const now = new Date();
  const days = useMemo(() => {
    const today = todayISO(now);
    return Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(today, i)).map((date) => {
      const times = (db.availability[doctorId]?.[date] || []).slice().sort();
      const statuses = times.map((t) => slotStatus(db, doctorId, date, t, now));
      const open = statuses.filter((x) => x === 'open').length;
      const label = open ? `${open} free` : !times.length ? 'Closed' : statuses.includes('booked') ? 'Full' : 'Ended';
      return { date, times, open, label };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, doctorId]);

  const firstWithSlots = days.find((d) => d.open > 0)?.date || days[0].date;
  const [activeDate, setActiveDate] = useState(value?.date || firstWithSlots);
  const day = days.find((d) => d.date === activeDate) || days[0];

  return (
    <div className="slot-picker">
      <div className="date-strip" role="listbox" aria-label="Choose a date">
        {days.map((d) => {
          const dt = parseDateTime(d.date, '00:00');
          return (
            <button
              key={d.date}
              role="option"
              aria-selected={d.date === activeDate}
              className={`date-chip ${d.date === activeDate ? 'active' : ''} ${d.open === 0 ? 'none' : ''}`}
              onClick={() => setActiveDate(d.date)}
              data-date={d.date}
            >
              <span className="dc-dow">{dt.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
              <span className="dc-day">{dt.getDate()}</span>
              <span className="dc-month">{dt.toLocaleDateString('en-GB', { month: 'short' })}</span>
              <span className="dc-count">{d.label}</span>
            </button>
          );
        })}
      </div>

      {day.times.length === 0 ? (
        <p className="muted slot-empty">No clinic on this day. Pick another date.</p>
      ) : (
        <div className="time-grid" role="listbox" aria-label="Choose a time">
          {day.times.map((t) => {
            const status = slotStatus(db, doctorId, day.date, t, now);
            const isCurrent = current && current.date === day.date && current.time === t;
            const selected = value && value.date === day.date && value.time === t;
            const disabled = status !== 'open';
            return (
              <button
                key={t}
                role="option"
                aria-selected={!!selected}
                disabled={disabled}
                className={`time-chip ${status} ${selected ? 'selected' : ''} ${isCurrent ? 'current' : ''}`}
                onClick={() => onChange({ date: day.date, time: t })}
                data-time={t}
                title={isCurrent ? 'Your current appointment' : status === 'booked' ? 'Already booked' : status === 'past' ? 'Time has passed' : 'Available'}
              >
                {formatTime(t)}
                {isCurrent && <small>current</small>}
              </button>
            );
          })}
        </div>
      )}
      <ul className="slot-legend" aria-hidden="true">
        <li><span className="lg open" />Available</li>
        <li><span className="lg booked" />Booked</li>
        <li><span className="lg past" />Passed</li>
      </ul>
    </div>
  );
}
