// User lookups used by login/me.
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users, type User } from '../db/schema';

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return row;
}

export async function findUserById(id: number): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}
