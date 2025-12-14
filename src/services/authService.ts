import { createUser as repoCreateUser, findByEmail } from '../repositories/userRepository';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function registerUser(email: string, password: string) {
  if (!email || !password) {
    const err: any = new Error('Missing fields');
    err.status = 400;
    throw err;
  }

  const existing = await findByEmail(email);
  if (existing) {
    const err: any = new Error('Duplicate');
    err.status = 409;
    throw err;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await repoCreateUser(email, hashed, 'USER');

  // Do not return password
  return { id: user.id, email: user.email, role: user.role };
}

export async function loginUser(email: string, password: string) {
  if (!email || !password) {
    const err: any = new Error('Missing fields');
    err.status = 400;
    throw err;
  }

  const user = await findByEmail(email);
  if (!user) {
    const err: any = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    const err: any = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, secret, {
    expiresIn: '1h'
  });

  return token;
}
