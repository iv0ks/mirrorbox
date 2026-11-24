// GET /api/dossiers — your own board.
//
// SAFE: the one correctly scoped query in the lab. It is the baseline the
// README asks you to compare against the four by-* lookups below.
import type { NextRequest } from 'next/server';
import { json, requireSession } from '@/lib/api';
import { listForOwner } from '@/lib/dossiers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const dossiers = await listForOwner(auth.session.userId);
  return json({ dossiers });
}
