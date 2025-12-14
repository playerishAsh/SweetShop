import { Request, Response } from 'express';
import * as service from '../services/sweetsService';

export async function createHandler(req: Request, res: Response) {
  try {
    const sweet = await service.createSweet(req.body);
    res.status(201).json(sweet);
  } catch (err: any) {
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function listHandler(_req: Request, res: Response) {
  const sweets = await service.listSweets();
  res.json(sweets);
}

export async function updateHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const updated = await service.updateSweet(id, req.body);
    res.json(updated);
  } catch (err: any) {
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function deleteHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    await service.deleteSweet(id);
    res.status(200).json({});
  } catch (err: any) {
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function purchaseHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const quantity = req.body.quantity;
    const updated = await service.purchaseSweet(id, quantity);
    res.json(updated);
  } catch (err: any) {
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
}

export async function restockHandler(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const quantity = req.body.quantity;
    const updated = await service.restockSweet(id, quantity);
    res.json(updated);
  } catch (err: any) {
    if (err && err.status) return res.status(err.status).json({ error: err.message });
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
}
