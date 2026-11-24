// Small helpers shared by the route handlers.
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken, type Session } from './session';

export function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

export function error(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// Authentication only: "is there a valid, correctly signed session?". Every
// lookup route in this lab stops here — none of them go on to ask whether the
// resolved dossier actually belongs to this session's owner.
export function requireSession(
  request: NextRequest,
): { ok: true; session: Session } | { ok: false; response: NextResponse } {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return { ok: false, response: error('authentication required', 401) };
  return { ok: true, session };
}

// Parse a positive integer from untrusted input, or return null.
export function toId(value: unknown): number | null {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
}
