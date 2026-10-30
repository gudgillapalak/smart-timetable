import { W_HARD } from './problem.js';
import { evaluate } from './evaluate.js';

const ri = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[ri(a.length)];
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export const ALGORITHMS = {
  ga: {
    label: 'Genetic Algorithm',
    blurb: 'Evolves a population: tournament selection, uniform crossover, random mutation, elitism.',
    params: [
      { key: 'popSize', label: 'Population size', value: 60, min: 10, max: 400, step: 10 },
      { key: 'generations', label: 'Generations', value: 300, min: 10, max: 5000, step: 10 },
      { key: 'crossoverRate', label: 'Crossover rate', value: 0.8, min: 0, max: 1, step: 0.05 },
      { key: 'mutationRate', label: 'Mutation rate (per gene)', value: 0.05, min: 0.001, max: 0.5, step: 0.005 },
      { key: 'tournament', label: 'Tournament size', value: 4, min: 2, max: 12, step: 1 },
      { key: 'elitism', label: 'Elites kept', value: 2, min: 0, max: 20, step: 1 },
      { key: 'seedRatio', label: 'Smart-seeded share of population', value: 0.5, min: 0, max: 1, step: 0.1 },
    ],
  },
  sa: {
    label: 'Simulated Annealing',
    blurb: 'One schedule is nudged repeatedly; worse moves are accepted less often as it cools.',
    params: [
      { key: 'iterations', label: 'Iterations', value: 30000, min: 1000, max: 500000, step: 1000 },
      { key: 'initialTemp', label: 'Initial temperature', value: 30, min: 1, max: 500, step: 1 },
      { key: 'finalTemp', label: 'Final temperature', value: 0.05, min: 0.001, max: 5, step: 0.01 },
      { key: 'seedRatio', label: 'Chance of smart-seeded start', value: 0.5, min: 0, max: 1, step: 0.1 },
    ],
  },
  pso: {
    label: 'Particle Swarm Optimisation',
    blurb: 'A swarm of candidate schedules drifts toward its own best and the swarm best positions.',
    params: [
      { key: 'swarmSize', label: 'Swarm size', value: 40, min: 5, max: 300, step: 5 },
      { key: 'iterations', label: 'Iterations', value: 300, min: 10, max: 5000, step: 10 },
      { key: 'inertia', label: 'Inertia (w)', value: 0.7, min: 0.1, max: 1.2, step: 0.05 },
      { key: 'c1', label: 'Cognitive weight (c1)', value: 1.5, min: 0, max: 4, step: 0.1 },
      { key: 'c2', label: 'Social weight (c2)', value: 1.5, min: 0, max: 4, step: 0.1 },
      { key: 'seedRatio', label: 'Smart-seeded share of swarm', value: 0.5, min: 0, max: 1, step: 0.1 },
    ],
  },
};

// ---------- shared building blocks ----------
function randomGene(P, i, g) {
  const s = P.sessions[i];
  g[3 * i] = ri(P.D); g[3 * i + 1] = ri(P.S - s.length + 1); g[3 * i + 2] = pick(s.choices);
}
export function randomIndividual(P) {
  const g = new Int32Array(3 * P.sessions.length);
  for (let i = 0; i < P.sessions.length; i++) randomGene(P, i, g);
  return g;
}
function mutateGene(P, g, i) {
  const s = P.sessions[i], x = Math.random(), maxSlot = P.S - s.length + 1;
  if (x < 0.4) { g[3 * i] = ri(P.D); g[3 * i + 1] = ri(maxSlot); }
  else if (x < 0.7) g[3 * i + 1] = ri(maxSlot);
  else if (x < 0.85) g[3 * i] = ri(P.D);
  else g[3 * i + 2] = pick(s.choices);
}

/** Randomised greedy builder: places long sessions first, trying a few random spots and keeping the cheapest. */
export function constructive(P, tries = 40) {
  const { D, S, sessions: ss } = P, DS = D * S, N = ss.length;
  const f = new Uint8Array(P.nF * DS), b = new Uint8Array(P.nB * DS), r = new Uint8Array(P.nR * DS);
  const sd = new Uint8Array(P.nSubj * D), bday = new Uint8Array(P.nB * D);
  const g = new Int32Array(3 * N);
  const order = [...Array(N).keys()].sort(() => Math.random() - 0.5).sort((x, y) => ss[y].length - ss[x].length);
  for (const i of order) {
    const s = ss[i];
    let best = Infinity, bd = 0, bc = 0, br = s.choices[0];
    for (let k = 0; k < tries && best > 0; k++) {
      const d = ri(D), c = ri(S - s.length + 1), room = pick(s.choices);
      let cost = sd[s.subj * D + d] * 3;
      for (let t = 0; t < s.length; t++) {
        const cell = d * S + c + t;
        cost += (f[s.f * DS + cell] + b[s.b * DS + cell] + r[room * DS + cell] + P.unavail[s.f * DS + cell]) * W_HARD + P.dislike[s.f * DS + cell] * 2;
      }
      if (bday[s.b * D + d]) {
        const before = c > 0 && b[s.b * DS + d * S + c - 1];
        const after = c + s.length < S && b[s.b * DS + d * S + c + s.length];
        if (!before && !after) cost += 2;
      }
      if (cost < best) { best = cost; bd = d; bc = c; br = room; }
    }
    g[3 * i] = bd; g[3 * i + 1] = bc; g[3 * i + 2] = br;
    for (let t = 0; t < s.length; t++) {
      const cell = bd * S + bc + t;
      f[s.f * DS + cell]++; b[s.b * DS + cell]++; r[br * DS + cell]++;
    }
    sd[s.subj * D + bd]++; bday[s.b * D + bd]++;
  }
  return g;
}
const seeded = (P, ratio) => (Math.random() < ratio ? constructive(P) : randomIndividual(P));

// ---------- Genetic Algorithm ----------
function ga(P, p, rec) {
  const N = P.sessions.length;
  let pop = Array.from({ length: p.popSize }, () => { const g = seeded(P, p.seedRatio); return { g, ...evaluate(P, g) }; });
  let best = null;
  for (let gen = 0; gen < p.generations; gen++) {
    pop.sort((a, b) => a.cost - b.cost);
    if (!best || pop[0].cost < best.cost) best = pop[0];
    rec(best.cost);
    if (best.cost === 0) break;
    const next = pop.slice(0, p.elitism);
    const select = () => {
      let w = null;
      for (let k = 0; k < p.tournament; k++) { const c = pop[ri(pop.length)]; if (!w || c.cost < w.cost) w = c; }
      return w;
    };
    while (next.length < p.popSize) {
      const a = select(), b = select(), g = Int32Array.from(a.g);
      if (Math.random() < p.crossoverRate)
        for (let i = 0; i < N; i++) if (Math.random() < 0.5) { g[3 * i] = b.g[3 * i]; g[3 * i + 1] = b.g[3 * i + 1]; g[3 * i + 2] = b.g[3 * i + 2]; }
      for (let i = 0; i < N; i++) if (Math.random() < p.mutationRate) mutateGene(P, g, i);
      next.push({ g, ...evaluate(P, g) });
    }
    pop = next;
  }
  return best.g;
}

// ---------- Simulated Annealing ----------
function sa(P, p, rec) {
  const ss = P.sessions, N = ss.length;
  const g = seeded(P, p.seedRatio);
  let cur = evaluate(P, g), best = { g: Int32Array.from(g), cost: cur.cost };
  const step = Math.max(1, Math.floor(p.iterations / 200));
  for (let it = 0; it < p.iterations && best.cost > 0; it++) {
    const T = p.initialTemp * Math.pow(p.finalTemp / p.initialTemp, it / p.iterations);
    const i = ri(N), saved = [g[3 * i], g[3 * i + 1], g[3 * i + 2]];
    let j = -1, savedJ;
    if (N > 1 && Math.random() < 0.2) {            // swap the times of two equal-length sessions
      const k = ri(N);
      if (k !== i && ss[k].length === ss[i].length) {
        j = k; savedJ = [g[3 * j], g[3 * j + 1]];
        g[3 * i] = savedJ[0]; g[3 * i + 1] = savedJ[1]; g[3 * j] = saved[0]; g[3 * j + 1] = saved[1];
      }
    }
    if (j < 0) mutateGene(P, g, i);
    const nxt = evaluate(P, g), delta = nxt.cost - cur.cost;
    if (delta <= 0 || Math.random() < Math.exp(-delta / T)) {
      cur = nxt;
      if (cur.cost < best.cost) best = { g: Int32Array.from(g), cost: cur.cost };
    } else {
      g[3 * i] = saved[0]; g[3 * i + 1] = saved[1]; g[3 * i + 2] = saved[2];
      if (j >= 0) { g[3 * j] = savedJ[0]; g[3 * j + 1] = savedJ[1]; }
    }
    if (it % step === 0) rec(best.cost);
  }
  rec(best.cost);
  return best.g;
}

// ---------- Particle Swarm Optimisation ----------
// Position = 3 continuous numbers per session (day, slot, index into that session's room choices).
function pso(P, p, rec) {
  const ss = P.sessions, N = ss.length, dim = 3 * N;
  const hi = new Float64Array(dim);
  ss.forEach((s, i) => { hi[3 * i] = P.D - 1; hi[3 * i + 1] = P.S - s.length; hi[3 * i + 2] = s.choices.length - 1; });
  const decode = (x) => {
    const g = new Int32Array(dim);
    for (let i = 0; i < N; i++) {
      g[3 * i] = clamp(Math.round(x[3 * i]), 0, hi[3 * i]);
      g[3 * i + 1] = clamp(Math.round(x[3 * i + 1]), 0, hi[3 * i + 1]);
      g[3 * i + 2] = ss[i].choices[clamp(Math.round(x[3 * i + 2]), 0, hi[3 * i + 2])];
    }
    return g;
  };
  const encode = (g) => {
    const x = new Float64Array(dim);
    for (let i = 0; i < N; i++) { x[3 * i] = g[3 * i]; x[3 * i + 1] = g[3 * i + 1]; x[3 * i + 2] = Math.max(0, ss[i].choices.indexOf(g[3 * i + 2])); }
    return x;
  };
  const randomPos = () => Float64Array.from({ length: dim }, (_, k) => Math.random() * hi[k]);

  let gbest = { x: null, cost: Infinity };
  const swarm = Array.from({ length: p.swarmSize }, () => {
    const x = Math.random() < p.seedRatio ? encode(constructive(P)) : randomPos();
    const pt = { x, v: new Float64Array(dim), pb: Float64Array.from(x), pbc: evaluate(P, decode(x)).cost };
    if (pt.pbc < gbest.cost) gbest = { x: Float64Array.from(x), cost: pt.pbc };
    return pt;
  });
  for (let it = 0; it < p.iterations && gbest.cost > 0; it++) {
    for (const pt of swarm) {
      for (let k = 0; k < dim; k++) {
        const vmax = Math.max(1, hi[k] / 2);
        pt.v[k] = clamp(p.inertia * pt.v[k] + p.c1 * Math.random() * (pt.pb[k] - pt.x[k]) + p.c2 * Math.random() * (gbest.x[k] - pt.x[k]), -vmax, vmax);
        pt.x[k] = clamp(pt.x[k] + pt.v[k], 0, hi[k]);
        if (Math.random() < 0.003) pt.x[k] = Math.random() * hi[k];   // tiny kick keeps the swarm exploring
      }
      const cost = evaluate(P, decode(pt.x)).cost;
      if (cost < pt.pbc) { pt.pbc = cost; pt.pb = Float64Array.from(pt.x); }
      if (cost < gbest.cost) gbest = { x: Float64Array.from(pt.x), cost };
    }
    rec(gbest.cost);
  }
  return decode(gbest.x);
}

// ---------- public entry ----------
function sanitize(algo, params = {}) {
  const out = {};
  for (const d of ALGORITHMS[algo].params) {
    const v = Number(params[d.key]);
    out[d.key] = Number.isFinite(v) ? clamp(v, d.min, d.max) : d.value;
  }
  if (algo === 'sa' && out.finalTemp >= out.initialTemp) out.finalTemp = out.initialTemp / 100;
  return out;
}

export function runAlgorithm(P, algo, params) {
  const p = sanitize(algo, params);
  const hist = [];
  const t0 = performance.now();
  const genes = { ga, sa, pso }[algo](P, p, (c) => hist.push(c));
  const durationMs = Math.max(1, Math.round(performance.now() - t0));
  const stride = Math.max(1, Math.ceil(hist.length / 200));
  return { genes, params: p, durationMs, history: hist.filter((_, i) => i % stride === 0 || i === hist.length - 1) };
}
