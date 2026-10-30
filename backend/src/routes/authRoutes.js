import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { auth, signToken } from '../auth.js';

const r = Router();
const shape = async (u) => {
  let faculty_name = null;
  if (u.faculty_id) [[{ name: faculty_name } = {}]] = await pool.query('SELECT name FROM faculty WHERE id=?', [u.faculty_id]);
  return { id: u.id, username: u.username, role: u.role, faculty_id: u.faculty_id, faculty_name };
};

r.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const [[u]] = await pool.query('SELECT * FROM users WHERE username=?', [username || '']);
  if (!u || !(await bcrypt.compare(password || '', u.password_hash))) return res.status(401).json({ error: 'Wrong username or password.' });
  res.json({ token: signToken(u), user: await shape(u) });
});
r.get('/me', auth(), async (req, res) => {
  const [[u]] = await pool.query('SELECT * FROM users WHERE id=?', [req.user.id]);
  res.json(await shape(u));
});
export default r;
