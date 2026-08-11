import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from './db/migrate.js';
import goalsRouter from './routes/goals.js';
import subjectsRouter from './routes/subjects.js';
import sessionsRouter from './routes/sessions.js';
import availabilityRouter from './routes/availability.js';
import blackoutDatesRouter from './routes/blackoutDates.js';
import notesRouter from './routes/notes.js';
import pacingRouter from './routes/pacingRoutes.js';
import metaRouter from './routes/meta.js';
import exportImportRouter from './routes/exportImport.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

migrate();

const app = express();
app.use(express.json());
app.use(express.text({ type: 'text/csv' }));

app.use('/api/goals', goalsRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/blackout-dates', blackoutDatesRouter);
app.use('/api/notes', notesRouter);
app.use('/api/pacing', pacingRouter);
app.use('/api/meta', metaRouter);
app.use('/api', exportImportRouter);

if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '..', 'dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

// Hardcoded rather than reading process.env.PORT: some dev tooling sets PORT for the frontend
// dev server, and inheriting that here would collide with Vite on the same port.
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
