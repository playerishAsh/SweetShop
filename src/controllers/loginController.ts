import { Request, Response } from 'express';
import { loginUser } from '../services/authService';

export async function loginHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const token = await loginUser(email, password);
    res.json({ token });
  } catch (err: any) {
    if (err && err.status) {
      res.status(err.status).json({ error: err.message });
    } else {
      // eslint-disable-next-line no-console
      console.error(err);
      res.status(500).json({ error: 'Internal error' });
    }
  }
}
