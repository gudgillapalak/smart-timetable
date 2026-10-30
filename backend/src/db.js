import mysql from 'mysql2/promise';
import 'dotenv/config';

export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};
export const DB_NAME = process.env.DB_NAME || 'smart_timetable';

export const pool = mysql.createPool({
  ...dbConfig,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,
});

// MySQL returns JSON columns parsed; MariaDB returns text. Handle both.
export const j = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

export async function getConfig() {
  const [[s]] = await pool.query('SELECT * FROM settings WHERE id=1');
  return { days: j(s.days), slotsPerDay: s.slots_per_day, startTime: s.start_time, slotMinutes: s.slot_minutes };
}

export async function loadAll() {
  const [faculty] = await pool.query('SELECT id,name FROM faculty ORDER BY id');
  const [prefs] = await pool.query('SELECT faculty_id, `day`, slot, kind FROM faculty_prefs');
  const [rooms] = await pool.query('SELECT id,name,capacity,type FROM rooms ORDER BY id');
  const [batches] = await pool.query('SELECT id,name,size FROM batches ORDER BY id');
  const [subjects] = await pool.query('SELECT * FROM subjects ORDER BY id');
  return { faculty, prefs, rooms, batches, subjects };
}
