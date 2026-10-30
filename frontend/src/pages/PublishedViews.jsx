import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { api } from '../api';
import Viewer from '../components/Viewer';
import PrefPanel from '../components/PrefPanel';

/** mode="mine": a faculty member's own timetable. mode="student": read-only batch view. */
export function PublishedView({ mode }) {
  const { user } = useAuth();
  const [tt, setTt] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/timetables/active').then(setTt).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="alert err">{err} Ask an administrator to publish a version.</div>;
  if (!tt) return <p className="muted">Loading…</p>;
  const mine = mode === 'mine';
  return (
    <section>
      <header className="page-head"><div><h2>{mine ? 'My timetable' : 'Student timetable'}</h2><p className="muted">{tt.name} · read only</p></div></header>
      {mine ? <Viewer tt={tt} fixed={{ view: 'faculty', id: user.faculty_id }} />
        : <Viewer tt={{ ...tt, conflicts: [] }} views={['batch']} />}
    </section>
  );
}

export function MyAvailability() {
  const { user } = useAuth();
  return (
    <section>
      <header className="page-head"><div><h2>My availability</h2><p className="muted">Mark when you cannot teach and when you would rather not. The next timetable that is generated will respect it.</p></div></header>
      <div className="panel">{user.faculty_id ? <PrefPanel facultyId={user.faculty_id} /> : <p>Your login is not linked to a faculty profile.</p>}</div>
    </section>
  );
}
