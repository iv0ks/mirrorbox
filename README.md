# mirrorbox

![CWE-639](https://img.shields.io/badge/CWE--639-IDOR-red?style=flat-square)
![Next.js](https://img.shields.io/badge/Node-Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![Docker](https://img.shields.io/badge/Lab-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
[![GHCR](https://img.shields.io/badge/ghcr.io-iv0ks%2Fmirrorbox-blue?logo=docker)](https://github.com/iv0ks/mirrorbox/pkgs/container/mirrorbox)

**mirrorbox is an intentionally vulnerable application built for security education.** It contains a deliberate [IDOR / broken access control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
(CWE-639) flaw — the **capstone** of the series: one resource exposed under **four id formats at once**, proving that none of the disguises was ever the access control.

<br>

<div align="center">

| 🛡️ Vulnerability | 🎯 Difficulty | 🛠️ Stack | 🚩 Entry point |
| :--- | :--- | :--- | :--- |
| Read IDOR — same bug, four id formats (CWE-639) | ⭐⭐⭐⭐⭐⭐⭐⭐ Level 10 (capstone) | Node · Next.js | `GET /api/dossiers/by-id`, `by-uuid`, `by-handle`, `by-code` |

</div>

<br>

> [!NOTE]
> The guided, spoiler-free path is [GUIDE.md](GUIDE.md); the full answer waits in [SOLUTION.md](SOLUTION.md) whenever you want it.

<br>

## 📂 Project layout

The repository is organised so the vulnerable code is easy to find and reason
about. The **application** lives in `src/` (a small Next.js case-records app),
the **data layer** is Drizzle ORM over Postgres (`src/db/` + `drizzle/`
migrations), and the **tooling** around it (Docker, CI/CD, linters) turns the
lab into a production-shaped project. The challenge flag is never in the repo
— it is baked into the image and seeded into bob's confidential dossier.

```
mirrorbox/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # dashboard: your own dossiers, all 4 formats shown
│   │   ├── login/page.tsx           # sign-in form
│   │   ├── healthz/route.ts         # GET /healthz → "ok"
│   │   └── api/
│   │       ├── login, logout, me/route.ts
│   │       └── dossiers/
│   │           ├── route.ts                 # GET — your own board (SAFE, scoped)
│   │           ├── by-id/[id]/route.ts       # ⚠️ sequential id
│   │           ├── by-uuid/[uuid]/route.ts   # ⚠️ UUID
│   │           ├── by-handle/[handle]/route.ts # ⚠️ base64url handle
│   │           └── by-code/[code]/route.ts     # ⚠️ hashids code
│   ├── lib/
│   │   ├── ids.ts         # the four id codecs (encode/decode handle, code, uuid shape)
│   │   ├── dossiers.ts    # data access: one scoped query, four unscoped lookups
│   │   ├── session.ts     # signed session cookie
│   │   ├── users.ts, password.ts, api.ts
│   ├── db/
│   │   ├── schema.ts      # one `dossiers` table — id, uuid, ownerId, body, classification
│   │   ├── client.ts, migrate.ts, seed.ts
│   └── components/        # shadcn/ui + the site header
├── drizzle/                  # generated SQL migrations
├── tests/                    # id-codec, session and route-handler tests (vitest)
├── GUIDE.md                  # non-spoiler learning guide
├── SOLUTION.md                # exploit writeup + the fix (spoilers)
├── SECURITY.md                # security policy (it's a lab — read before reporting)
├── .github/workflows/        # integration · delivery · security · release
├── Dockerfile                # hardened multi-stage image (node:26-slim)
├── docker-compose.yml        # postgres + mirrorbox + traefik stack
├── docker-entrypoint.sh      # migrates + seeds, then starts the app
└── .env.example               # DB creds, session secret, hashids salt, Traefik ACME
```

The flag is **not** in the repo: the `Dockerfile` bakes it in via a build arg
and the seed writes it into bob's confidential dossier.

<br>

## 🚀 The Lab

The lab ships as a Docker Compose stack with three services:

- **`postgres`** — Postgres 16. The app waits until it is *healthy* before migrating.
- **`mirrorbox`** — the API + case-board UI, published on port `3000`.
- **`traefik`** — an optional reverse proxy for HTTPS on a real hostname.

Because the stack attaches to an **external** Docker network (`iv0ks-dev`),
create it once before the first run:

```bash
docker network create iv0ks-dev
```

<br>

#### Option A — app + database (quickest)

Copy the example environment file, then build and start the database and the app
(Compose skips `traefik` when you name services explicitly):

```bash
cp .env.example .env
docker compose up -d --build postgres mirrorbox
```

The entrypoint migrates the schema and seeds the data automatically, so the app
is ready at:

- **<http://localhost:3000>**

Sign in with the seeded demo account **`alice` / `password123`**. That is all
you need to start playing with Burp Suite.

<br>

#### Option B — full stack with Traefik (HTTPS + hostname)

Bring up everything to also expose the app through Traefik with TLS:

```bash
docker compose up -d --build
```

Now the _same_ app is reachable two ways at once:

- **<http://localhost:3000>** — direct, no TLS (handy for quick testing).
- **<https://mirrorbox.iv0ks.dev>** — proxied by Traefik with a real certificate.

Traefik routing is defined in `tools/traefik/`. TLS uses the ACME DNS-01
challenge via Namecheap, so Traefik needs those API credentials — fill them in
`.env` (the `.env` file is gitignored). The dashboard is at
`https://traefik.iv0ks.dev`.

<br>

> [!CAUTION]
> The `mirrorbox.iv0ks.dev` hostname must resolve to the host running the stack.
> For purely local experiments, Option A (localhost) is simpler and needs no
> DNS or certificates.

<br>

## 🎯 The Challenge

### The Scenario

mirrorbox is a case-records vault for a small investigations team. You sign in
as **alice**, and your board shows exactly one dossier — yours. Every dossier
in the system has **four public names** at once: a plain sequential number, a
UUID, a base64-looking "handle" and a short hashids "code". Each name is a
different-looking door into the records room. You are going to find out
whether any of the four doors is actually locked — and whether the lock behind
them is really four locks, or one.

### Your objective

Reach **bob's confidential dossier** and capture the flag inside it — and then
do it again through *each* of the other three id formats, to confirm it is the
same missing check every time.

> [!NOTE]
> The flag has the format `FLAG{...}`.

### The rules

Everything happens over HTTP against the running app — no need to read the
source to win (though you can). The flag is **not** in the repo: it lives in
another investigator's dossier, reachable only by breaking access control on
the running app. Your own dashboard already shows you all four formats for
your own dossier — that is your starting material for all four attacks.

> [!TIP]
> For the full method, the **[Learning Guide](GUIDE.md)** walks you through it.

<br>

## ⚖️ Legal / ethics

This is an **educational, deliberately vulnerable** lab. Run it only locally, on
owned, isolated infrastructure (Docker). Never deploy it publicly, and never use
these techniques against systems without explicit written authorization.
