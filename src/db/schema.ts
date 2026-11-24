// Database schema (Drizzle ORM).
//
// mirrorbox is the capstone of the series: a single table of case dossiers,
// each one reachable through FOUR different id formats at once —
//
//   sequential integer  → `dossiers.id`      (1, 2, 3, …)
//   UUID                → `dossiers.uuid`    (random, looks unguessable)
//   base64 handle       → derived from `id`  (see src/lib/ids.ts)
//   hashids code         → derived from `id`  (see src/lib/ids.ts)
//
// Only the first two columns are stored — the handle and the code are computed
// on the fly from the same `id`, exactly like snapvault (base64) and couponly
// (hashids) did on their own. Every lookup route, whichever format it reads,
// ends up resolving the *same* underlying row by `id`. The access check (or
// the lack of one) is identical no matter which disguise the client used to
// name the row — proving the id format was never the control (CWE-639).
import { pgTable, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
});

export const dossiers = pgTable('dossiers', {
  // Sequential integer PK — the oldest, most "disguised" format in the series.
  id: integer('id').primaryKey(),
  // Random UUID, generated once at seed time. A second, independent name for
  // the exact same row.
  uuid: uuid('uuid').notNull().unique(),
  ownerId: integer('owner_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  // The case notes. Bob's confidential dossier carries the FLAG.
  body: text('body').notNull(),
  // 'internal' | 'confidential'
  classification: text('classification').notNull().default('internal'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Dossier = typeof dossiers.$inferSelect;
