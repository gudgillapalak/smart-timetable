import { useMemo, useState } from 'react';
import { api, slotLabels } from '../api';
import { buildGrid, exportExcel, exportPdf, VIEWS } from './exporters';

/**
 * Grid viewer used by every role.
 * fixed={{view,id}} locks it to one entity (faculty "my timetable"); views limits the tabs.
 * editable enables drag-and-drop with instant conflict preview (admin only).
 */
export default function Viewer({ tt, views = ['batch', 'faculty', 'room'], fixed, editable, onChanged }) {
  const [view, setView] = useState(fixed?.view || views[0]);
  const list = tt.entities[view === 'batch' ? 'batches' : view === 'faculty' ? 'faculty' : 'rooms'];
  const [sel, setSel] = useState({});
  const id = fixed ? fixed.id : sel[view] ?? list[0]?.id;
  const entity = list.find((e) => e.id === id);
  const grid = useMemo(() => buildGrid(tt, view, id), [tt, view, id]);
  const labels = slotLabels(tt.config);
  const bad = useMemo(() => new Set(tt.conflicts.flatMap((c) => c.sessionIds)), [tt]);

  const [drag, setDrag] = useState(null);
  const [moves, setMoves] = useState(null);
  const [hover, setHover] = useState(null);
  const [toast, setToast] = useState(null);
  const [scope, setScope] = useState('this');

  const startDrag = async (s) => {
    setDrag(s); setMoves(null); setHover(null);
    try { setMoves(await api(`/timetables/${tt.id}/sessions/${s.id}/moves`)); } catch { /* server re-checks on drop */ }
  };
  const endDrag = () => { setDrag(null); setMoves(null); setHover(null); };
  const drop = async (d, c) => {
    const s = drag; endDrag();
    if (!s || (s.day === d && s.slot === c)) return;
    const info = moves?.[`${d}-${c}`];
    const body = { day: d, slot: c, roomId: info?.roomId ?? s.room_id };
    try {
      const r = await api(`/timetables/${tt.id}/sessions/${s.id}/move`, { method: 'POST', body });
      setToast({ ok: true, t: r.soft.length ? `Moved. Preference note: ${r.soft[0]}` : `Moved ${s.subject_code} to ${tt.config.days[d]} ${labels[c]}.` });
      onChanged();
    } catch (e) {
      if (e.status === 409) {
        if (confirm(`This move breaks hard constraints:\n\n• ${e.data.hard.join('\n• ')}\n\nMove it anyway?`)) {
          await api(`/timetables/${tt.id}/sessions/${s.id}/move`, { method: 'POST', body: { ...body, force: true } });
          setToast({ ok: false, t: 'Moved with conflicts. They are highlighted in red.' }); onChanged();
        }
      } else setToast({ ok: false, t: e.message });
    }
  };

  const saveCopy = async () => {
    const name = prompt('Save the current state as a new version named:', `${tt.name} (edited)`);
    if (!name) return;
    const r = await api(`/timetables/${tt.id}/clone`, { method: 'POST', body: { name } });
    location.href = `/timetables/${r.id}`;
  };

  const second = (s) => (view === 'batch' ? s.faculty_name : s.batch_name);
  const third = (s) => (view === 'room' ? s.faculty_name : s.room_name);
  const hv = hover && moves?.[hover];

  return (
    <div>
      <div className="viewbar no-print">
        {!fixed && views.length > 1 && (
          <div className="seg" role="tablist">{views.map((v) => <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>{VIEWS[v]}-wise</button>)}</div>
        )}
        {!fixed && <select value={id ?? ''} onChange={(e) => setSel({ ...sel, [view]: Number(e.target.value) })} aria-label="Choose">
          {list.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>}
        <span className="grow" />
        <select value={scope} onChange={(e) => setScope(e.target.value)} aria-label="Export scope">
          <option value="this">Export: this {VIEWS[view].toLowerCase()}</option><option value="all">Export: all {VIEWS[view].toLowerCase()}s</option></select>
        <button className="btn" onClick={() => exportPdf(tt, view, scope === 'this' ? [id] : null)}>PDF</button>
        <button className="btn" onClick={() => exportExcel(tt, view, scope === 'this' ? [id] : null)}>Excel</button>
        <button className="btn" onClick={() => window.print()}>Print</button>
      </div>

      <div className="print-area">
        <h3 className="print-title">{VIEWS[view]}: {entity?.name} <small>{tt.name}</small></h3>
        <div className="tt-wrap">
          <table className={`tt ${drag ? 'dragging' : ''}`}>
            <thead><tr><th /> {tt.config.days.map((d) => <th key={d}>{d}</th>)}</tr></thead>
            <tbody>
              {labels.map((t, c) => (
                <tr key={c}>
                  <th className="time">{t}</th>
                  {tt.config.days.map((_, d) => {
                    const m = moves?.[`${d}-${c}`];
                    const cls = drag && m ? (m.hard.length ? 'no' : m.soft.length ? 'meh' : 'yes') : '';
                    return (
                      <td key={d} className={cls} onDragOver={(e) => { if (drag) { e.preventDefault(); setHover(`${d}-${c}`); } }} onDrop={(e) => { e.preventDefault(); drop(d, c); }}>
                        {grid[d][c].map(({ s, cont }) => (
                          <div key={s.id + '-' + cont} draggable={editable && !cont} onDragStart={() => startDrag(s)} onDragEnd={endDrag}
                            className={`sess ${s.type} ${cont ? 'cont' : ''} ${bad.has(s.id) ? 'conflict' : ''} ${editable && !cont ? 'grab' : ''}`}
                            title={bad.has(s.id) ? tt.conflicts.filter((x) => x.sessionIds.includes(s.id)).map((x) => x.message).join('\n') : s.subject_name}>
                            <b>{s.subject_code}{s.type === 'lab' && ' · lab'}</b>
                            {!cont ? <><span>{second(s)}</span><span>{third(s)}</span></> : <span>continues</span>}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editable && (
        <div className="no-print">
          <div className={`movebar ${drag ? 'show' : ''} ${hv ? (hv.hard.length ? 'no' : 'yes') : ''}`} aria-live="polite">
            {!drag ? null : !hv ? 'Drag over a slot to check it…' : hv.hard.length
              ? <><b>Breaks {hv.hard.length} hard constraint{hv.hard.length > 1 ? 's' : ''}:</b> {hv.hard.join(' ')}</>
              : <><b>Safe to drop</b> in {hv.roomName}.{hv.soft.length ? ' Note: ' + hv.soft[0] : ''}</>}
          </div>
          {toast && <div className={`alert ${toast.ok ? 'ok' : 'err'}`} onClick={() => setToast(null)}>{toast.t}</div>}
          <div className="row"><span className="muted small">Drag a class to another slot. Green = free, amber = allowed but disliked, red = breaks a hard rule. Edits change this version in place.</span>
            <span className="grow" /><button className="btn" onClick={saveCopy}>Save as new version</button></div>
        </div>
      )}
    </div>
  );
}
