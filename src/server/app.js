import express from 'express';
import path from 'node:path';
import apiRouter from './routes/index.js';
import { JSON_LIMIT, PUBLIC_DIR } from './config.js';

const app = express();

app.use(express.json({ limit: JSON_LIMIT }));
app.use(express.static(PUBLIC_DIR));

app.use(apiRouter);

// Routing is by hash fragment, which never reaches the server, so the only
// path that needs index.html is a bare navigation. Falling back for
// everything hid a removed endpoint behind a 200 and served HTML in place
// of a deleted module, where the import fails on the MIME type instead of
// saying the file is gone.
const looksLikeFile = url => /\.[a-z0-9]+$/i.test(url.split('?')[0]);

app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

app.use((req, res) => {
  if (looksLikeFile(req.originalUrl)) return res.status(404).send('Not Found');
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

export default app;
