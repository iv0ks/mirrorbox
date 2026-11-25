# Security Policy

## This project is intentionally vulnerable

mirrorbox is an **educational security lab**. It contains a **deliberate**
IDOR vulnerability (CWE-639): the four dossier lookup routes (`by-id`,
`by-uuid`, `by-handle`, `by-code`) authenticate the caller but never check
that the resolved dossier belongs to them. Please do **not** report the
intended authorization flaw as a security issue — it is the entire point of
the project and is documented in the README, GUIDE.md and SOLUTION.md.

## Reporting *unintended* issues

If you find a problem that is **not** the intended lab vulnerability — for
example, a supply-chain issue, a problem in the CI/CD configuration, or a way
the container could harm the host — please open a private report via GitHub
Security Advisories, or open an issue describing the concern.

## Safe usage

- Run this only on systems you own, locally, isolated (Docker is recommended).
- Never expose this application to the public internet.
- Never use the techniques demonstrated here against systems without explicit,
  written authorization.
