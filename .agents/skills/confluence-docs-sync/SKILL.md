---
name: confluence-docs-sync
description: >-
  Synchronize project documentation in Confluence with the actual codebase and Jira tasks.
  Activate this skill whenever database schemas, DTOs, API endpoints, MCP tools, AI services,
  or views are modified or added, when completing a feature or preparing a PR, or when the user
  asks to update, review, or sync Confluence documentation.
---

# Confluence Documentation Synchronization Skill

This skill guides the AI agent in keeping Confluence documentation continuously synchronized with the MaxiWork codebase and Jira backlog.

## 1. Page Registry & Watch Paths

The single source of truth for page mappings is located at [page-registry.json](./resources/page-registry.json):

* **Space**: `MaxiWork` (Key: `M`, ID: `6094850`)
* **Cloud ID**: `ed716bdb-1672-4e65-b830-561e3e58b47f`

| Topic / Component | Confluence Page Title | Page ID | Monitored Code Paths |
|---|---|---|---|
| **Domain Models & Hierarchy** | [Domain Model & Entity Hierarchy (ClickUp Model)](https://team-second.atlassian.net/wiki/spaces/M/pages/6193153) | `6193153` | `backend/src/**/*.schema.ts`, `backend/src/**/dto/*.dto.ts` |
| **Multi-View UI System** | [Multi-View System Specification (List, Board & Calendar)](https://team-second.atlassian.net/wiki/spaces/M/pages/6225921) | `6225921` | `frontend/app/components/views/**/*`, `frontend/app/pages/**/*` |
| **Embedded MCP Server** | [Embedded MCP Server Engine Specification](https://team-second.atlassian.net/wiki/spaces/M/pages/6258689) | `6258689` | `backend/src/mcp/**/*`, `backend/src/**/*.tool.ts` |
| **In-App Gemini Assistant** | [In-App Gemini AI Assistant Specification](https://team-second.atlassian.net/wiki/spaces/M/pages/6291457) | `6291457` | `backend/src/ai/**/*`, `frontend/app/components/ai/**/*` |
| **Overall Architecture** | [MaxiWork — Project Overview & Architecture](https://team-second.atlassian.net/wiki/spaces/M/pages/6160385) | `6160385` | Architecture shifts, tech stack changes, docker, CI/CD |
| **Backlog & Traceability** | [Jira Roadmap & Backlog Traceability Matrix](https://team-second.atlassian.net/wiki/spaces/M/pages/6324225) | `6324225` | Completed tasks, new stories, status transitions |

---

## 2. Synchronization Workflow

When triggered (automatically or on user request), execute the following steps:

### Step 1: Detect Changed Components
1. Check `git status` and `git diff --name-only HEAD~1` (or compare with `main` / working tree).
2. Match modified files against the `watchPaths` in `page-registry.json`.
3. Identify which specific Confluence page(s) are affected.

### Step 2: Extract Changes from Code
* **Schemas & DTOs**: Check if any fields, types, indexes, or validation decorators were added, removed, or changed.
* **MCP Tools**: Check if tool names, input JSON schemas, or tool descriptions were modified.
* **AI Orchestrator**: Check if model versions, system prompts, or tool execution loops changed.
* **Views & UI**: Check if new views, filters, or interaction patterns (DnD, inline edit) were implemented.

### Step 3: Update Confluence via Atlassian MCP
1. Fetch format rules if needed using `getContentFormatGuide` with `toolName: "updateConfluencePage"`.
2. Prepare the updated body fragment in clean HTML or Markdown format.
3. Call `updateConfluencePage` tool on `atlassian-mcp-server`:
   - `cloudId`: `"ed716bdb-1672-4e65-b830-561e3e58b47f"`
   - `pageId`: Target page ID from the table above
   - `body`: Updated page content
   - `contentFormat`: `"html"` (or `"markdown"`)
   - `versionMessage`: Concise commit-style summary of the change, e.g.:
     `"Update Task schema with customFieldValues implementation (MAX-95)"`

### Step 4: Update Traceability Matrix (if Jira status changed)
If a Jira task or story was marked `Done` or closed during the task, update page `6324225` to reflect the completed state in the matrix.

### Step 5: Report to User
Provide the user with a brief summary of what sections were updated and include direct links to the modified Confluence pages.
