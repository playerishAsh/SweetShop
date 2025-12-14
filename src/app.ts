import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRouter from './routes/health';
import pingRouter from './routes/ping';
import authRouter from './routes/auth';
import sweetsRouter from './routes/sweets';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);
app.use('/ping', pingRouter);
app.use('/api/auth', authRouter);
app.use('/api/sweets', sweetsRouter);

export default app;
