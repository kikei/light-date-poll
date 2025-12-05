import express from 'express';
import formsRouter from './forms.js';
import votesRouter from './votes.js';

const router = express.Router();

router.use('/api', formsRouter);
router.use('/api', votesRouter);

export default router;
