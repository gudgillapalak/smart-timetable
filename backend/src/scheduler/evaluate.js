import { W_HARD } from './problem.js';

/**
 * Fast fitness used inside the optimisers. cost = hard * 100 + soft  (lower is better).
 * HARD (must be 0):  faculty clash, batch clash, room clash, room too small, wrong room type,
 *                    faculty unavailable, session runs past the end of the day
 * SOFT:              faculty dislike slot (2), idle gaps in a batch's day (2 each),
 *                    same subject twice on one day (3)
 */
export function evaluate(P, g) {
  const { D, S, sessions: ss } = P, DS = D * S, N = ss.length;
  const f = new Uint8Array(P.nF * DS), b = new Uint8Array(P.nB * DS), r = new Uint8Array(P.nR * DS);
  const sd = new Uint8Array(P.nSubj * D);
  let hard = 0, soft = 0;
  for (let i = 0; i < N; i++) {
    const s = ss[i], d = g[3 * i], c = g[3 * i + 1], ri = g[3 * i + 2];
    if (c < 0 || d < 0 || d >= D || c + s.length > S) { hard += 5; continue; }
    const room = P.rooms[ri];
    if (room.capacity < s.size) hard++;
    if (room.type !== s.roomType) hard++;
    for (let t = 0; t < s.length; t++) {
      const cell = d * S + c + t;
      if (f[s.f * DS + cell]++ > 0) hard++;
      if (b[s.b * DS + cell]++ > 0) hard++;
      if (r[ri * DS + cell]++ > 0) hard++;
      if (P.unavail[s.f * DS + cell]) hard++;
      if (P.dislike[s.f * DS + cell]) soft += 2;
    }
    if (sd[s.subj * D + d]++ > 0) soft += 3;
  }
  for (let bi = 0; bi < P.nB; bi++) {
    for (let d = 0; d < D; d++) {
      let first = -1, last = -1, n = 0;
      for (let c = 0; c < S; c++) if (b[bi * DS + d * S + c]) { if (first < 0) first = c; last = c; n++; }
      if (first >= 0) soft += (last - first + 1 - n) * 2;
    }
  }
  return { hard, soft, cost: hard * W_HARD + soft };
}

/** Human readable version. Slower; used for reports and the manual-edit checker. */
export function detailed(P, g) {
  const { D, S, sessions: ss } = P, DS = D * S;
  const hard = [], soft = [];
  const fm = new Map(), bm = new Map(), rm = new Map(), sd = new Map();
  const push = (m, k, i) => { const a = m.get(k); a ? a.push(i) : m.set(k, [i]); };
  const when = (d, c) => `${P.days[d]} ${P.labels[c]}`;

  ss.forEach((s, i) => {
    const d = g[3 * i], c = g[3 * i + 1], ri = g[3 * i + 2], room = P.rooms[ri];
    if (c < 0 || d < 0 || d >= D || c + s.length > S) {
      hard.push({ type: 'overflow', message: `${s.label} does not fit inside the day.`, sessions: [i] });
      return;
    }
    if (room.capacity < s.size)
      hard.push({ type: 'capacity', message: `${room.name} seats ${room.capacity} but ${P.batchNames[s.b]} has ${s.size} students (${s.label}).`, sessions: [i] });
    if (room.type !== s.roomType)
      hard.push({ type: 'roomType', message: `${s.label} needs a ${s.roomType}, but ${room.name} is a ${room.type}.`, sessions: [i] });
    for (let t = 0; t < s.length; t++) {
      const cell = d * S + c + t;
      push(fm, s.f * DS + cell, i); push(bm, s.b * DS + cell, i); push(rm, ri * DS + cell, i);
      if (P.unavail[s.f * DS + cell])
        hard.push({ type: 'unavailable', message: `${P.facultyNames[s.f]} is unavailable on ${when(d, c + t)} (${s.label}).`, sessions: [i] });
      if (P.dislike[s.f * DS + cell])
        soft.push({ type: 'dislike', message: `${P.facultyNames[s.f]} prefers not to teach on ${when(d, c + t)} (${s.label}).`, sessions: [i] });
    }
    push(sd, s.subj * D + d, i);
  });

  const seen = new Set();
  const clash = (m, type, text) => {
    for (const [k, a] of m) {
      if (a.length < 2) continue;
      const sessions = [...new Set(a)].sort((x, y) => x - y);
      const key = type + sessions.join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      const cell = k % DS, ent = Math.floor(k / DS);
      hard.push({ type, message: text(ent, `${when(Math.floor(cell / S), cell % S)}`, sessions.map((i) => ss[i].label).join(' and ')), sessions });
    }
  };
  clash(fm, 'faculty', (e, w, l) => `${P.facultyNames[e]} is double-booked on ${w}: ${l}.`);
  clash(bm, 'batch', (e, w, l) => `Batch ${P.batchNames[e]} has two classes on ${w}: ${l}.`);
  clash(rm, 'room', (e, w, l) => `Room ${P.rooms[e].name} is double-booked on ${w}: ${l}.`);
  for (const [k, a] of sd)
    if (a.length > 1) soft.push({ type: 'sameDay', message: `${ss[a[0]].label} meets ${a.length} times on ${P.days[k % D]}.`, sessions: a });
  return { hard, soft };
}

/** What would happen if session i were moved to (day, slot, roomIndex)? Only issues involving i are reported. */
export function checkPlacement(P, g, i, day, slot, roomIdx) {
  const g2 = Int32Array.from(g);
  g2[3 * i] = day; g2[3 * i + 1] = slot; g2[3 * i + 2] = roomIdx;
  const { hard, soft } = detailed(P, g2);
  return { hard: hard.filter((x) => x.sessions.includes(i)), soft: soft.filter((x) => x.sessions.includes(i)) };
}
