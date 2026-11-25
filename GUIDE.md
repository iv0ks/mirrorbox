# mirrorbox: Learning Guide

![CWE-639](https://img.shields.io/badge/CWE--639-IDOR-red?style=flat-square)
![Next.js](https://img.shields.io/badge/Node-Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Lab-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

**mirrorbox is an intentionally vulnerable application built for security education.** It contains a deliberate [IDOR / broken access control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
(CWE-639) flaw so you can practice finding and exploiting it in a safe and controlled environment.

<br>

> [!TIP]
> A guided, **non-spoiler** path to solving this lab. It teaches the *method*, not the answer — the exact winning requests and the flag stay in [SOLUTION.md](SOLUTION.md).

<br>

## 🧬 What this lab recaps

One sentence, the same one that opened every lab in this series:

> **Broken access control happens when an app checks _who you are_ but forgets
> to check _whether this particular object is yours_.**

Across the series you met that gap behind a **sequential id** (easy to
enumerate), a **UUID** (hard to guess, easy to capture or leak), a **base64
handle** (decode → alter → re-encode) and a **hashids code** (reverse the
scheme, or abuse a leaked salt). Every time, a different disguise, but the same
missing question. This lab makes that point impossible to miss: it gives **one
single resource four public names at once**, and asks you to open it through
each one.

> Want the full background on every one of those four formats — what each
> encoding actually is, why none of them authorize anything, and the matching
> Burp technique? Read the shared
> **[Broken Access Control field guide](https://github.com/iv0ks/appsec-labs/blob/main/docs/broken-access-control.md)**.
> This lab is the hands-on recap of it.

<br>

## 🎓 What this level teaches

**Level 10 — capstone: the id format was never the control.** Your dashboard
shows one dossier — yours — described four different ways. Four lookup routes
let you fetch a dossier by each of those names.

- **Entry points:**
  - `GET /api/dossiers/by-id/:id` — sequential integer.
  - `GET /api/dossiers/by-uuid/:uuid` — random UUID.
  - `GET /api/dossiers/by-handle/:handle` — base64url-encoded handle.
  - `GET /api/dossiers/by-code/:code` — hashids-encoded code.
- **The broken defence:** each route checks that you are signed in, then
  trusts the reference you gave it — none of the four ever compares the
  dossier it resolves against your own account.
- **What you can see legitimately:** your own board, via `GET /api/dossiers`
  — which conveniently shows you your own id, UUID, handle *and* code in one
  place, your starting material for all four attacks.
- **The target:** another investigator's confidential dossier, reachable
  through every one of the four doors.

## 🪧 How to approach it

1. Sign in as `alice` and look at your own board. Note all four values shown
   for your dossier: its number, its UUID, its handle, its code.
2. Pick the format whose underlying technique you already know from earlier in
   the series (sequential → just change the number) and use it first: try a
   nearby id that is not yours.
3. Once you have a second investigator's dossier by one format, look at *that*
   dossier's own id. Now you can derive the other three public names for it
   yourself — the same way the app does.
4. Repeat the derivation for the UUID (you cannot derive this one — you need to
   *see* one, e.g. in the confirmed-vulnerable response from step 2), the
   handle (decode/re-encode) and the code (reproduce the encoder).
5. Confirm all four requests return byte-for-byte the same dossier. That
   equality is the whole lesson: one object, one missing check, four costumes.

## 🕵️‍♂️ Going further

Try the reverse direction too: starting only from one dossier's **hashids
code**, derive its sequential id, then its base64 handle. If you can move
between any two of the four formats for a dossier you were never shown, you
have proven the formats are freely interchangeable identifiers — not four
independent barriers.

## 🤔 Why it matters

Teams sometimes respond to an IDOR finding by swapping sequential ids for
UUIDs, or by wrapping ids in a short encoded "token", and call the ticket
closed. This lab is the demonstration that none of that touches the actual
bug: the authorization check — comparing the resolved object's owner against
the caller — either exists on every code path or it does not. The format a
client used to *name* the object was never part of that check, in this lab or
in the nine before it.

---

When you have captured the flag (or want to check the fix and the *why* behind
it), continue to **[SOLVE → SOLUTION.md](SOLUTION.md)**.

<br>

> **Legal / ethics.** This is an educational, deliberately vulnerable lab. Run it
> only locally, on owned, isolated infrastructure, and never use these techniques
> against systems without explicit written authorization.
