import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/authRoutes.js';
import faculty from './routes/faculty.js';
import settings from './routes/settings.js';
import generate from './routes/generate.js';
import timetables from './routes/timetables.js';
import { rooms, batches, subjects } from './routes/crud.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/faculty', faculty);
app.use('/api/subjects', subjects);
app.use('/api/rooms', rooms);
app.use('/api/batches', batches);
app.use('/api/settings', settings);
app.use('/api/generate', generate);
app.use('/api/timetables', timetables);

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'That value already exists. Use a different name or code.' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2')
    return res.status(409).json({ error: 'This record is used by subjects or saved timetables. Remove those first.' });
  res.status(500).json({ error: err.message || 'Something went wrong.' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Timetable API on http://localhost:${port}`));
