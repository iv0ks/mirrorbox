// Seed script — idempotent, resets the lab to a known state on boot.
//
// Three investigators, four dossiers. Dossier 2 is bob's confidential case
// file and carries the FLAG. alice can only see her own board
// (`GET /api/dossiers`); reaching dossier 2 through ANY of the four id formats
// — sequential, UUID, base64 handle or hashids code — is the lab.
import { db, sql } from './client';
import { dossiers, users } from './schema';
import { hashPassword } from '../lib/password';
import { config } from '../config';

const seedUsers = [
  { id: 1, username: 'alice', password: 'password123', displayName: 'Alice Martins' },
  {
    id: 2,
    username: 'bob',
    password: 'correct-horse-battery-staple',
    displayName: 'Bob Keller',
  },
  { id: 3, username: 'carol', password: 'hunter2hunter2', displayName: 'Carol Nwosu' },
];

// Fixed UUIDs so the lab is reproducible across reseeds (and so the README /
// SOLUTION can show a stable example).
const seedDossiers = [
  {
    id: 1,
    uuid: '8f14e45f-ceea-467e-bd97-aa41e4e04000',
    ownerId: 1,
    title: 'Northside warehouse inventory discrepancy',
    body: 'Stock count is 40 units short against the manifest. Requested a re-audit from the floor supervisor.',
    classification: 'internal',
  },
  {
    // The target. Carries the flag.
    id: 2,
    uuid: '3b241101-e2bb-4255-8caf-4136c566a962',
    ownerId: 2,
    title: 'CONFIDENTIAL: internal fraud review',
    body: `Do not share outside the case team. Evidence lock code: ${config.flag}`,
    classification: 'confidential',
  },
  {
    id: 3,
    uuid: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
    ownerId: 3,
    title: 'Vendor contract renewal — Meridian Supplies',
    body: 'Renewal terms attached. Legal flagged the indemnity clause for review.',
    classification: 'internal',
  },
  {
    id: 4,
    uuid: 'd1a1c2e0-2b3a-4a5b-8c7d-9e0f1a2b3c4d',
    ownerId: 2,
    title: 'Expense report follow-up',
    body: 'Receipts for the Denver trip are missing. Reminder sent to finance.',
    classification: 'internal',
  },
];

async function main(): Promise<void> {
  console.log('[seed] seeding investigators …');
  for (const u of seedUsers) {
    const passwordHash = hashPassword(u.password);
    await db
      .insert(users)
      .values({ id: u.id, username: u.username, passwordHash, displayName: u.displayName })
      .onConflictDoUpdate({
        target: users.id,
        set: { username: u.username, passwordHash, displayName: u.displayName },
      });
  }

  console.log('[seed] seeding dossiers …');
  for (const d of seedDossiers) {
    await db
      .insert(dossiers)
      .values(d)
      .onConflictDoUpdate({
        target: dossiers.id,
        set: {
          uuid: d.uuid,
          ownerId: d.ownerId,
          title: d.title,
          body: d.body,
          classification: d.classification,
        },
      });
  }

  console.log(
    '[seed] done. investigators: alice, bob, carol. flag seeded in dossier 2 (bob, confidential), reachable by id, uuid, base64 handle and hashids code alike.',
  );
  await sql.end();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
