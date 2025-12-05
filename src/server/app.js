import express from 'express';
import path from 'node:path';
import apiRouter from './routes/index.js';
import { JSON_LIMIT, PUBLIC_DIR } from './config.js';

const app = express();

app.use(express.json({ limit: JSON_LIMIT }));
app.use(express.static(PUBLIC_DIR));

app.use(apiRouter);

app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

export default app;
