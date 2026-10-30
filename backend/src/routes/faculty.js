import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { auth } from '../auth.js';

const r = Router();

r.get('/', auth(), async (req, res) => {
  const [rows] = await pool.query(`
    SELECT f.*, u.username,
      (SELECT GROUP_CONCAT(CONCAT(s.code,' (',b.name,')') ORDER BY b.name, s.code SEPARATOR ', ')
         FROM subjects s JOIN batches b ON b.id=s.batch_id WHERE s.faculty_id=f.id) AS subjects,
      (SELECT COUNT(*) FROM faculty_prefs p WHERE p.faculty_id=f.id AND p.kind='unavailable') AS unavailable_count,
      (SELECT COUNT(*) FROM faculty_prefs p WHERE p.faculty_id=f.id AND p.kind='dislike') AS dislike_count
    FROM faculty f LEFT JOIN users u ON u.faculty_id=f.id ORDER BY f.name`);
  res.json(rows);
});

async function saveLogin(facultyId, username, password) {
  if (!username) return;
  const [[u]] = await pool.query('SELECT id FROM users WHERE faculty_id=?', [facultyId]);
  if (u) {
    await pool.query('UPDATE users SET username=? WHERE id=?', [username, u.id]);
    if (password) await pool.query('UPDATE users SET password_hash=? WHERE id=?', [await bcrypt.hash(password, 10), u.id]);
  } else {
    await pool.query('INSERT INTO users (username,password_hash,role,faculty_id) VALUES (?,?,?,?)',
      [username, await bcrypt.hash(password || 'faculty123', 10), 'faculty', facultyId]);
  }
}

r.post('/', auth('admin'), async (req, res) => {
  const { name, email, department, username, password } = req.body;
  if (!name) return res.status(400).json({ error: 'Faculty name is required.' });
  const [x] = await pool.query('INSERT INTO faculty (name,email,department) VALUES (?,?,?)', [name, email || null, department || null]);
  await saveLogin(x.insertId, username, password);
  res.status(201).json({ id: x.insertId });
});
r.put('/:id', auth('admin'), async (req, res) => {
  const { name, email, department, username, password } = req.body;
  if (!name) return res.status(400).json({ error: 'Faculty name is required.' });
  await pool.query('UPDATE faculty SET name=?,email=?,department=? WHERE id=?', [name, email || null, department || null, req.params.id]);
  await saveLogin(req.params.id, username, password);
  res.json({ ok: true });
});
r.delete('/:id', auth('admin'), async (req, res) => {
  await pool.query('DELETE FROM faculty WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

// availability: admin can edit anyone, faculty only themselves
const mine = (req, res, next) =>
  req.user.role === 'admin' || (req.user.role === 'faculty' && String(req.user.faculty_id) === req.params.id)
    ? next() : res.status(403).json({ error: 'You can only change your own availability.' });

r.get('/:id/prefs', auth('admin', 'faculty'), mine, async (req, res) => {
  const [rows] = await pool.query('SELECT `day`, slot, kind FROM faculty_prefs WHERE faculty_id=?', [req.params.id]);
  res.json({
    unavailable: rows.filter((p) => p.kind === 'unavailable').map((p) => [p.day, p.slot]),
    dislike: rows.filter((p) => p.kind === 'dislike').map((p) => [p.day, p.slot]),
  });
});
r.put('/:id/prefs', auth('admin', 'faculty'), mine, async (req, res) => {
  const { unavailable = [], dislike = [] } = req.body;
  const rows = [...unavailable.map(([d, s]) => [req.params.id, d, s, 'unavailable']), ...dislike.map(([d, s]) => [req.params.id, d, s, 'dislike'])];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM faculty_prefs WHERE faculty_id=?', [req.params.id]);
    if (rows.length) await conn.query('INSERT INTO faculty_prefs (faculty_id,`day`,slot,kind) VALUES ?', [rows]);
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  res.json({ ok: true });
});
export default r;
