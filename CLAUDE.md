# CLAUDE.md

## Use pnpm

Always use `pnpm` and its equivalent commands, e.g. `pnpm exec` for `npx`.

## Markdown is the source of truth for copy

`learning-group-landing-page.md` (repo root) is the source of truth for all site copy. When copy changes, always edit the md file first, then sync the matching change into the Astro site under `inner-work-landing/`. Never make a copy change in the site that isn't reflected in the md.

## Git workflow

- Default branch: `main`.
- Commit messages follow **Conventional Commits** (`type: subject`): `content:` for copy/site content changes (this is primarily a content site, not an app), plus standard `feat:`, `fix:`, `chore:`, `docs:`, `perf:`, `refactor:`, `style:`, `build:` as needed.
- Keep commits small and scoped to one logical change.
- Agents are authorized to create commits on their own during normal work without asking for confirmation first — this overrides the general "always ask before committing" default. Standard git safety rules still apply: no force-push, no `--no-verify`, no rewriting published history, review `git status`/`git diff` before broad `git add`. Pushing to a remote still requires explicit user confirmation.
