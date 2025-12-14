import { createUser as repoCreateUser, findByEmail } from '../repositories/userRepository';
import bcrypt from 'bcrypt';

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
