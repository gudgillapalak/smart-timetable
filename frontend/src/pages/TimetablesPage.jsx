import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function TimetablesPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const nav = useNavigate();
  const load = () => api('/timetables').then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const act = async (fn) => { try { await fn(); setErr(''); load(); } catch (e) { setErr(e.message); } };

  return (
    <section>
      <header className="page-head"><div><h2>Timetable versions</h2><p className="muted">Every generated or copied timetable is stored here. Publish one to make it visible to faculty and students.</p></div>
        <Link className="btn primary" to="/generate">Generate new</Link></header>
      {err && <div className="alert err">{err}</div>}
      <div className="table-wrap"><table>
        <thead><tr><th>Name</th><th>Method</th><th>Fitness</th><th>Hard</th><th>Soft</th><th>Time</th><th>Edits</th><th>Created</th><th /></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><Link to={`/timetables/${r.id}`}><b>{r.name}</b></Link> {r.is_active ? <span className="tag live">published</span> : null}</td>
              <td>{r.algorithm === 'clone' ? 'copy' : r.algorithm.toUpperCase()}</td>
              <td>{Number(r.fitness).toFixed(4)}</td>
              <td className={r.hard_conflicts ? 'bad-text' : ''}>{r.hard_conflicts}</td>
              <td>{Number(r.soft_penalty)}</td>
              <td>{r.duration_ms ? r.duration_ms + ' ms' : '—'}</td>
              <td>{r.manual_edits}</td>
              <td>{r.created_at}</td>
              <td className="actions">
                <button className="link" onClick={() => nav(`/timetables/${r.id}`)}>Open</button>
                {!r.is_active && <button className="link" onClick={() => act(() => api(`/timetables/${r.id}/publish`, { method: 'POST' }))}>Publish</button>}
                <button className="link" onClick={() => act(async () => { const n = prompt('Name for the copy?', `${r.name} (copy)`); if (n) await api(`/timetables/${r.id}/clone`, { method: 'POST', body: { name: n } }); })}>Copy</button>
                <button className="link danger" onClick={() => confirm(`Delete "${r.name}"?`) && act(() => api(`/timetables/${r.id}`, { method: 'DELETE' }))}>Delete</button>
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan="9" className="empty">No timetables yet. Generate your first one.</td></tr>}
        </tbody></table></div>
    </section>
  );
}
