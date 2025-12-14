import { Request, Response } from 'express';
import { registerUser } from '../services/authService';

export async function registerHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const user = await registerUser(email, password);
    res.status(201).json(user);
  } catch (err: any) {
    if (err && err.status) {
      res.status(err.status).json({ error: err.message });
    } else if (err && err.code === '23505') {
      // DB unique violation
      res.status(409).json({ error: 'Duplicate email' });
    } else {
      // generic
      // eslint-disable-next-line no-console
      console.error(err);
      res.status(500).json({ error: 'Internal error' });
    }
  }
}
