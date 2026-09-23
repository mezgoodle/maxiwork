---
name: github-review
description: Review GitHub pull requests, apply actionable feedback, run verification checks, and resolve review threads.
---

# PR Review & Auto-Correction

## Workflow Logic
### Step 1: Context Retrieval
- Use `github-mcp` to fetch:
  - The current diff of the Pull Request.
  - All existing comments and review suggestions left by reviewers.

### Step 2: Semantic Analysis (Root Agent)
- Analyze the diff and match every comment/suggestion to the specific line of code.
- Categorize comments into:
  - "Actionable" (suggestions with code blocks or clear instructions).
  - "Discussion" (questions or general feedback).

### Step 3: Execution (Tool Calling)
- For every "Actionable" comment:
  - Apply the suggested changes (create a new commit or file update) if you think it's useful.

### Step 4: Resolving Review Threads & Verification
- **Mandatory Verification:** Run `npm run lint:check` in `backend` and `npm run lint` in `frontend` to verify zero linting errors.
- If checks pass:
  - Commit all applied changes and push to the remote branch.
  - Resolve the corresponding review threads on GitHub via `gh api graphql`:
    ```bash
    gh api graphql -F threadId="<THREAD_NODE_ID>" -f query='mutation($threadId: ID!) { resolveReviewThread(input: {threadId: $threadId}) { thread { id isResolved } } }'
    ```
  - Provide a concise summary to the user of resolved review threads and committed changes.
- If checks fail:
  - Roll back or fix remaining errors until all linting and test checks pass.
