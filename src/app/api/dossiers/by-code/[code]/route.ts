// GET /api/dossiers/by-code/:code — look a dossier up by its hashids "code"
// (see src/lib/ids.ts).
//
// ⚠️ Same read IDOR a fourth time. Hashids obfuscates the id behind a short
// alphanumeric string, but the salt is ordinary configuration, not an access
// decision — anyone who can run the same (public) encoder can mint a valid
// code for any id and reach the identical unscoped lookup below.
import type { NextRequest } from 'next/server';
import { error, json, requireSession } from '@/lib/api';
import { findByCode } from '@/lib/dossiers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> },
): Promise<Response> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const { code } = await context.params;
  const dossier = await findByCode(code);
  if (!dossier) return error('dossier not found', 404);
  return json({ dossier });
}
