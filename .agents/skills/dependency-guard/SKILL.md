---
name: dependency-guard
description: >-
  Use this skill whenever a feature or fix could potentially require installing new npm/pnpm packages or modifying package.json dependencies.
---

# Dependency Guard Protocol

## Objective

Prevent unauthorized third-party dependencies from being added to the `bizx-platform` monorepo without explicit user consent.

## Trigger Conditions

Activate this skill whenever:

- A new task might tempt using an external library (e.g. `lodash`, `axios`, `moment`, `uuid`, etc.).
- A package is not listed in the target project's `package.json`.

## Mandatory Procedure

1. **STOP before installing:**
   - Do NOT run `pnpm add`, `npm install`, or edit `package.json` dependencies.
2. **Formulate the Proposal:**
   - Present the following information to the user:
     - **Package Name & Target**: e.g., `date-fns` for `apps/bizx-landing`.
     - **Why it's needed**: Concrete justification of the problem it solves.
     - **Pros**: Implementation speed, maintenance, built-in edge cases.
     - **Cons**: Bundle size impact, additional transitive dependencies, maintenance overhead.
3. **Wait for Decision:**
   - If the user APPROVES: Proceed with installation using workspace filter (e.g., `pnpm --filter @bizx/<app> add <pkg>`).
   - If the user REJECTS: Do NOT install. Solve the problem using:
     - Built-in JavaScript / TypeScript features (e.g. `Intl`, `fetch`, native `crypto.randomUUID()`).
     - Packages already available in the monorepo (`zod`, `drizzle-orm`, `clsx`, `tailwind-merge`, etc.).
