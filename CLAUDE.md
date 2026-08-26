# CLAUDE.md

## Use pnpm

Always use `pnpm` and its equivalent commands, e.g. `pnpm exec` for `npx`.

## Markdown is the source of truth for copy

Landing-page copy (the sections rendered on `index.astro`, plus FAQ and rules) is sourced directly from Astro Content Collections: `src/content/copy.md`, `src/content/faq.md`, and `src/content/rules.md` — each `.astro` section component reads its entry from there instead of hardcoding prose.

Legal/info pages (`src/pages/privacy.md`, `impressum.md`, `support.mdx`) are edited directly — they're plain markdown (MDX for `support.mdx`, which embeds the `CopyIbanButton` component).

## Zoom join link

The open-group join link lives in `wrangler.jsonc` → `vars.ZOOM_LINK`. It is a plain (non-secret) Worker var, read at request time as `env.ZOOM_LINK`, and it is the single source for every place the link reaches an attendee: the confirmation email body (`src/lib/brevo.ts`), the attached `session.ics` — both `DESCRIPTION` and `LOCATION` — and the "Add to Google Calendar" URL (`src/lib/ics.ts`), and the `/confirmed` page. Never paste the URL into any of those directly.

Keep it in the hostname-free `https://zoom.us/j/<id>?pwd=<pwd>` form. Zoom's own UI shows a cluster-specific host instead (`us04web.zoom.us`, `us06web.zoom.us`, …), which silently pins the link to whichever cluster the account sat on when the meeting was created — that goes stale when the account tier changes. The bare `zoom.us` host always routes to the account's current cluster.

After changing it, re-run `pnpm wrangler types` (the value is duplicated as a literal string type in `worker-configuration.d.ts`) and redeploy — `vars` only reach production via `pnpm run deploy`.

## Git workflow

- Default branch: `main`.
- Commit messages follow **Conventional Commits** (`type: subject`): `content:` for copy/site content changes (this is primarily a content site, not an app), plus standard `feat:`, `fix:`, `chore:`, `docs:`, `perf:`, `refactor:`, `style:`, `build:` as needed.
- Keep commits small and scoped to one logical change.
- Agents are authorized to create commits on their own during normal work without asking for confirmation first — this overrides the general "always ask before committing" default. Standard git safety rules still apply: no force-push, no `--no-verify`, no rewriting published history, review `git status`/`git diff` before broad `git add`. Pushing to a remote still requires explicit user confirmation.
