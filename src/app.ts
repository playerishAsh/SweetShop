import express from 'express';
import dotenv from 'dotenv';
import healthRouter from './routes/health';
import pingRouter from './routes/ping';
import authRouter from './routes/auth';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/health', healthRouter);
app.use('/ping', pingRouter);
app.use('/api/auth', authRouter);

export default app;
