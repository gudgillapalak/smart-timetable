// npm run db:init  -> creates the database, tables and demo data (only if empty)
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import { dbConfig, DB_NAME } from './db.js';
import * as seed from './seedData.js';

const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true });
await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4`);
await conn.query(`USE \`${DB_NAME}\``);
await conn.query(fs.readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));

const [[{ n }]] = await conn.query('SELECT COUNT(*) n FROM users');
if (n === 0) {
  const hash = (p) => bcrypt.hashSync(p, 10);
  await conn.query('INSERT INTO settings (id,days,slots_per_day,start_time,slot_minutes) VALUES (1,?,?,?,?)',
    [JSON.stringify(seed.config.days), seed.config.slotsPerDay, seed.config.startTime, seed.config.slotMinutes]);
  await conn.query('INSERT INTO batches (id,name,size) VALUES ?', [seed.batches.map((b) => [b.id, b.name, b.size])]);
  await conn.query('INSERT INTO rooms (id,name,capacity,type) VALUES ?', [seed.rooms.map((r) => [r.id, r.name, r.capacity, r.type])]);
  await conn.query('INSERT INTO faculty (id,name,email,department) VALUES ?', [seed.faculty.map((f) => [f.id, f.name, f.email, f.department])]);
  await conn.query('INSERT INTO subjects (code,name,type,sessions_per_week,duration,faculty_id,batch_id) VALUES ?',
    [seed.subjects.map((s) => [s.code, s.name, s.type, s.sessions_per_week, s.duration, s.faculty_id, s.batch_id])]);
  await conn.query('INSERT INTO faculty_prefs (faculty_id,`day`,slot,kind) VALUES ?', [seed.prefs.map((p) => [p.faculty_id, p.day, p.slot, p.kind])]);
  const users = [['admin', hash('admin123'), 'admin', null], ['student', hash('student123'), 'student', null],
    ...seed.faculty.map((f) => [`fac${f.id}`, hash('faculty123'), 'faculty', f.id])];
  await conn.query('INSERT INTO users (username,password_hash,role,faculty_id) VALUES ?', [users]);
  console.log('Demo data loaded.\n  admin   / admin123\n  faculty / fac1 … fac8 (password faculty123)\n  student / student123');
} else console.log('Tables ready (data already present, seed skipped).');
await conn.end();
