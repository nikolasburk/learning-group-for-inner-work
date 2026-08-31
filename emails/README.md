# Emails

Newsletter and announcement emails, sent through Brevo.

Each email is a pair of files sharing one basename:

```
YYMMDD-slug.md     ← source of truth for the copy
YYMMDD-slug.html   ← the version you paste into Brevo
```

The date prefix is the send date (`260827` = 2026-08-27). Write the markdown
first, then convert it to HTML using the rules below. When copy changes, change
the markdown and re-mirror it into the HTML — never edit the HTML copy alone.

## Why the HTML looks like that

Email clients strip `<style>` blocks, ignore classes, and have no CSS variables,
so the HTML is deliberately old-fashioned: nested `<table>` layout, every style
inlined, hex colors only (no `rgba()`, no `oklch()`), no shorthand that Outlook
chokes on. It is not meant to be pretty source — it is meant to survive Gmail,
Outlook and Apple Mail unchanged.

## Design tokens

The palette mirrors the site (`tailwind.config.mjs` → `colors.solarized`) so an
email looks like it came from the same place as the landing page.

| Role | Value | Site token |
| --- | --- | --- |
| Page background | `#faf9f6` | `base3` |
| Body text | `#374151` | `textBody` |
| Headings | `#1e293b` | `textHeading` |
| Footer / secondary text | `#4a5568` | `textSecondary` |
| Links | `#6c71c4` | `violet` |
| Highlight background | `#e0dcec` | `sharpieViolet` @ 50% |
| Divider rule | `#eee8d5` | `base2` |

Fonts follow the site too, each with a full fallback stack because webfonts
mostly do not load in email:

- Headings — `Fraunces,Georgia,'Times New Roman',serif`
- Body — `Karla,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`

Body copy is `17px` at `line-height:1.65`; the `<h1>` is `28px` at `1.3`.
Content is capped at `max-width:600px` and centered.

**On the highlight color:** the site's `.sharpie-highlight` is
`rgba(198, 190, 226, 0.5)` over `#faf9f6`. Email clients don't reliably render
alpha, so it's pre-composited to the opaque equivalent `#e0dcec`. The site's
rotation, blur and gradient layers are dropped — they rely on pseudo-elements
and `transform`, neither of which survives an email client. What's left is the
flat swatch plus `box-decoration-break:clone`, which keeps the highlight looking
continuous when it wraps across lines.

## Transactional emails

The automated emails — confirm-your-spot, you're-confirmed, got-your-application
— are not in this folder; they're built in `src/lib/brevo.ts` from a shared
`renderEmail()` scaffold that uses the same tokens, fonts and table layout as
the campaigns here. Change a token in one place, change it in the other. The
primary action in those emails is a table-based `button()` in `#6c71c4` with
white text, matching the site's violet button; secondary actions (cancelling a
spot, adding to Google Calendar) stay underlined links.

Their footer is the context line only — no `{{ unsubscribe }}`, since Brevo
substitutes that tag for campaigns, not for transactional sends. The two internal
notifications (a new application, an Asia-timezone signup) use the same scaffold
with no footer at all — they go to `NOTIFY_EMAIL`, not to a subscriber.

To see them, `pnpm preview:emails` renders all five into `.preview/emails.html`
with fixture data — open that in a browser. It reads the emails straight out of
`src/lib/brevo.ts`, so it can't drift from what actually gets sent; what it
can't check is the data the API routes pass in, which is what `pnpm dev` with
`BREVO_API_KEY` unset is for (the email is logged instead of sent).

## Converting a markdown file to HTML

Start from the most recent `.html` in this folder and replace the content —
that's faster and safer than assembling the scaffold from scratch.

1. **Two header comments.** First line is the subject, taken verbatim from the
   markdown `# ` heading. Second line points back at the source file:

   ```html
   <!-- Subject: Join our one-off session on Wednesday -->
   <!-- Copy is verbatim from 260831-one-off-session-announcement.md — edit the markdown first, then mirror it here. -->
   ```

2. **Preheader.** The grey preview line inbox clients show next to the subject.
   Use the first sentence of the body, lightly rewritten to stand alone (it is
   read without the greeting in front of it). It lives in a hidden `<div>` whose
   text color matches the background, so it never renders in the body itself.

3. **Heading.** The `# ` line becomes the `<h1>`. Keep emoji as literal
   characters — the document is UTF-8, no entities needed.

4. **Paragraphs.** Each markdown paragraph becomes one `<p>` with
   `style="margin:0 0 20px 0;"`. The last paragraph before the footer rule gets
   `margin:0 0 32px 0;` instead, to open up space above the divider.

5. **Line breaks.** A single newline inside a paragraph (the sign-off, for
   example) becomes `<br>`, not a new `<p>`.

6. **Lists.** `<ol>` / `<ul>` with `margin:0 0 20px 0;padding:0 0 0 24px;`. Outlook
   drops the inherited font inside lists, so repeat the body
   `font-family` / `font-size` / `line-height` / `color` on the list element
   itself. Each `<li>` gets `margin:0 0 10px 0;padding:0 0 0 4px;`, and the last
   one gets `margin:0;` so the list's own bottom margin isn't doubled.

7. **Bold.** `**text**` becomes
   `<strong style="font-weight:700;color:#1e293b;">text</strong>` — the darker
   heading color makes the label read as a label. Some clients render bare
   `<strong>` inconsistently, hence the explicit weight.

8. **Links.** `[text](url)` becomes
   `<a href="url" style="color:#6c71c4;text-decoration:underline;">text</a>`.
   Every link needs its own inline style; clients apply their own blue otherwise.

9. **Highlights.** `<span class="sharpie-highlight sharpie-rotate-1">` in the
   markdown becomes this inline span (the class is meaningless in email):

   ```html
   <span style="background-color:#e0dcec;padding:0.15em 0.2em 0.1em;margin:0 0.05em;border-radius:2px 3px 2px 3px;-webkit-box-decoration-break:clone;box-decoration-break:clone;">…</span>
   ```

10. **Footer.** Fixed boilerplate on every email — an `<hr>` in `#eee8d5`, then
   the 13px context line and the unsubscribe link. Brevo substitutes
   `{{ unsubscribe }}` at send time; leave the tag exactly as written.

11. **Copy is verbatim.** Don't fix wording, punctuation or apostrophes while
   converting. If you spot a typo, fix it in the markdown, then mirror it.

## Sending

Paste the full contents of the `.html` file into Brevo's HTML/code editor, and
use the `Subject:` comment as the campaign subject. Send yourself a test first —
that is the only way to catch a client-specific rendering problem.
