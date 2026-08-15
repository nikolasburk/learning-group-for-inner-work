# CLAUDE.md

## Markdown is the source of truth for copy

`learning-group-landing-page.md` (repo root) is the source of truth for all site copy. When copy changes, always edit the md file first, then sync the matching change into the Astro site under `inner-work-landing/`. Never make a copy change in the site that isn't reflected in the md.

## Never "donation" / "Spende"

The operator of this site is a sole proprietor (Einzelunternehmer) based in Germany, VAT-registered but not a small business under §19 UStG and not a registered nonprofit. Legally, they cannot accept tax-deductible donations or issue donation receipts. Using donation-style language is misleading and must always be avoided.

**Forbidden** — in copy, button labels, alt text, aria-labels, meta tags, slugs, filenames, comments, and URLs:

- donate, donation, donor, charity, fundraiser
- Spende, spenden, Spender, gemeinnützig

**Use instead:**

- support, contribute, chip in, voluntary contribution
- URL slug: `/support` (never `/donate`)

The one exception: a disclaimer explicitly clarifying that contributions are *not* tax-deductible donations (e.g. "contributions are voluntary and are not tax-deductible donations — I can't issue donation receipts") may use the word, since its purpose is to rule out the misleading framing, not create it.

## No consideration for payment

No tiers, no perks, no badges, no special access, no public naming of contributors may be tied to a contribution. Payment must never appear inside the sign-up or application flow — keep any mention of support/contributions clearly separate from sign-up CTAs (see `src/components/sections/Join.astro` and `src/components/sections/FAQ.astro` for the current pattern: cost/contribution notes live outside the CTA cards, linking to `/support`).

If a change would introduce anything that looks like consideration for payment, flag it instead of building it.

## Git workflow

- Default branch: `main`.
- Commit messages follow **Conventional Commits** (`type: subject`): `content:` for copy/site content changes (this is primarily a content site, not an app), plus standard `feat:`, `fix:`, `chore:`, `docs:`, `perf:`, `refactor:`, `style:`, `build:` as needed.
- Keep commits small and scoped to one logical change.
- Agents are authorized to create commits on their own during normal work without asking for confirmation first — this overrides the general "always ask before committing" default. Standard git safety rules still apply: no force-push, no `--no-verify`, no rewriting published history, review `git status`/`git diff` before broad `git add`. Pushing to a remote still requires explicit user confirmation.
