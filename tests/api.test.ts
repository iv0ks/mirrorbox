// Route-handler tests that do not need a live database.
//
// The full exploit (log in as alice, reach bob's confidential dossier through
// all four id formats) is verified end-to-end against the Docker stack (see
// SOLUTION.md). Here the data layer is replaced by a spy, which lets us pin
// the things that matter without Postgres:
//   1. every dossier route still demands a valid *session* (authentication),
//   2. the four by-* lookups then serve whichever dossier the id/uuid/handle/
//      code resolves to — no ownership check (the lab, CWE-639), and
//   3. GET /api/dossiers stays correctly scoped to the caller's own rows.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const ALICE_DOSSIER = {
  id: 1,
  uuid: '8f14e45f-ceea-467e-bd97-aa41e4e04000',
  handle: 'alice-handle',
  code: 'alice-code',
  ownerId: 1,
  title: "Alice's dossier",
  body: 'internal notes',
  classification: 'internal',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const BOB_DOSSIER = {
  id: 2,
  uuid: '3b241101-e2bb-4255-8caf-4136c566a962',
  handle: 'bob-handle',
  code: 'bob-code',
  ownerId: 2,
  title: 'CONFIDENTIAL: internal fraud review',
  body: 'Evidence lock code: FLAG{MIRRORBOX_SAME_BUG_EVERY_DISGUISE}',
  classification: 'confidential',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const dossiers = vi.hoisted(() => ({
  listForOwner: vi.fn(async (ownerId: number) =>
    ownerId === 1 ? [ALICE_DOSSIER] : ownerId === 2 ? [BOB_DOSSIER] : [],
  ),
  findById: vi.fn(async (id: number) => (id === 1 ? ALICE_DOSSIER : id === 2 ? BOB_DOSSIER : null)),
  findByUuid: vi.fn(async (uuid: string) =>
    uuid === ALICE_DOSSIER.uuid ? ALICE_DOSSIER : uuid === BOB_DOSSIER.uuid ? BOB_DOSSIER : null,
  ),
  findByHandle: vi.fn(async (handle: string) =>
    handle === ALICE_DOSSIER.handle
      ? ALICE_DOSSIER
      : handle === BOB_DOSSIER.handle
        ? BOB_DOSSIER
        : null,
  ),
  findByCode: vi.fn(async (code: string) =>
    code === ALICE_DOSSIER.code ? ALICE_DOSSIER : code === BOB_DOSSIER.code ? BOB_DOSSIER : null,
  ),
}));
vi.mock('../src/lib/dossiers', () => dossiers);

const users = vi.hoisted(() => ({
  findUserByUsername: vi.fn(async (username: string) =>
    username === 'alice'
      ? { id: 1, username: 'alice', passwordHash: HASH, displayName: 'Alice' }
      : undefined,
  ),
  findUserById: vi.fn(async (id: number) =>
    id === 1 ? { id: 1, username: 'alice', displayName: 'Alice' } : undefined,
  ),
}));
vi.mock('../src/lib/users', () => users);

import { hashPassword } from '../src/lib/password';
const HASH = hashPassword('password123');

import { GET as healthz } from '../src/app/healthz/route';
import { POST as login } from '../src/app/api/login/route';
import { GET as me } from '../src/app/api/me/route';
import { GET as ownBoard } from '../src/app/api/dossiers/route';
import { GET as byId } from '../src/app/api/dossiers/by-id/[id]/route';
import { GET as byUuid } from '../src/app/api/dossiers/by-uuid/[uuid]/route';
import { GET as byHandle } from '../src/app/api/dossiers/by-handle/[handle]/route';
import { GET as byCode } from '../src/app/api/dossiers/by-code/[code]/route';
import { createSessionToken } from '../src/lib/session';

function req(path: string, as?: { id: number }) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: as ? { cookie: `mirrorbox_session=${createSessionToken(as.id)}` } : {},
  });
}

const params = (key: string, value: string) => ({ params: Promise.resolve({ [key]: value }) });

beforeEach(() => vi.clearAllMocks());

describe('public surface', () => {
  it('serves the health check', async () => {
    const res = await healthz();
    expect(res.status).toBe(200);
  });

  it('rejects a login without credentials', async () => {
    const res = await login(
      new NextRequest('http://localhost:3000/api/login', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects a wrong password', async () => {
    const res = await login(
      new NextRequest('http://localhost:3000/api/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'alice', password: 'nope' }),
      }),
    );
    expect(res.status).toBe(401);
  });
});

describe('authentication required', () => {
  it.each([
    ['/api/me', me, {}],
    ['/api/dossiers', ownBoard, {}],
    ['/api/dossiers/by-id/1', byId, params('id', '1')],
    ['/api/dossiers/by-uuid/x', byUuid, params('uuid', ALICE_DOSSIER.uuid)],
    ['/api/dossiers/by-handle/x', byHandle, params('handle', ALICE_DOSSIER.handle)],
    ['/api/dossiers/by-code/x', byCode, params('code', ALICE_DOSSIER.code)],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ] as [string, (req: NextRequest, ctx?: any) => Promise<Response>, unknown][])(
    'rejects %s with no session',
    async (path, handler, ctx) => {
      const res = await handler(req(path), ctx);
      expect(res.status).toBe(401);
    },
  );
});

describe('the own board stays correctly scoped', () => {
  it("returns only the caller's dossiers", async () => {
    const res = await ownBoard(req('/api/dossiers', { id: 1 }));
    const body = await res.json();
    expect(body.dossiers).toEqual([JSON.parse(JSON.stringify(ALICE_DOSSIER))]);
  });
});

describe('the lab: every lookup format reaches the same unauthorized dossier (CWE-639)', () => {
  it('by-id: alice reaches bob\u2019s confidential dossier', async () => {
    const res = await byId(req('/api/dossiers/by-id/2', { id: 1 }), params('id', '2'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.dossier.id).toBe(2);
    expect(body.dossier.body).toContain('FLAG{');
  });

  it('by-uuid: alice reaches the same dossier through its UUID', async () => {
    const res = await byUuid(
      req(`/api/dossiers/by-uuid/${BOB_DOSSIER.uuid}`, { id: 1 }),
      params('uuid', BOB_DOSSIER.uuid),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).dossier.id).toBe(2);
  });

  it('by-handle: alice reaches the same dossier through its base64 handle', async () => {
    const res = await byHandle(
      req(`/api/dossiers/by-handle/${BOB_DOSSIER.handle}`, { id: 1 }),
      params('handle', BOB_DOSSIER.handle),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).dossier.id).toBe(2);
  });

  it('by-code: alice reaches the same dossier through its hashids code', async () => {
    const res = await byCode(
      req(`/api/dossiers/by-code/${BOB_DOSSIER.code}`, { id: 1 }),
      params('code', BOB_DOSSIER.code),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).dossier.id).toBe(2);
  });
});

describe('malformed references are rejected before lookup', () => {
  it('by-uuid: 400 on a non-uuid shape', async () => {
    const res = await byUuid(
      req('/api/dossiers/by-uuid/not-a-uuid', { id: 1 }),
      params('uuid', 'not-a-uuid'),
    );
    expect(res.status).toBe(400);
  });

  it('by-id: 400 on a non-numeric id', async () => {
    const res = await byId(req('/api/dossiers/by-id/abc', { id: 1 }), params('id', 'abc'));
    expect(res.status).toBe(400);
  });

  it('by-handle: 404 when the handle does not decode to a known dossier', async () => {
    const res = await byHandle(
      req('/api/dossiers/by-handle/!!!', { id: 1 }),
      params('handle', '!!!'),
    );
    expect(res.status).toBe(404);
  });
});
