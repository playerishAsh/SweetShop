import * as repo from '../repositories/sweetRepository';

export async function createSweet(data: { name?: string; category?: string; price?: number; quantity?: number; }) {
  if (!data.name || !data.category || data.price === undefined || data.quantity === undefined) {
    const err: any = new Error('Missing fields');
    err.status = 400;
    throw err;
  }
  const sweet = await repo.createSweet({ name: data.name, category: data.category, price: data.price, quantity: data.quantity });
  return sweet;
}

export async function listSweets() {
  return repo.findAllSweets();
}

export async function updateSweet(id: number, data: Partial<{ name: string; category: string; price: number; quantity: number; }>) {
  const updated = await repo.updateSweet(id, data as any);
  if (!updated) {
    const err: any = new Error('Not found');
    err.status = 404;
    throw err;
  }
  return updated;
}

export async function deleteSweet(id: number) {
  const ok = await repo.deleteSweet(id);
  if (!ok) {
    const err: any = new Error('Not found');
    err.status = 404;
    throw err;
  }
  return;
}
