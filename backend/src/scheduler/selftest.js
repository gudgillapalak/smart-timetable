// Runs all three optimisers on the demo data without needing MySQL.
import * as seed from '../seedData.js';
import { buildProblem, expandSessions, feasibilityIssues } from './problem.js';
import { runAlgorithm } from './algorithms.js';
import { evaluate, detailed, checkPlacement } from './evaluate.js';

const P = buildProblem({ config: seed.config, faculty: seed.faculty, prefs: seed.prefs, rooms: seed.rooms, batches: seed.batches,
  sessions: expandSessions(seed.subjects.map((s, i) => ({ ...s, id: i + 1 }))) });
console.log('sessions:', P.sessions.length, 'issues:', feasibilityIssues(P));
for (const a of ['ga', 'sa', 'pso']) {
  const r = runAlgorithm(P, a, {});
  const ev = evaluate(P, r.genes), det = detailed(P, r.genes);
  console.log(a.padEnd(4), 'time', r.durationMs + 'ms', 'cost', ev.cost, 'hard', det.hard.length, 'soft', ev.soft, 'fitness', (1 / (1 + ev.cost)).toFixed(4));
  if (a === 'ga') {
    const c = checkPlacement(P, r.genes, 0, 0, 0, r.genes[2]);
    console.log('  sample move check ->', c.hard.map((x) => x.message), c.soft.length, 'soft');
  }
}

console.log('--- pure random start (seedRatio 0) ---');
for (const a of ['ga', 'sa', 'pso']) {
  const r = runAlgorithm(P, a, { seedRatio: 0 });
  const ev = evaluate(P, r.genes);
  console.log(a.padEnd(4), 'time', r.durationMs + 'ms', 'cost', ev.cost, 'hard', ev.hard, 'soft', ev.soft, 'first->last', r.history[0], '->', r.history.at(-1));
}
