// Unit tests for the four id codecs — the capstone's whole point is that they
// are interchangeable disguises for the same sequential id, never a control.
import { describe, expect, it } from 'vitest';
import Hashids from 'hashids';
import { decodeCode, decodeHandle, encodeCode, encodeHandle, isUuid } from '../src/lib/ids';

describe('base64 handle', () => {
  it('round-trips an id', () => {
    expect(decodeHandle(encodeHandle(2))).toBe(2);
  });

  it('decodes a handle built by hand, not just one the app generated', () => {
    // Anyone can build `dossier:<id>` and base64url-encode it themselves —
    // that is the whole lab. Confirm the decoder accepts a hand-built one.
    const forged = Buffer.from('dossier:2', 'utf8').toString('base64url');
    expect(decodeHandle(forged)).toBe(2);
  });

  it('rejects malformed input', () => {
    expect(decodeHandle('!!!not-base64!!!')).toBeNull();
    expect(decodeHandle(Buffer.from('not-a-dossier-handle').toString('base64url'))).toBeNull();
    expect(decodeHandle(Buffer.from('dossier:abc').toString('base64url'))).toBeNull();
    expect(decodeHandle(42)).toBeNull();
    expect(decodeHandle('')).toBeNull();
  });
});

describe('hashids code', () => {
  it('round-trips an id', () => {
    expect(decodeCode(encodeCode(2))).toBe(2);
  });

  it('decodes a code produced by an independent Hashids instance with the same salt', () => {
    // Simulates an attacker who reproduces the (public) salt/minLength
    // configuration and forges a code for an id they were never shown.
    const attacker = new Hashids('mirrorbox-2026', 6);
    expect(decodeCode(attacker.encode(2))).toBe(2);
  });

  it('rejects malformed input', () => {
    expect(decodeCode('!!!')).toBeNull();
    expect(decodeCode(42)).toBeNull();
    expect(decodeCode('')).toBeNull();
  });
});

describe('isUuid', () => {
  it('accepts well-formed uuids', () => {
    expect(isUuid('3b241101-e2bb-4255-8caf-4136c566a962')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid(42)).toBe(false);
    expect(isUuid('')).toBe(false);
  });
});
