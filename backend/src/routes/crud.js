import { Router } from 'express';
import { pool } from '../db.js';
import { auth } from '../auth.js';

/** Small CRUD factory: anyone signed-in may read, only admin may write. */
export function crud(table, { fields, listSql, order = 'id', check }) {
  const r = Router();
  const vals = (b) => fields.map((f) => (b[f] === '' ? null : b[f]));
  r.get('/', auth(), async (req, res) => {
    const [rows] = await pool.query(listSql || `SELECT * FROM ${table} ORDER BY ${order}`);
    res.json(rows);
  });
  r.post('/', auth('admin'), async (req, res) => {
    const err = check?.(req.body);
    if (err) return res.status(400).json({ error: err });
    const [x] = await pool.query(`INSERT INTO ${table} (${fields.map((f) => `\`${f}\``).join(',')}) VALUES (${fields.map(() => '?').join(',')})`, vals(req.body));
    res.status(201).json({ id: x.insertId });
  });
  r.put('/:id', auth('admin'), async (req, res) => {
    const err = check?.(req.body);
    if (err) return res.status(400).json({ error: err });
    await pool.query(`UPDATE ${table} SET ${fields.map((f) => `\`${f}\`=?`).join(',')} WHERE id=?`, [...vals(req.body), req.params.id]);
    res.json({ ok: true });
  });
  r.delete('/:id', auth('admin'), async (req, res) => {
    await pool.query(`DELETE FROM ${table} WHERE id=?`, [req.params.id]);
    res.json({ ok: true });
  });
  return r;
}

const pos = (v) => Number.isInteger(Number(v)) && Number(v) > 0;

export const rooms = crud('rooms', {
  fields: ['name', 'capacity', 'type'], order: 'name',
  check: (b) => (!b.name ? 'Room name is required.' : !pos(b.capacity) ? 'Capacity must be a positive whole number.' : !['classroom', 'lab'].includes(b.type) ? 'Choose a room type.' : null),
});
export const batches = crud('batches', {
  fields: ['name', 'size'], order: 'name',
  check: (b) => (!b.name ? 'Batch name is required.' : !pos(b.size) ? 'Batch size must be a positive whole number.' : null),
});
export const subjects = crud('subjects', {
  fields: ['code', 'name', 'type', 'sessions_per_week', 'duration', 'faculty_id', 'batch_id'],
  listSql: `SELECT s.*, f.name faculty_name, b.name batch_name FROM subjects s
            JOIN faculty f ON f.id=s.faculty_id JOIN batches b ON b.id=s.batch_id ORDER BY b.name, s.code`,
  check: (b) => (!b.code || !b.name ? 'Code and name are required.'
    : !['theory', 'lab'].includes(b.type) ? 'Mark the subject as theory or lab.'
    : !pos(b.sessions_per_week) || Number(b.sessions_per_week) > 20 ? 'Sessions per week must be between 1 and 20.'
    : !pos(b.duration) || Number(b.duration) > 4 ? 'Slots per session must be between 1 and 4.'
    : !b.faculty_id || !b.batch_id ? 'Pick a faculty and a batch.' : null),
});
