// Id codecs — three disguises for the same sequential integer.
//
// mirrorbox is the capstone of the id-format axis: every dossier has ONE
// underlying sequential id, and this module derives the other three public
// names for it on the fly (nothing extra is stored in the database for the
// handle or the code — see src/db/schema.ts).
//
//   UUID          → a real column, generated once at seed time (see schema).
//   base64 handle → encode/decode copied verbatim from snapvault (Level 4):
//                   the string `dossier:<id>`, base64url-encoded.
//   hashids code  → encode/decode copied verbatim from couponly (Level 5):
//                   `id` run through a salted Hashids instance.
//
// None of the three disguises is encryption or an access check — anyone who
// can read one can derive (or forge) another. The lab is that the lookup
// routes behind all four formats share the exact same missing ownership
// check, which is the whole point of this recap.
import Hashids from 'hashids';
import { config } from '../config';

const HANDLE_PREFIX = 'dossier:';

/** Encode a dossier id into its public base64url handle (snapvault-style). */
export function encodeHandle(id: number): string {
  return Buffer.from(`${HANDLE_PREFIX}${id}`, 'utf8').toString('base64url');
}

/**
 * Decode a handle back to a dossier id. Returns null when the handle is not
 * valid base64url or does not carry a positive integer id. This only
 * validates *shape*, never ownership.
 */
export function decodeHandle(handle: unknown): number | null {
  if (typeof handle !== 'string' || handle.length === 0) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(handle, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  if (!decoded.startsWith(HANDLE_PREFIX)) return null;
  return toPositiveInt(decoded.slice(HANDLE_PREFIX.length));
}

// A single shared Hashids instance built from the (leakable-by-design) salt
// and min length — same construction as couponly.
const hashids = new Hashids(config.hashidsSalt, config.hashidsMinLength);

/** Encode a dossier id into its public hashids code (couponly-style). */
export function encodeCode(id: number): string {
  return hashids.encode(id);
}

/**
 * Decode a hashids code back to a dossier id, or null if it is not a
 * well-formed single-number hashid for this salt. Shape only, never
 * ownership.
 */
export function decodeCode(code: unknown): number | null {
  if (typeof code !== 'string' || code.length === 0) return null;
  let decoded: (number | bigint)[];
  try {
    decoded = hashids.decode(code);
  } catch {
    return null;
  }
  if (decoded.length !== 1) return null;
  const value = decoded[0];
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

/** Validate a UUID's shape (RFC 4122, any version). Shape only. */
export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function toPositiveInt(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
