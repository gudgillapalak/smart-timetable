// Demo data: 3 batches, 8 faculty, 5 rooms, 18 subjects (~40 weekly sessions)
export const config = { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], slotsPerDay: 7, startTime: '09:00', slotMinutes: 60 };
export const batches = [
  { id: 1, name: 'CSE-A', size: 60 }, { id: 2, name: 'CSE-B', size: 55 }, { id: 3, name: 'IT-A', size: 40 },
];
export const rooms = [
  { id: 1, name: 'R101', capacity: 70, type: 'classroom' }, { id: 2, name: 'R102', capacity: 60, type: 'classroom' },
  { id: 3, name: 'R103', capacity: 45, type: 'classroom' }, { id: 4, name: 'LAB1', capacity: 60, type: 'lab' },
  { id: 5, name: 'LAB2', capacity: 45, type: 'lab' },
];
export const faculty = [
  'Dr. Anita Rao', 'Prof. Vikram Patil', 'Dr. Sneha Kulkarni', 'Prof. Rahul Deshmukh',
  'Dr. Meera Iyer', 'Prof. Sanjay Joshi', 'Dr. Neha Gupta', 'Prof. Arjun Nair',
].map((name, i) => ({ id: i + 1, name, email: `fac${i + 1}@college.edu`, department: i < 6 ? 'CSE' : 'IT' }));

const tpl = [
  ['DSA', 'Data Structures', 'theory', 3], ['DBMS', 'Database Systems', 'theory', 3],
  ['OS', 'Operating Systems', 'theory', 3], ['CN', 'Computer Networks', 'theory', 2],
  ['DSAL', 'DS Lab', 'lab', 1], ['DBML', 'DBMS Lab', 'lab', 1],
];
// faculty id for [DSA, DBMS, OS, CN, DSAL, DBML] per batch
const assign = { 1: [1, 2, 3, 4, 1, 2], 2: [5, 6, 3, 7, 5, 6], 3: [8, 2, 4, 7, 8, 2] };
export const subjects = batches.flatMap((b) =>
  tpl.map(([code, name, type, spw], k) => ({
    code, name, type, sessions_per_week: spw, duration: type === 'lab' ? 2 : 1, faculty_id: assign[b.id][k], batch_id: b.id,
  })));
export const prefs = [
  ...[0, 1].map((slot) => ({ faculty_id: 1, day: 0, slot, kind: 'unavailable' })),
  ...[5, 6].map((slot) => ({ faculty_id: 1, day: 4, slot, kind: 'dislike' })),
  ...[0, 1, 2].map((slot) => ({ faculty_id: 2, day: 2, slot, kind: 'unavailable' })),
  ...[0, 1, 2, 3, 4, 5, 6].map((slot) => ({ faculty_id: 3, day: 3, slot, kind: 'unavailable' })),
  ...[0].map((slot) => ({ faculty_id: 4, day: 1, slot, kind: 'dislike' })),
  ...[6].map((slot) => ({ faculty_id: 5, day: 0, slot, kind: 'dislike' })),
];
