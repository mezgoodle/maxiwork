# Quality Gate & Post-Implementation Verification Skill

This skill is designed to run an exhaustive automated audit and verification pass after any feature, bugfix, or refactoring task is completed, ensuring zero regressions and strict compliance with `AGENTS.md`.

## When to Run

- Automatically before declaring any implementation complete.
- When explicitly invoked via `/quality-gate` or `/verify`.

---

## 🔍 Step 1: Detect Scope of Changes

Run `git status --porcelain` and `git diff --name-only HEAD` to identify affected workspaces:

- If files in `backend/` were touched: Mark **Backend Verification** as REQUIRED.
- If files in `frontend/` were touched: Mark **Frontend Verification** as REQUIRED.
- If neither: Report no code changes detected and exit.

---

## ⚙️ Step 2: Deterministic Mechanical Gates

Execute the corresponding commands in the affected directories. **ALL checks must exit with code 0.**

### If Backend Touched:

1. **Linting**:
   ```bash
   cd backend && npm run lint:check
   ```
2. **Build / Typecheck**:
   ```bash
   cd backend && npm run build
   ```
3. **Tests**:
   ```bash
   cd backend && npm test
   ```

### If Frontend Touched:

1. **Linting**:
   ```bash
   cd frontend && npm run lint
   ```
2. **Build / Typecheck**:
   ```bash
   cd frontend && npm run build
   ```
3. **Tests**:
   ```bash
   cd frontend && npm test
   ```

> ⚠️ **Self-Correction Rule**: If any check fails, do NOT report failure immediately. Read the stack trace, fix the root cause in the affected file(s), and re-run Step 2 until all commands succeed.

---

## 🧠 Step 3: Heuristic & Architectural Audit

Inspect `git diff HEAD` against the strict constraints in `AGENTS.md`:

### 1. Anti-Cheat & Type Safety Audit

- [ ] Ensure NO occurrences of `@ts-ignore`, `@ts-nocheck`, or `as any`.
- [ ] Ensure all new methods, DTOs, and functions have explicit TypeScript types.

### 2. Backend Pattern Audit (NestJS / MongoDB)

- [ ] No business logic inside controllers (controllers only delegate to services).
- [ ] Incoming payloads use decorated class-validator DTOs.
- [ ] No raw password hashes returned in responses; Mongoose queries use `.lean()` where applicable.

### 3. Frontend Pattern Audit (Nuxt 4 / SSR)

- [ ] No browser-only globals (`window`, `localStorage`, `document`) accessed directly outside `onMounted()`.
- [ ] Auth tokens are managed strictly via Nuxt `useCookie` (never `localStorage`).
- [ ] API calls route through the custom `useApi` composable (no raw `fetch` or `axios`).

### 4. Jira & Git Policy Check

- [ ] Current git branch matches Jira convention (e.g., `MAX-XX-...`).
- [ ] The planned/latest commit message starts with `<TICKET-KEY>: <imperative message>`.
- [ ] All code, comments, and strings are strictly in English.

---

## 📋 Step 4: Verification Output Report

Produce a concise verification summary in the following markdown format:

```markdown
### 🛡️ Quality Gate Verification Report

- **Target Ticket**: MAX-XX
- **Workspaces Audited**: [Backend | Frontend | Both]

#### 1. Deterministic Checks

- [x] Linting: Passed (0 errors, 0 warnings)
- [x] Build: Passed (compiled cleanly)
- [x] Unit Tests: Passed (all suites green)

#### 2. Architecture & Code Smells

- [x] Strict Typing: No `any` or `@ts-ignore` found.
- [x] SSR / Security Compliance: Verified.
- [x] Language Policy: 100% English.

#### 3. Recommended Commit Message

`MAX-XX: description of changes`
```
