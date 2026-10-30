import { useEffect, useState } from 'react';
import { api, slotLabels } from '../api';

const TOOLS = [['free', 'Available'], ['unavailable', 'Cannot teach'], ['dislike', 'Prefer not to']];

/** Paint-style editor: pick a brush, then click or drag over the week. */
export default function PrefPanel({ facultyId, onSaved }) {
  const [cfg, setCfg] = useState(null);
  const [cells, setCells] = useState({});
  const [tool, setTool] = useState('unavailable');
  const [msg, setMsg] = useState('');
  const [down, setDown] = useState(false);

  useEffect(() => {
    Promise.all([api('/settings'), api(`/faculty/${facultyId}/prefs`)]).then(([c, p]) => {
      const m = {};
      p.unavailable.forEach(([d, s]) => (m[`${d}-${s}`] = 'unavailable'));
      p.dislike.forEach(([d, s]) => (m[`${d}-${s}`] = 'dislike'));
      setCfg(c); setCells(m);
    });
  }, [facultyId]);
  useEffect(() => { const up = () => setDown(false); window.addEventListener('mouseup', up); return () => window.removeEventListener('mouseup', up); }, []);

  if (!cfg) return <p className="muted">Loading…</p>;
  const paint = (k) => setCells((c) => { const n = { ...c }; tool === 'free' ? delete n[k] : (n[k] = tool); return n; });
  const save = async () => {
    const pick = (kind) => Object.entries(cells).filter(([, v]) => v === kind).map(([k]) => k.split('-').map(Number));
    try { await api(`/faculty/${facultyId}/prefs`, { method: 'PUT', body: { unavailable: pick('unavailable'), dislike: pick('dislike') } }); setMsg('Saved.'); onSaved?.(); }
    catch (e) { setMsg(e.message); }
  };
  const labels = slotLabels(cfg);
  return (
    <div>
      <div className="brushes" role="radiogroup" aria-label="Brush">
        {TOOLS.map(([k, l]) => <button key={k} type="button" className={`brush ${k} ${tool === k ? 'on' : ''}`} onClick={() => setTool(k)}>{l}</button>)}
      </div>
      <div className="pref-grid" style={{ gridTemplateColumns: `64px repeat(${cfg.days.length}, 1fr)` }}>
        <span />{cfg.days.map((d) => <b key={d}>{d}</b>)}
        {labels.map((t, s) => (
          <div className="pref-row" key={s} style={{ display: 'contents' }}>
            <span className="time">{t}</span>
            {cfg.days.map((_, d) => {
              const k = `${d}-${s}`;
              return <button type="button" key={k} className={`pcell ${cells[k] || ''}`} aria-label={`${cfg.days[d]} ${t} ${cells[k] || 'available'}`}
                onMouseDown={() => { setDown(true); paint(k); }} onMouseEnter={() => down && paint(k)} />;
            })}
          </div>
        ))}
      </div>
      <p className="muted small">“Cannot teach” is a hard rule the generator never breaks. “Prefer not to” is a soft wish it tries to respect.</p>
      <div className="row"><button className="btn primary" onClick={save}>Save availability</button><span className="muted">{msg}</span></div>
    </div>
  );
}
