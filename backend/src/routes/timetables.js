import { Router } from 'express';
import { pool, j, loadAll } from '../db.js';
import { auth } from '../auth.js';
import { buildProblem } from '../scheduler/problem.js';
import { evaluate, detailed, checkPlacement } from '../scheduler/evaluate.js';

const r = Router();

async function loadTimetable(id) {
  const [[t]] = await pool.query('SELECT * FROM timetables WHERE id=?', [id]);
  if (!t) return null;
  const [rows] = await pool.query(
    `SELECT ts.id, ts.subject_id, ts.batch_id, ts.faculty_id, ts.room_id, ts.day, ts.slot, ts.length,
            s.code subject_code, s.name subject_name, s.type, b.name batch_name, f.name faculty_name, rm.name room_name
     FROM timetable_sessions ts JOIN subjects s ON s.id=ts.subject_id JOIN batches b ON b.id=ts.batch_id
     JOIN faculty f ON f.id=ts.faculty_id JOIN rooms rm ON rm.id=ts.room_id WHERE ts.timetable_id=? ORDER BY ts.id`, [id]);
  const config = j(t.config);
  const data = await loadAll();
  const P = buildProblem({
    config, ...data,
    sessions: rows.map((x) => ({ id: x.id, subject_id: x.subject_id, code: x.subject_code, name: x.subject_name, type: x.type, batch_id: x.batch_id, faculty_id: x.faculty_id, length: x.length })),
  });
  const roomIdx = new Map(P.rooms.map((x, i) => [x.id, i]));
  const genes = new Int32Array(3 * rows.length);
  rows.forEach((x, i) => { genes[3 * i] = x.day; genes[3 * i + 1] = x.slot; genes[3 * i + 2] = roomIdx.get(x.room_id); });
  return { t, config, rows, P, genes };
}

const summary = (t) => ({ ...t, config: j(t.config), params: j(t.params), history: j(t.history) });

r.get('/', auth(), async (req, res) => {
  const [rows] = await pool.query(`SELECT id,name,algorithm,fitness,cost,hard_conflicts,soft_penalty,duration_ms,is_active,manual_edits,parent_id,created_at
                                   FROM timetables ORDER BY id DESC`);
  res.json(rows);
});

async function detail(id) {
  const L = await loadTimetable(id);
  if (!L) return null;
  const { P, genes, rows } = L;
  const det = detailed(P, genes);
  return {
    ...summary(L.t), sessions: rows,
    conflicts: det.hard.map((c) => ({ type: c.type, message: c.message, sessionIds: c.sessions.map((i) => rows[i].id) })),
    softCount: det.soft.length,
    entities: {
      batches: P.batchIds.map((id, i) => ({ id, name: P.batchNames[i] })),
      faculty: P.facultyIds.map((id, i) => ({ id, name: P.facultyNames[i] })),
      rooms: P.rooms.map((x) => ({ id: x.id, name: x.name })),
    },
  };
}

// the published version everyone (faculty / students) sees
r.get('/active', auth(), async (req, res) => {
  const [[a]] = await pool.query('SELECT id FROM timetables WHERE is_active=1 LIMIT 1');
  if (!a) return res.status(404).json({ error: 'No timetable has been published yet.' });
  res.json(await detail(a.id));
});
r.get('/:id', auth('admin'), async (req, res) => {
  const d = await detail(req.params.id);
  d ? res.json(d) : res.status(404).json({ error: 'Timetable not found.' });
});
r.delete('/:id', auth('admin'), async (req, res) => {
  await pool.query('DELETE FROM timetables WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});
r.post('/:id/publish', auth('admin'), async (req, res) => {
  await pool.query('UPDATE timetables SET is_active = (id=?)', [req.params.id]);
  res.json({ ok: true });
});
r.post('/:id/clone', auth('admin'), async (req, res) => {
  const [[t]] = await pool.query('SELECT * FROM timetables WHERE id=?', [req.params.id]);
  if (!t) return res.status(404).json({ error: 'Timetable not found.' });
  const name = req.body.name?.trim() || `${t.name} (copy)`;
  const [x] = await pool.query(
    `INSERT INTO timetables (name,algorithm,params,config,fitness,cost,hard_conflicts,soft_penalty,duration_ms,history,parent_id,created_by)
     VALUES (?,'clone',?,?,?,?,?,?,0,?,?,?)`,
    [name, t.params && JSON.stringify(j(t.params)), JSON.stringify(j(t.config)), t.fitness, t.cost, t.hard_conflicts, t.soft_penalty, t.history && JSON.stringify(j(t.history)), t.id, req.user.id]);
  await pool.query(`INSERT INTO timetable_sessions (timetable_id,subject_id,batch_id,faculty_id,room_id,\`day\`,slot,\`length\`)
                    SELECT ?,subject_id,batch_id,faculty_id,room_id,\`day\`,slot,\`length\` FROM timetable_sessions WHERE timetable_id=?`, [x.insertId, t.id]);
  res.status(201).json({ id: x.insertId });
});

// ---- manual editing ----
const msgs = (a) => a.map((x) => x.message);

/** For the session being dragged: result of dropping it on every cell (best room is chosen automatically). */
r.get('/:id/sessions/:sid/moves', auth('admin'), async (req, res) => {
  const L = await loadTimetable(req.params.id);
  const i = L?.rows.findIndex((x) => x.id === Number(req.params.sid));
  if (!L || i < 0) return res.status(404).json({ error: 'Session not found.' });
  const { P, genes } = L, s = P.sessions[i], cur = genes[3 * i + 2];
  const candidates = [cur, ...s.choices.filter((c) => c !== cur)];
  const out = {};
  for (let d = 0; d < P.D; d++)
    for (let c = 0; c + s.length <= P.S; c++) {
      let best = null;
      for (const room of candidates) {
        const chk = checkPlacement(P, genes, i, d, c, room);
        const score = chk.hard.length * 100 + chk.soft.length;
        if (!best || score < best.score) best = { score, room, chk };
        if (score === 0) break;
      }
      out[`${d}-${c}`] = { roomId: P.rooms[best.room].id, roomName: P.rooms[best.room].name, hard: msgs(best.chk.hard), soft: msgs(best.chk.soft) };
    }
  res.json(out);
});

r.post('/:id/sessions/:sid/move', auth('admin'), async (req, res) => {
  const L = await loadTimetable(req.params.id);
  const i = L?.rows.findIndex((x) => x.id === Number(req.params.sid));
  if (!L || i < 0) return res.status(404).json({ error: 'Session not found.' });
  const { P, genes } = L, s = P.sessions[i];
  const { day, slot, roomId, force } = req.body;
  const roomIdx = P.rooms.findIndex((x) => x.id === roomId);
  if (roomIdx < 0 || !(day >= 0 && day < P.D) || !(slot >= 0 && slot + s.length <= P.S))
    return res.status(400).json({ error: 'That position is outside the timetable.' });

  const chk = checkPlacement(P, genes, i, day, slot, roomIdx);
  if (chk.hard.length && !force) return res.status(409).json({ error: 'This move breaks hard constraints.', hard: msgs(chk.hard), soft: msgs(chk.soft) });

  await pool.query('UPDATE timetable_sessions SET `day`=?, slot=?, room_id=? WHERE id=?', [day, slot, roomId, req.params.sid]);
  genes[3 * i] = day; genes[3 * i + 1] = slot; genes[3 * i + 2] = roomIdx;
  const ev = evaluate(P, genes), det = detailed(P, genes);
  await pool.query('UPDATE timetables SET cost=?, fitness=?, hard_conflicts=?, soft_penalty=?, manual_edits=manual_edits+1 WHERE id=?',
    [ev.cost, 1 / (1 + ev.cost), det.hard.length, ev.soft, req.params.id]);
  res.json({ ok: true, hard: msgs(chk.hard), soft: msgs(chk.soft), totalConflicts: det.hard.length });
});
export default r;
