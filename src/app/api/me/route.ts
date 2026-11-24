// GET /api/me — who am I?
import type { NextRequest } from 'next/server';
import { error, json, requireSession } from '@/lib/api';
import { findUserById } from '@/lib/users';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const auth = requireSession(request);
  if (!auth.ok) return auth.response;

  const user = await findUserById(auth.session.userId);
  if (!user) return error('authentication required', 401);
  return json({
    user: { id: user.id, username: user.username, displayName: user.displayName },
  });
}
