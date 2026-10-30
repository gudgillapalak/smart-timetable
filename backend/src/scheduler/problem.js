// Turns database rows into a compact numeric "problem" the optimisers can chew on quickly.
// A solution ("genes") is an Int32Array: [day, slot, roomIndex] for every session, back to back.

export const W_HARD = 100; // one hard violation costs as much as 100 soft penalty points

export function slotLabels(startTime = '09:00', minutes = 60, n = 8) {
  const [h, m] = startTime.split(':').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const t = h * 60 + m + i * minutes;
    return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  });
}

/** subject x sessions_per_week  ->  one entry per weekly session */
export function expandSessions(subjects) {
  return subjects.flatMap((s) =>
    Array.from({ length: s.sessions_per_week }, () => ({
      subject_id: s.id, code: s.code, name: s.name, type: s.type,
      batch_id: s.batch_id, faculty_id: s.faculty_id, length: s.duration || (s.type === 'lab' ? 2 : 1),
    })));
}

export function buildProblem({ config, faculty, prefs, rooms, batches, sessions }) {
  const D = config.days.length, S = config.slotsPerDay, DS = D * S;
  const fi = new Map(faculty.map((f, i) => [f.id, i]));
  const bi = new Map(batches.map((b, i) => [b.id, i]));
  const subjIds = [...new Set(sessions.map((s) => s.subject_id))];
  const si = new Map(subjIds.map((id, i) => [id, i]));

  const unavail = new Uint8Array(faculty.length * DS);
  const dislike = new Uint8Array(faculty.length * DS);
  for (const p of prefs) {
    const f = fi.get(p.faculty_id);
    if (f === undefined || p.day >= D || p.slot >= S) continue;
    (p.kind === 'unavailable' ? unavail : dislike)[f * DS + p.day * S + p.slot] = 1;
  }

  const choiceCache = new Map();
  const choicesFor = (roomType, size) => {
    const key = roomType + size;
    if (!choiceCache.has(key)) {
      let c = rooms.map((r, i) => [r, i]).filter(([r]) => r.type === roomType && r.capacity >= size).map(([, i]) => i);
      if (!c.length) c = rooms.map((r, i) => [r, i]).filter(([r]) => r.type === roomType).map(([, i]) => i);
      if (!c.length) c = rooms.map((_, i) => i);
      choiceCache.set(key, c);
    }
    return choiceCache.get(key);
  };

  const ss = sessions.map((s) => {
    const b = bi.get(s.batch_id);
    const roomType = s.type === 'lab' ? 'lab' : 'classroom';
    return {
      id: s.id ?? null, subject_id: s.subject_id, subj: si.get(s.subject_id), code: s.code, name: s.name,
      type: s.type, length: s.length, b, f: fi.get(s.faculty_id), size: batches[b].size, roomType,
      choices: choicesFor(roomType, batches[b].size), label: `${s.code} (${batches[b].name})`,
    };
  });

  return {
    D, S, days: config.days, labels: slotLabels(config.startTime, config.slotMinutes, S),
    nF: faculty.length, nB: batches.length, nR: rooms.length, nSubj: subjIds.length,
    rooms, facultyIds: faculty.map((f) => f.id), facultyNames: faculty.map((f) => f.name),
    batchIds: batches.map((b) => b.id), batchNames: batches.map((b) => b.name),
    sessions: ss, unavail, dislike,
  };
}

/** Cheap sanity checks so we can explain *why* a data set cannot be scheduled. */
export function feasibilityIssues(P, subjects) {
  const issues = [];
  if (!P.sessions.length) issues.push('There are no subjects with sessions to schedule.');
  const needLab = P.sessions.some((s) => s.roomType === 'lab');
  const needRoom = P.sessions.some((s) => s.roomType === 'classroom');
  if (needLab && !P.rooms.some((r) => r.type === 'lab')) issues.push('Lab subjects exist but there is no lab room.');
  if (needRoom && !P.rooms.some((r) => r.type === 'classroom')) issues.push('Theory subjects exist but there is no classroom.');
  const cap = P.D * P.S;
  const bLoad = new Array(P.nB).fill(0), fLoad = new Array(P.nF).fill(0);
  for (const s of P.sessions) {
    if (s.length > P.S) issues.push(`${s.label}: session length ${s.length} is longer than a day (${P.S} slots).`);
    bLoad[s.b] += s.length; fLoad[s.f] += s.length;
  }
  bLoad.forEach((l, i) => l > cap && issues.push(`Batch ${P.batchNames[i]} needs ${l} slots but the week only has ${cap}.`));
  fLoad.forEach((l, i) => {
    let free = 0;
    for (let c = 0; c < cap; c++) if (!P.unavail[i * cap + c]) free++;
    if (l > free) issues.push(`${P.facultyNames[i]} teaches ${l} slots but is available for only ${free}.`);
  });
  return issues;
}
