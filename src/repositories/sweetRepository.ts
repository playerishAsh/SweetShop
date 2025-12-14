import { pool } from '../db';

export interface SweetRecord {
  id: number;
  name: string;
  category: string;
  price: number;
  quantity: number;
}

export async function createSweet(data: { name: string; category: string; price: number; quantity: number; }): Promise<SweetRecord> {
  const res = await pool.query(
    'INSERT INTO sweets (name, category, price, quantity) VALUES ($1, $2, $3, $4) RETURNING id, name, category, price, quantity',
    [data.name, data.category, data.price, data.quantity]
  );
  return res.rows[0];
}

export async function findAllSweets(): Promise<SweetRecord[]> {
  const res = await pool.query('SELECT id, name, category, price, quantity FROM sweets');
  return res.rows;
}

export async function findSweetById(id: number): Promise<SweetRecord | null> {
  const res = await pool.query('SELECT id, name, category, price, quantity FROM sweets WHERE id = $1', [id]);
  return res.rows[0] ?? null;
}

export async function updateSweet(id: number, data: Partial<Omit<SweetRecord, 'id'>>): Promise<SweetRecord | null> {
  const existing = await findSweetById(id);
  if (!existing) return null;
  const name = data.name ?? existing.name;
  const category = data.category ?? existing.category;
  const price = data.price ?? existing.price;
  const quantity = data.quantity ?? existing.quantity;
  const res = await pool.query(
    'UPDATE sweets SET name=$1, category=$2, price=$3, quantity=$4 WHERE id=$5 RETURNING id, name, category, price, quantity',
    [name, category, price, quantity, id]
  );
  return res.rows[0];
}

export async function deleteSweet(id: number): Promise<boolean> {
  const res = await pool.query('DELETE FROM sweets WHERE id = $1', [id]);
  // rowCount can be null in pool typings, guard using nullish coalescing
  return (res.rowCount ?? 0) > 0;
}

export async function purchaseSweet(id: number, quantity: number): Promise<SweetRecord | null> {
  const res = await pool.query(
    'UPDATE sweets SET quantity = quantity - $2 WHERE id = $1 AND quantity >= $2 RETURNING id, name, category, price, quantity',
    [id, quantity]
  );
  return res.rows[0] ?? null;
}

export async function restockSweet(id: number, quantity: number): Promise<SweetRecord | null> {
  const res = await pool.query(
    'UPDATE sweets SET quantity = quantity + $2 WHERE id = $1 RETURNING id, name, category, price, quantity',
    [id, quantity]
  );
  return res.rows[0] ?? null;
}

export async function searchSweets(filters: { name?: string; category?: string; minPrice?: number; maxPrice?: number; }) : Promise<SweetRecord[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (filters.name) {
    conditions.push(`name ILIKE '%' || $${idx} || '%'`);
    params.push(filters.name);
    idx++;
  }

  if (filters.category) {
    // case-insensitive exact match
    conditions.push(`LOWER(category) = LOWER($${idx})`);
    params.push(filters.category);
    idx++;
  }

  if (filters.minPrice !== undefined) {
    conditions.push(`price >= $${idx}`);
    params.push(filters.minPrice);
    idx++;
  }

  if (filters.maxPrice !== undefined) {
    conditions.push(`price <= $${idx}`);
    params.push(filters.maxPrice);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT id, name, category, price, quantity FROM sweets ${where}`;
  const res = await pool.query(sql, params);
  return res.rows;
}
