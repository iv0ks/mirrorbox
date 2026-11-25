// Runtime configuration, read once from the environment.
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  databaseUrl: required('DATABASE_URL', 'postgres://mirrorbox:mirrorbox@localhost:5432/mirrorbox'),
  sessionSecret: required('SESSION_SECRET', 'dev-only-insecure-secret-change-me'),

  // Hashids parameters used to derive one of the four public id formats from
  // a dossier's sequential id (see src/lib/ids.ts). Like couponly, the salt is
  // just configuration, not a secret the lab relies on — the lab is the
  // missing ownership check behind every format, not how hard the format is
  // to reverse.
  hashidsSalt: required('HASHIDS_SALT', 'mirrorbox-2026'),
  hashidsMinLength: Number(process.env.HASHIDS_MIN_LENGTH ?? 6),

  // The challenge flag, baked into the image at build time and seeded into
  // bob's confidential dossier. Never committed.
  flag: required('FLAG', 'FLAG{MIRRORBOX_SAME_BUG_EVERY_DISGUISE}'),
};
