import { Router } from 'express';
import { Worker } from 'node:worker_threads';
import { pool, getConfig, loadAll } from '../db.js';
import { auth } from '../auth.js';
import { buildProblem, expandSessions, feasibilityIssues } from '../scheduler/problem.js';
import { ALGORITHMS, runAlgorithm } from '../scheduler/algorithms.js';
import { evaluate, detailed } from '../scheduler/evaluate.js';

const r = Router();

r.get('/algorithms', auth('admin'), (req, res) => res.json(ALGORITHMS));

const runInWorker = (P, algo, params) =>
  new Promise((resolve, reject) => {
    const w = new Worker(new URL('../scheduler/worker.js', import.meta.url), { workerData: { P, algo, params } });
    w.once('message', resolve);
    w.once('error', reject);
    w.once('exit', (c) => c !== 0 && reject(new Error(`Optimiser stopped unexpectedly (code ${c}).`)));
  });

r.post('/', auth('admin'), async (req, res) => {
  const { algorithm = 'ga', params = {}, name } = req.body;
  if (!ALGORITHMS[algorithm]) return res.status(400).json({ error: 'Unknown algorithm.' });

  const config = await getConfig();
  const data = await loadAll();
  const P = buildProblem({ config, ...data, sessions: expandSessions(data.subjects) });
  const issues = feasibilityIssues(P);
  if (issues.length) return res.status(400).json({ error: 'The data cannot be scheduled yet.', details: issues });

  // Run in a worker thread so the API stays responsive; fall back to running in-process
  // if the worker misbehaves (and log why, so problems are visible in the server terminal).
  let out = null;
  try { out = await runInWorker(P, algorithm, params); }
  catch (e) { console.warn('[generate] worker failed:', e.message); }
  if (!out?.genes?.length) {
    console.warn('[generate] worker result unusable (keys:', out && Object.keys(out), ') - running in-process');
    out = runAlgorithm(P, algorithm, params);
  }
  if (!out?.genes?.length) {
    console.error('[generate] optimiser returned no genes; sessions =', P.sessions.length, 'rooms =', P.rooms.length);
    return res.status(500).json({ error: 'The optimiser returned no result. Check the backend terminal for details.' });
  }

  const ev = evaluate(P, out.genes), det = detailed(P, out.genes);
  const fitness = 1 / (1 + ev.cost);
  const title = name?.trim() || `${algorithm.toUpperCase()} run ${new Date().toLocaleString('en-GB')}`;

  const conn = await pool.getConnection();
  let id;
  try {
    await conn.beginTransaction();
    const [t] = await conn.query(
      `INSERT INTO timetables (name,algorithm,params,config,fitness,cost,hard_conflicts,soft_penalty,duration_ms,history,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [title, algorithm, JSON.stringify(out.params), JSON.stringify(config), fitness, ev.cost, det.hard.length, ev.soft, out.durationMs, JSON.stringify(out.history), req.user.id]);
    id = t.insertId;
    const rows = P.sessions.map((s, i) => [id, s.subject_id, P.batchIds[s.b], P.facultyIds[s.f], P.rooms[out.genes[3 * i + 2]].id, out.genes[3 * i], out.genes[3 * i + 1], s.length]);
    await conn.query('INSERT INTO timetable_sessions (timetable_id,subject_id,batch_id,faculty_id,room_id,`day`,slot,`length`) VALUES ?', [rows]);
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }

  res.status(201).json({
    id, name: title, algorithm, params: out.params, fitness, cost: ev.cost, hard: det.hard.length, soft: ev.soft,
    durationMs: out.durationMs, sessions: P.sessions.length, history: out.history,
    conflicts: det.hard.map((c) => c.message), softNotes: det.soft.length,
  });
});
export default r;