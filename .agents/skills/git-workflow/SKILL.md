---
name: git-workflow
description: >-
  Use this skill whenever creating git branches, preparing commits, or pushing changes to the remote GitHub repository.
---

# Git Workflow & Commit Protocol

## Objective

Enforce strict branching hygiene and Conventional Commits for all repository changes in `bizx-platform`.

## Protected Branches

- `main` / `master`: NEVER commit directly. NEVER push directly. Only user merges PRs into main.
- `dev`: Base branch for all development. NEVER commit directly to `dev`. Pull from `dev` to branch off.

## Step-by-Step Procedure

### 1. Preparing the Branch

Before starting work on a new feature or fix:

```bash
# 1. Ensure you have the latest updates from dev
git checkout dev
git pull origin dev

# 2. Create and switch to the task-specific branch
git checkout -b <branch-name>
```

### 2. Branch Naming Rules

Format: `<type>-<module>-<short-description>`

- `fix-mobile-button-layout`
- `feat-api-auth-endpoint`
- `chore-infra-redis-upgrade`
- `docs-readme-setup-guide`

### 3. Conventional Commit Format

All commit messages MUST follow:
`type(module): action`

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring without changing functionality
- `chore`: Tooling, build configs, dependencies
- `docs`: Documentation
- `style`: Formatting, whitespace
- `test`: Tests

**Modules:**

- `api` (`apps/api`)
- `landing` (`apps/bizx-landing`)
- `admin` (`apps/bizx-admin`)
- `mobile` (`apps/bizx-mobile`)
- `ui` (`packages/ui`)
- `database` (`packages/database`)
- `common-types` (`packages/common-types`)
- `infra` (Docker, compose, CI)
- `repo` / `root` (monorepo root configs)

**Examples:**

- `fix(mobile): fixed incorrect button position`
- `chore(backend): better json response formatting`
- `docs(readme): updated readme`
- `feat(api): implemented user registration endpoint`

### 4. Pushing to Remote

When the work and testing in the branch are complete:

```bash
git push -u origin <branch-name>
```

The user will review and merge the branch into `dev` when ready.
