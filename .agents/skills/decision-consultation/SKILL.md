---
name: decision-consultation
description: >-
  Use this skill whenever planning deep refactoring, architectural changes, breaking changes, or facing multiple valid implementation paths.
---

# Decision Consultation Protocol

## Objective

Ensure the user maintains full control over codebase architecture, refactoring, and potentially breaking design decisions.

## Trigger Conditions

Activate this skill whenever:

- A task requires modifying the core structure of multiple files.
- A proposed change breaks backwards compatibility (e.g. database schema changes, API contracts, store state signatures).
- Multiple architectural approaches exist (e.g., SSR vs Client Fetching, Redis PubSub vs BullMQ, custom CSS vs Tailwind config).
- You identify inconsistencies or potentially more practical solutions than originally specified.

## Mandatory Procedure

1. **Pause Implementation:**
   - Do NOT perform unilateral mass refactoring or destructive edits.
2. **Describe Context & Present Options:**
   - Clearly explain the current status and why a decision is needed.
   - Present distinct structured options:
     - **Option 1 (e.g. Recommended Approach)**: Explanation, pros, cons.
     - **Option 2 (e.g. Conservative / Alternative Approach)**: Explanation, pros, cons.
     - **Custom Option**: Explicitly inform the user that they can propose their own approach or reject the changes completely.
3. **Wait for User Input:**
   - Execute only the path chosen or instructed by the user.
