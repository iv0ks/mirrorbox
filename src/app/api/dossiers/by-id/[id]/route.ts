// GET /api/dossiers/by-id/:id — look a dossier up by its SEQUENTIAL id.
//
// ⚠️ READ IDOR: authenticates the caller, then returns whichever dossier
// matches the id — never compares it against the caller's own id. The four
// routes under api/dossiers/by-* share this exact shape; only the format of
// the reference, and the one-line decode step, differ between them.
import type { NextRequest } from 'next/server';
import { error, json, requireSession, toId } from '@/lib/api';
import { findById } from '@/lib/dossiers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const id = toId((await context.params).id);
  if (id === null) return error('invalid dossier id', 400);

  const dossier = await findById(id);
  if (!dossier) return error('dossier not found', 404);
  return json({ dossier });
}
