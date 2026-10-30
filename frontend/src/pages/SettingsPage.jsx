import { useEffect, useState } from 'react';
import { api, slotLabels } from '../api';

const ALL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SettingsPage() {
  const [c, setC] = useState(null);
  const [msg, setMsg] = useState(null);
  useEffect(() => { api('/settings').then(setC); }, []);
  if (!c) return <p className="muted">Loading…</p>;
  const toggle = (d) => setC({ ...c, days: ALL.filter((x) => (x === d ? !c.days.includes(x) : c.days.includes(x))) });
  const save = async (e) => {
    e.preventDefault();
    try { setC(await api('/settings', { method: 'PUT', body: c })); setMsg({ ok: true, t: 'Saved. New timetables will use this layout.' }); }
    catch (x) { setMsg({ ok: false, t: x.message }); }
  };
  const labels = slotLabels(c);
  return (
    <section>
      <header className="page-head"><div><h2>Days & slots</h2><p className="muted">Defines the weekly grid the generator fills. Saved timetables keep the layout they were made with.</p></div></header>
      <form className="panel narrow" onSubmit={save}>
        <fieldset><legend>Teaching days</legend>
          <div className="chips">{ALL.map((d) => <label key={d} className={`chip ${c.days.includes(d) ? 'on' : ''}`}><input type="checkbox" checked={c.days.includes(d)} onChange={() => toggle(d)} />{d}</label>)}</div>
        </fieldset>
        <div className="grid3">
          <label>Slots per day<input type="number" min="1" max="14" value={c.slotsPerDay} onChange={(e) => setC({ ...c, slotsPerDay: Number(e.target.value) })} /></label>
          <label>First slot starts<input type="time" value={c.startTime} onChange={(e) => setC({ ...c, startTime: e.target.value })} /></label>
          <label>Minutes per slot<input type="number" min="15" max="240" step="5" value={c.slotMinutes} onChange={(e) => setC({ ...c, slotMinutes: Number(e.target.value) })} /></label>
        </div>
        <p className="muted small">Slots: {labels.join(' · ')}</p>
        {msg && <div className={`alert ${msg.ok ? 'ok' : 'err'}`}>{msg.t}</div>}
        <button className="btn primary">Save</button>
      </form>
    </section>
  );
}
