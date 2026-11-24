// Data access for dossiers. None of these functions check who is asking — the
// route handlers decide that (or, in the lab, forget to).
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { dossiers, type Dossier } from '../db/schema';
import { decodeCode, decodeHandle, encodeCode, encodeHandle } from './ids';

export type DossierView = {
  id: number;
  uuid: string;
  handle: string;
  code: string;
  ownerId: number;
  title: string;
  body: string;
  classification: string;
  createdAt: Date;
};

function toView(row: Dossier): DossierView {
  return {
    id: row.id,
    uuid: row.uuid,
    handle: encodeHandle(row.id),
    code: encodeCode(row.id),
    ownerId: row.ownerId,
    title: row.title,
    body: row.body,
    classification: row.classification,
    createdAt: row.createdAt,
  };
}

// SAFE: the only correctly scoped query in the lab — the caller's own board.
export async function listForOwner(ownerId: number): Promise<DossierView[]> {
  const rows = await db.select().from(dossiers).where(eq(dossiers.ownerId, ownerId));
  return rows.map(toView);
}

// ⚠️ Every one of the next four lookups resolves the row by ONE column and
// never compares it against the caller's identity. Whichever format the
// client used to name the row, the result is the same unauthorized read.

export async function findById(id: number): Promise<DossierView | null> {
  const [row] = await db.select().from(dossiers).where(eq(dossiers.id, id)).limit(1);
  return row ? toView(row) : null;
}

export async function findByUuid(uuid: string): Promise<DossierView | null> {
  const [row] = await db.select().from(dossiers).where(eq(dossiers.uuid, uuid)).limit(1);
  return row ? toView(row) : null;
}

export async function findByHandle(handle: string): Promise<DossierView | null> {
  const id = decodeHandle(handle);
  return id === null ? null : findById(id);
}

export async function findByCode(code: string): Promise<DossierView | null> {
  const id = decodeCode(code);
  return id === null ? null : findById(id);
}
