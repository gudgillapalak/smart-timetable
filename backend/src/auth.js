import jwt from 'jsonwebtoken';
const SECRET = process.env.JWT_SECRET || 'dev-secret';

export const signToken = (u) =>
  jwt.sign({ id: u.id, username: u.username, role: u.role, faculty_id: u.faculty_id }, SECRET, { expiresIn: '12h' });

/** auth() = any signed-in user, auth('admin') = admin only, auth('admin','faculty') ... */
export const auth = (...roles) => (req, res, next) => {
  const h = req.headers.authorization || '';
  try {
    req.user = jwt.verify(h.replace('Bearer ', ''), SECRET);
  } catch {
    return res.status(401).json({ error: 'Please sign in again.' });
  }
  if (roles.length && !roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to do that.' });
  next();
};
