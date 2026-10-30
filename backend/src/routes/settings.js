import { Router } from 'express';
import { pool, getConfig } from '../db.js';
import { auth } from '../auth.js';

const r = Router();
r.get('/', auth(), async (req, res) => res.json(await getConfig()));
r.put('/', auth('admin'), async (req, res) => {
  const { days, slotsPerDay, startTime, slotMinutes } = req.body;
  if (!Array.isArray(days) || !days.length) return res.status(400).json({ error: 'Choose at least one day.' });
  if (!(slotsPerDay >= 1 && slotsPerDay <= 14)) return res.status(400).json({ error: 'Slots per day must be between 1 and 14.' });
  if (!/^\d{2}:\d{2}$/.test(startTime)) return res.status(400).json({ error: 'Start time must look like 09:00.' });
  if (!(slotMinutes >= 15 && slotMinutes <= 240)) return res.status(400).json({ error: 'Slot length must be 15–240 minutes.' });
  await pool.query('REPLACE INTO settings (id,days,slots_per_day,start_time,slot_minutes) VALUES (1,?,?,?,?)', [JSON.stringify(days), slotsPerDay, startTime, slotMinutes]);
  res.json(await getConfig());
});
export default r;
