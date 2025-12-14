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

export async function purchaseSweet(id: number, quantity?: number) {
  if (quantity === undefined || typeof quantity !== 'number' || quantity <= 0) {
    const err: any = new Error('Invalid quantity');
    err.status = 400;
    throw err;
  }

  const updated = await repo.purchaseSweet(id, quantity);
  if (updated) return updated;

  // determine if it's because the sweet doesn't exist or insufficient stock
  const existing = await repo.findSweetById(id);
  if (!existing) {
    const err: any = new Error('Not found');
    err.status = 404;
    throw err;
  }

  const err: any = new Error('Insufficient stock');
  err.status = 400;
  throw err;
}

export async function restockSweet(id: number, quantity?: number) {
  if (quantity === undefined || typeof quantity !== 'number' || quantity <= 0) {
    const err: any = new Error('Invalid quantity');
    err.status = 400;
    throw err;
  }

  const updated = await repo.restockSweet(id, quantity);
  if (updated) return updated;

  const err: any = new Error('Not found');
  err.status = 404;
  throw err;
}

export async function searchSweets(filters: { name?: string; category?: string; minPrice?: any; maxPrice?: any; }) {
  const { name, category, minPrice, maxPrice } = filters;

  // Validate prices if present
  if (minPrice !== undefined) {
    const m = Number(minPrice);
    if (Number.isNaN(m) || m < 0) {
      const err: any = new Error('Invalid minPrice');
      err.status = 400;
      throw err;
    }
    filters.minPrice = m;
  }

  if (maxPrice !== undefined) {
    const m = Number(maxPrice);
    if (Number.isNaN(m) || m < 0) {
      const err: any = new Error('Invalid maxPrice');
      err.status = 400;
      throw err;
    }
    filters.maxPrice = m;
  }

  if (filters.minPrice !== undefined && filters.maxPrice !== undefined) {
    if (Number(filters.minPrice) > Number(filters.maxPrice)) {
      const err: any = new Error('minPrice greater than maxPrice');
      err.status = 400;
      throw err;
    }
  }

  return repo.searchSweets({ name, category, minPrice: filters.minPrice, maxPrice: filters.maxPrice });
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
