import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import Viewer from '../components/Viewer';

export default function TimetableEditor() {
  const { id } = useParams();
  const [tt, setTt] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => api(`/timetables/${id}`).then(setTt).catch((e) => setErr(e.message)), [id]);
  useEffect(() => { setTt(null); load(); }, [load]);
  if (err) return <div className="alert err">{err}</div>;
  if (!tt) return <p className="muted">Loading…</p>;
  const publish = async () => { await api(`/timetables/${id}/publish`, { method: 'POST' }); load(); };

  return (
    <section>
      <header className="page-head">
        <div><h2>{tt.name} {tt.is_active ? <span className="tag live">published</span> : null}</h2>
          <p className="muted"><Link to="/timetables">All versions</Link> · {tt.algorithm === 'clone' ? 'copy' : tt.algorithm.toUpperCase()} · fitness {Number(tt.fitness).toFixed(4)} ·
            <b className={tt.conflicts.length ? 'bad-text' : 'ok-text'}> {tt.conflicts.length} hard conflict{tt.conflicts.length === 1 ? '' : 's'}</b> · soft {Number(tt.soft_penalty)}</p></div>
        {!tt.is_active && <button className="btn" onClick={publish}>Publish this version</button>}
      </header>
      {tt.conflicts.length > 0 && <div className="alert err"><b>Conflicts in this version</b><ul>{tt.conflicts.map((c, i) => <li key={i}>{c.message}</li>)}</ul></div>}
      <Viewer tt={tt} editable onChanged={load} />
    </section>
  );
}
