# MaxiWork — AI Agent & Developer Guidelines (AGENTS.md)

Welcome to the **MaxiWork** project repository. This document serves as the single source of truth for AI agents (and human developers) to ensure high code quality, consistency, and a seamless development workflow.

---

## 🌐 1. Language Policy (STRICT)

> [!IMPORTANT]
> **All project artifacts MUST be written exclusively in English.**
> This includes, but is not limited to:
> - User Interface (UI) text: labels, buttons, headings, placeholders, descriptions, alerts, and toasts.
> - Source code: variable names, function names, class names, types, and comments.
> - API error messages, HTTP exception descriptions, and validation messages.
> - Git commit messages, branch names, and Pull Request titles/descriptions.
> - Documentation, schema descriptions, and tests.

---

## 🏗️ 2. Repository Architecture & Monorepo Structure

MaxiWork is organized as a monorepo containing two primary applications:

```
maxiwork/
├── backend/    # NestJS 11 REST API with MongoDB (Mongoose)
├── frontend/   # Nuxt 4 (Vue 3, SSR, Pinia, Tailwind CSS)
├── .github/    # CI/CD workflows and actions
├── AGENTS.md   # This guidelines file
└── README.md   # Project overview
```

### 🔧 Backend (`/backend`)
- **Framework**: NestJS 11 with TypeScript
- **Database**: MongoDB using `@nestjs/mongoose` and Mongoose schemas
- **Authentication**: Passport Local (`passport-local`) and Passport JWT (`passport-jwt`), short-lived access tokens (15m) + secure rotating refresh tokens (7d)
- **Validation**: Global `ValidationPipe` with `class-validator` and `class-transformer` (`whitelist: true`, `transform: true`)
- **API Prefix**: Global prefix `/api` configured in `main.ts`
- **Default Port**: `3000` (Base URL: `http://localhost:3000/api`)
- **Scripts**:
  - `npm run start:dev` — Start development server with hot-reload
  - `npm run build` — Compile TypeScript to `dist/`
  - `npm run lint:check` — Run ESLint type-checked verification
  - `npm run format` — Format code with Prettier
  - `npm test` — Run Jest unit test suites

### 🎨 Frontend (`/frontend`)
- **Framework**: Nuxt 4 (Vue 3, Composition API with `<script setup>`)
- **Rendering Mode**: Server-Side Rendering (`ssr: true`)
- **State Management**: Pinia (`@pinia/nuxt`)
- **Styling**: Tailwind CSS (`@nuxtjs/tailwindcss`)
- **HTTP Client**: Nuxt `$fetch` / `useFetch` with `useApi` composable attaching Bearer token and handling 401 token refresh retry
- **Token Storage**: Nuxt `useCookie` for `access_token` and `refresh_token` (ensures full SSR compatibility and hydration stability)
- **Default Dev Port**: `3001` (run with `npm run dev -- -p 3001` to prevent conflict with backend on 3000)
- **Runtime Configuration**: `runtimeConfig.public.apiBase` points to `http://localhost:3000/api`
- **Scripts**:
  - `npm run dev -- -p 3001` — Start Nuxt development server on port 3001
  - `npm run build` — Build Nuxt client and Nitro SSR server
  - `npm run lint` — Verify code with ESLint
  - `npm test` — Run Vitest unit tests

---

## 🌿 3. Git & Workflow Guidelines

### Branch Naming
- Always use the branch names suggested directly by Jira (e.g. `MAX-62-implement-user-registration`).
- Chained PRs: When a frontend PR depends on an unmerged backend PR, branch from the backend branch and set the PR's base branch accordingly.

### Commit Messages
- Every commit message MUST start with the Jira ticket key:
  ```
  <TICKET-KEY>: <imperative action description>
  ```
  *Examples:*
  - `MAX-62: implement user registration with User schema and validation`
  - `MAX-67: implement Pinia auth store, token management, and useApi interceptor`
- Keep commits atomic, well-scoped, and cleanly separated by feature or ticket.

### Pull Requests
- **Title**: `<type>(<scope>): <summary> (<TICKET-KEYS>)` (e.g. `feat(frontend): implement auth UI, store, and middleware (MAX-66, MAX-67, MAX-68)`).
- **Description**: Include a concise summary of changes, linked Jira issue keys, and test/build verification results.

---

## 🛡️ 4. Code Quality & Verification Checklist

Before submitting code, pushing branches, or opening PRs, agents MUST verify:

1. **Linting**:
   - Backend: `npm run lint:check` in `/backend` (0 errors, 0 warnings).
   - Frontend: `npm run lint` in `/frontend` (0 errors, 0 warnings).
2. **Testing**:
   - Backend: `npm test` in `/backend` (all Jest suites must pass).
   - Frontend: `npm test` in `/frontend` (all Vitest suites must pass).
3. **Build**:
   - Backend: `npm run build` in `/backend` (compiles without TypeScript errors).
   - Frontend: `npm run build` in `/frontend` (client and Nitro server build cleanly).
4. **Type Safety**:
   - Avoid `any` types; prefer strict TypeScript types, interfaces, or type narrowing (`unknown`).
5. **Security**:
   - Never commit sensitive `.env` files.
   - Maintain `.env.example` with template environment variables.
   - Always hash passwords using `bcryptjs` before persisting to database.
   - Sanitize user objects so password hashes are never returned in API responses.
