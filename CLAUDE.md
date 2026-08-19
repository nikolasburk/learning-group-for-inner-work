# CLAUDE.md

## Use pnpm

Always use `pnpm` and its equivalent commands, e.g. `pnpm exec` for `npx`.

## Markdown is the source of truth for copy

Landing-page copy (the sections rendered on `index.astro`, plus FAQ and rules) is sourced directly from Astro Content Collections: `src/content/copy.md`, `src/content/faq.md`, and `src/content/rules.md` — each `.astro` section component reads its entry from there instead of hardcoding prose.

Legal/info pages (`src/pages/privacy.md`, `impressum.md`, `support.mdx`) are edited directly — they're plain markdown (MDX for `support.mdx`, which embeds the `CopyIbanButton` component).

## Git workflow

- Default branch: `main`.
- Commit messages follow **Conventional Commits** (`type: subject`): `content:` for copy/site content changes (this is primarily a content site, not an app), plus standard `feat:`, `fix:`, `chore:`, `docs:`, `perf:`, `refactor:`, `style:`, `build:` as needed.
- Keep commits small and scoped to one logical change.
- Agents are authorized to create commits on their own during normal work without asking for confirmation first — this overrides the general "always ask before committing" default. Standard git safety rules still apply: no force-push, no `--no-verify`, no rewriting published history, review `git status`/`git diff` before broad `git add`. Pushing to a remote still requires explicit user confirmation.
