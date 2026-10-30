import CrudPage from '../components/CrudPage';

export const RoomsPage = () => (
  <CrudPage title="Rooms" intro="Lab subjects are only placed in lab rooms; theory subjects in classrooms that fit the batch."
    endpoint="/rooms" blank={{ type: 'classroom', capacity: 60 }}
    columns={[{ key: 'name', label: 'Room' }, { key: 'capacity', label: 'Capacity' }, { key: 'type', label: 'Type', render: (r) => <span className={`tag ${r.type}`}>{r.type}</span> }]}
    fields={[{ name: 'name', label: 'Room name' }, { name: 'capacity', label: 'Capacity', type: 'number' },
      { name: 'type', label: 'Type', type: 'select', options: [{ value: 'classroom', label: 'Classroom' }, { value: 'lab', label: 'Lab' }] }]} />
);

export const BatchesPage = () => (
  <CrudPage title="Batches" intro="A batch is a group of students who attend every class together."
    endpoint="/batches" blank={{ size: 60 }}
    columns={[{ key: 'name', label: 'Batch' }, { key: 'size', label: 'Students' }]}
    fields={[{ name: 'name', label: 'Batch name' }, { name: 'size', label: 'Number of students', type: 'number' }]} />
);

export const SubjectsPage = () => (
  <CrudPage title="Subjects" intro="Each subject belongs to one batch and one faculty member. Labs usually run for two consecutive slots."
    endpoint="/subjects" blank={{ type: 'theory', sessions_per_week: 3, duration: 1 }}
    onFieldChange={(v, name) => (name === 'type' ? { ...v, duration: v.type === 'lab' ? 2 : 1, sessions_per_week: v.type === 'lab' ? 1 : v.sessions_per_week } : v)}
    columns={[
      { key: 'code', label: 'Code' }, { key: 'name', label: 'Subject' },
      { key: 'type', label: 'Type', render: (r) => <span className={`tag ${r.type}`}>{r.type}</span> },
      { key: 'sessions_per_week', label: 'Sessions / week' }, { key: 'duration', label: 'Slots each' },
      { key: 'faculty_name', label: 'Faculty' }, { key: 'batch_name', label: 'Batch' },
    ]}
    fields={[
      { name: 'code', label: 'Subject code' }, { name: 'name', label: 'Subject name' },
      { name: 'type', label: 'Type', type: 'select', options: [{ value: 'theory', label: 'Theory' }, { value: 'lab', label: 'Lab' }] },
      { name: 'sessions_per_week', label: 'Sessions per week', type: 'number' },
      { name: 'duration', label: 'Slots per session', type: 'number', hint: 'A lab of 2 slots always sits in two back-to-back slots.' },
      { name: 'faculty_id', label: 'Faculty', type: 'select', optionsFrom: { endpoint: '/faculty', label: (x) => x.name } },
      { name: 'batch_id', label: 'Batch', type: 'select', optionsFrom: { endpoint: '/batches', label: (x) => `${x.name} (${x.size})` } },
    ]} />
);
