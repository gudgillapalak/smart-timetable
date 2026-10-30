import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Convergence from '../components/Convergence';

export default function GeneratePage() {
  const [algos, setAlgos] = useState(null);
  const [algo, setAlgo] = useState('ga');
  const [params, setParams] = useState({});
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState(null);
  const [runs, setRuns] = useState([]);

  useEffect(() => { api('/generate/algorithms').then(setAlgos); }, []);
  useEffect(() => { if (algos) setParams(Object.fromEntries(algos[algo].params.map((p) => [p.key, p.value]))); }, [algos, algo]);
  if (!algos) return <p className="muted">Loading…</p>;

  const run = async () => {
    setBusy(true); setErr(null); setRes(null);
    try {
      const r = await api('/generate', { method: 'POST', body: { algorithm: algo, params, name } });
      setRes(r); setRuns((x) => [r, ...x]);
    } catch (e) { setErr(e); } finally { setBusy(false); }
  };

  return (
    <section>
      <header className="page-head"><div><h2>Generate a timetable</h2><p className="muted">Pick an optimiser, adjust its settings if you like, and run it. Every run is saved as a new version.</p></div></header>

      <div className="algo-pick" role="radiogroup">
        {Object.entries(algos).map(([k, a]) => (
          <button key={k} role="radio" aria-checked={algo === k} className={`algo ${algo === k ? 'on' : ''}`} onClick={() => setAlgo(k)}>
            <b>{k.toUpperCase()}</b><span>{a.label}</span><small>{a.blurb}</small>
          </button>
        ))}
      </div>

      <div className="panel">
        <h3>Parameters <button className="link" onClick={() => setParams(Object.fromEntries(algos[algo].params.map((p) => [p.key, p.value])))}>Reset to defaults</button></h3>
        <div className="grid3">
          {algos[algo].params.map((p) => (
            <label key={p.key}>{p.label}
              <input type="number" min={p.min} max={p.max} step={p.step} value={params[p.key] ?? ''} onChange={(e) => setParams({ ...params, [p.key]: e.target.value === '' ? '' : Number(e.target.value) })} />
            </label>
          ))}
        </div>
        <div className="row end">
          <label className="grow">Version name (optional)<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Semester 5 – draft" /></label>
          <button className="btn primary big" onClick={run} disabled={busy}>{busy ? 'Optimising…' : 'Generate'}</button>
        </div>
      </div>

      {err && (
        <div className="alert err"><b>{err.message}</b>
          {err.data?.details && <ul>{err.data.details.map((d) => <li key={d}>{d}</li>)}</ul>}</div>
      )}

      {res && (
        <div className="panel result">
          <div className="stats">
            <Stat label="Fitness" value={res.fitness.toFixed(4)} note="1 / (1 + cost)" good={res.fitness === 1} />
            <Stat label="Hard conflicts" value={res.hard} good={res.hard === 0} bad={res.hard > 0} />
            <Stat label="Soft penalty" value={res.soft} note="gaps, disliked slots" />
            <Stat label="Time taken" value={res.durationMs >= 1000 ? (res.durationMs / 1000).toFixed(2) + ' s' : res.durationMs + ' ms'} />
            <Stat label="Sessions placed" value={res.sessions} />
          </div>
          <Convergence history={res.history} />
          {res.hard === 0 ? <div className="alert ok">No hard conflicts. Every class has a free teacher, batch and a suitable room.</div> : (
            <div className="alert err"><b>{res.hard} hard conflict{res.hard > 1 ? 's' : ''} remain.</b> Try more generations, a larger population, or fix them by hand in the editor.
              <ul>{res.conflicts.map((c) => <li key={c}>{c}</li>)}</ul></div>
          )}
          <Link className="btn primary" to={`/timetables/${res.id}`}>Open “{res.name}”</Link>
        </div>
      )}

      {runs.length > 1 && (
        <div className="panel"><h3>This session’s runs</h3>
          <table><thead><tr><th>Version</th><th>Algorithm</th><th>Fitness</th><th>Hard</th><th>Soft</th><th>Time</th></tr></thead>
            <tbody>{runs.map((r) => <tr key={r.id}><td><Link to={`/timetables/${r.id}`}>{r.name}</Link></td><td>{r.algorithm.toUpperCase()}</td><td>{r.fitness.toFixed(4)}</td><td>{r.hard}</td><td>{r.soft}</td><td>{r.durationMs} ms</td></tr>)}</tbody></table>
        </div>
      )}
    </section>
  );
}

const Stat = ({ label, value, note, good, bad }) => (
  <div className={`stat ${good ? 'good' : ''} ${bad ? 'bad' : ''}`}><span>{label}</span><b>{value}</b>{note && <small>{note}</small>}</div>
);
