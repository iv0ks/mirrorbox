// GET /api/dossiers/by-uuid/:uuid — look a dossier up by its UUID.
//
// ⚠️ Same read IDOR as by-id, under the format that "looks unguessable". A
// UUID cannot be brute-forced, but that was never the control — whoever
// captures or leaks one (shared link, referrer, another response) reads the
// dossier it names, owner or not.
import type { NextRequest } from 'next/server';
import { error, json, requireSession } from '@/lib/api';
import { findByUuid } from '@/lib/dossiers';
import { isUuid } from '@/lib/ids';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uuid: string }> },
): Promise<Response> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const { uuid } = await context.params;
  if (!isUuid(uuid)) return error('invalid dossier uuid', 400);

  const dossier = await findByUuid(uuid);
  if (!dossier) return error('dossier not found', 404);
  return json({ dossier });
}
