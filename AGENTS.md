<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commit & Pull Request Guidelines

Use Conventional Commits: `<type>: <summary>` (`feat`, `fix`, `docs`, `chore`, `build`).
Prefer concise Korean summaries, e.g. `feat: 다크 모드 추가`. Scopes are optional (`feat(ci): ...`). Keep
commits focused. PRs should explain behavior changes, link issues, report validation results, and
include UI screenshots. Update `README.md` and `.env.example` for behavior/configuration
changes.

## Branch Workflow

- `main`: deployment branch; merge ordinary changes through PRs.
- `develop`: development integration branch.
- `feature/*`, `docs/*`, `refactoring/*`, `fix/*`, `chore/*`: branch from `develop`, implement and
  validate, then open a PR targeting `develop` and merge.
- When release preparation is complete, open a `develop` → `main` PR.
- `hotfix/*`: branch from `main`, validate, then merge into and push `main` without a PR. Apply the
  same fix to `develop`.
