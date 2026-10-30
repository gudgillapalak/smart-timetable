import { useEffect, useState } from 'react';
import { api } from '../api';

/**
 * Generic admin CRUD screen.
 * fields: [{ name, label, type: text|number|select|password, options | optionsFrom:{endpoint,label}, required, hint, createOnly }]
 */
export default function CrudPage({ title, intro, endpoint, columns, fields, blank = {}, rowActions, onFieldChange, reloadKey }) {
  const [rows, setRows] = useState([]);
  const [lookups, setLookups] = useState({});
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api(endpoint).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [endpoint, reloadKey]);
  useEffect(() => {
    fields.filter((f) => f.optionsFrom).forEach((f) =>
      api(f.optionsFrom.endpoint).then((r) => setLookups((l) => ({ ...l, [f.name]: r.map((x) => ({ value: x.id, label: f.optionsFrom.label(x) })) }))));
  }, []);

  const change = (name, value) => {
    let next = { ...form, [name]: value };
    if (onFieldChange) next = onFieldChange(next, name);
    setForm(next);
  };
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      await api(form.id ? `${endpoint}/${form.id}` : endpoint, { method: form.id ? 'PUT' : 'POST', body: form });
      setForm(null); await load();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const remove = async (row) => {
    if (!confirm(`Delete "${row.name || row.code}"?`)) return;
    try { await api(`${endpoint}/${row.id}`, { method: 'DELETE' }); setErr(''); load(); } catch (x) { setErr(x.message); }
  };

  return (
    <section>
      <header className="page-head">
        <div><h2>{title}</h2>{intro && <p className="muted">{intro}</p>}</div>
        <button className="btn primary" onClick={() => { setErr(''); setForm({ ...blank }); }}>Add</button>
      </header>
      {err && !form && <div className="alert err">{err}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}<th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}
                <td className="actions">
                  {rowActions?.map((a) => <button key={a.label} className="link" onClick={() => a.onClick(r)}>{a.label}</button>)}
                  <button className="link" onClick={() => { setErr(''); setForm({ ...r, password: '' }); }}>Edit</button>
                  <button className="link danger" onClick={() => remove(r)}>Delete</button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={columns.length + 1} className="empty">Nothing here yet. Use Add to create the first entry.</td></tr>}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <form className="modal" onSubmit={save}>
            <h3>{form.id ? 'Edit' : 'Add'} {title.toLowerCase().replace(/s$/, '')}</h3>
            {fields.map((f) => (
              <label key={f.name}>{f.label}
                {f.type === 'select' ? (
                  <select required={f.required !== false} value={form[f.name] ?? ''} onChange={(e) => change(f.name, f.numeric === false ? e.target.value : isNaN(e.target.value) || e.target.value === '' ? e.target.value : Number(e.target.value))}>
                    <option value="" disabled>Choose…</option>
                    {(f.options || lookups[f.name] || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input type={f.type || 'text'} required={f.required !== false && !f.optional} min={f.type === 'number' ? 1 : undefined}
                    value={form[f.name] ?? ''} onChange={(e) => change(f.name, f.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)} />
                )}
                {f.hint && <small className="muted">{f.hint}</small>}
              </label>
            ))}
            {err && <div className="alert err">{err}</div>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn primary" disabled={busy}>Save</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
