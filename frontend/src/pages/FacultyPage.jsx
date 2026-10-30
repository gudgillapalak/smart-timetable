import { useState } from 'react';
import CrudPage from '../components/CrudPage';
import PrefPanel from '../components/PrefPanel';

export default function FacultyPage() {
  const [pref, setPref] = useState(null);
  const [bump, setBump] = useState(0);
  return (
    <>
      <CrudPage title="Faculty" reloadKey={bump} endpoint="/faculty"
        intro="Add teachers, give them a login, and mark the slots they cannot or would rather not teach."
        columns={[
          { key: 'name', label: 'Name' }, { key: 'department', label: 'Department' },
          { key: 'subjects', label: 'Subjects' },
          { key: 'unavailable_count', label: 'Unavailable', render: (r) => (r.unavailable_count ? <span className="tag unavailable">{r.unavailable_count} slots</span> : '—') },
          { key: 'dislike_count', label: 'Disliked', render: (r) => (r.dislike_count ? <span className="tag dislike">{r.dislike_count} slots</span> : '—') },
          { key: 'username', label: 'Login' },
        ]}
        fields={[
          { name: 'name', label: 'Full name' }, { name: 'email', label: 'Email', optional: true }, { name: 'department', label: 'Department', optional: true },
          { name: 'username', label: 'Login username', optional: true, hint: 'Leave empty if this person does not need to sign in.' },
          { name: 'password', label: 'Password', type: 'password', optional: true, hint: 'New logins default to “faculty123”. Fill in only to set or change it.' },
        ]}
        rowActions={[{ label: 'Slots', onClick: setPref }]} />
      {pref && (
        <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && setPref(null)}>
          <div className="modal wide">
            <h3>Slots for {pref.name}</h3>
            <PrefPanel facultyId={pref.id} onSaved={() => setBump((b) => b + 1)} />
            <div className="modal-actions"><button className="btn" onClick={() => setPref(null)}>Close</button></div>
          </div>
        </div>
      )}
    </>
  );
}
