import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Login from './pages/Login';
import FacultyPage from './pages/FacultyPage';
import { SubjectsPage, RoomsPage, BatchesPage } from './pages/DataPages';
import SettingsPage from './pages/SettingsPage';
import GeneratePage from './pages/GeneratePage';
import TimetablesPage from './pages/TimetablesPage';
import TimetableEditor from './pages/TimetableEditor';
import { PublishedView, MyAvailability } from './pages/PublishedViews';

const NAV = {
  admin: [['/generate', 'Generate'], ['/timetables', 'Timetables'], ['/faculty', 'Faculty'], ['/subjects', 'Subjects'], ['/rooms', 'Rooms'], ['/batches', 'Batches'], ['/settings', 'Days & slots'], ['/student-view', 'Student view']],
  faculty: [['/my-timetable', 'My timetable'], ['/availability', 'My availability'], ['/student-view', 'Student view']],
  student: [['/student-view', 'Timetable']],
};
const HOME = { admin: '/generate', faculty: '/my-timetable', student: '/student-view' };

function Shell() {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="shell">
      <aside className="side no-print">
        <div className="brand">Smart<br />Timetable</div>
        <nav>{NAV[user.role].map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav>
        <div className="who">
          <b>{user.faculty_name || user.username}</b>
          <span>{user.role}</span>
          <button className="link" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}

const Only = ({ roles, children }) => {
  const { user } = useAuth();
  return roles.includes(user.role) ? children : <Navigate to={HOME[user.role]} replace />;
};

export default function App() {
  const { user } = useAuth();
  const admin = (el) => <Only roles={['admin']}>{el}</Only>;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={HOME[user.role]} replace /> : <Login />} />
      <Route element={<Shell />}>
        <Route index element={user ? <Navigate to={HOME[user.role]} replace /> : null} />
        <Route path="/generate" element={admin(<GeneratePage />)} />
        <Route path="/timetables" element={admin(<TimetablesPage />)} />
        <Route path="/timetables/:id" element={admin(<TimetableEditor />)} />
        <Route path="/faculty" element={admin(<FacultyPage />)} />
        <Route path="/subjects" element={admin(<SubjectsPage />)} />
        <Route path="/rooms" element={admin(<RoomsPage />)} />
        <Route path="/batches" element={admin(<BatchesPage />)} />
        <Route path="/settings" element={admin(<SettingsPage />)} />
        <Route path="/my-timetable" element={<Only roles={['faculty']}><PublishedView mode="mine" /></Only>} />
        <Route path="/availability" element={<Only roles={['faculty']}><MyAvailability /></Only>} />
        <Route path="/student-view" element={<PublishedView mode="student" />} />
      </Route>
    </Routes>
  );
}
