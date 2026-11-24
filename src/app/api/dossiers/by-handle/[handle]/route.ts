// GET /api/dossiers/by-handle/:handle — look a dossier up by its base64url
// "handle" (`dossier:<id>`, see src/lib/ids.ts).
//
// ⚠️ Same read IDOR again. Decoding the handle only recovers the sequential id
// it was built from — the lookup that follows is the identical unscoped query,
// so forging a handle for ANY id (not just one you were ever shown) works too.
import type { NextRequest } from 'next/server';
import { error, json, requireSession } from '@/lib/api';
import { findByHandle } from '@/lib/dossiers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ handle: string }> },
): Promise<Response> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const { handle } = await context.params;
  const dossier = await findByHandle(handle);
  if (!dossier) return error('dossier not found', 404);
  return json({ dossier });
}
