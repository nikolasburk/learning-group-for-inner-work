/**
 * Renders every transactional email into one HTML page you can open in a browser.
 *
 *   pnpm preview:emails && open .preview/emails.html
 *
 * It leans on the dev fallback in `sendBrevoEmail`: with no BREVO_API_KEY the
 * email is logged rather than sent, so capturing console.log gets us the exact
 * HTML Brevo would receive. Fixture data only — the real cycle dates come from
 * the API routes, so check those with `pnpm dev` when they matter.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  sendApplicationNotificationEmail,
  sendApplicationReceivedEmail,
  sendCalendarInviteEmail,
  sendConfirmationRequestEmail,
  sendOpenSignupCancellationEmail,
  sendOpenSignupNotificationEmail,
  sendTimezoneInterestNotificationEmail,
} from '../src/lib/brevo.ts';

const OUT = process.argv[2] ?? '.preview/emails.html';

const captured: { subject: string; to: string; html: string; attachments: string }[] = [];
const realLog = console.log;
console.log = (text: string) => {
  captured.push({
    subject: /^Subject: (.*)$/m.exec(text)?.[1] ?? '(no subject)',
    to: /^To: (.*)$/m.exec(text)?.[1] ?? '',
    html: text.slice(text.indexOf('\n<table')),
    attachments: /^\[attachments: (.*)\]$/m.exec(text)?.[1] ?? '',
  });
};

const env = { BREVO_API_KEY: '', FROM_EMAIL: 'hello@example.com', FROM_NAME: 'Nikolas' };
const sessionLabel = 'September 2';

await sendConfirmationRequestEmail(env, {
  to: 'you@example.com',
  sessionLabel,
  confirmUrl: 'https://innerwork.nikolasburk.com/api/confirm?token=preview',
  cancelUrl: 'https://innerwork.nikolasburk.com/api/cancel?token=preview',
});
await sendCalendarInviteEmail(env, {
  to: 'you@example.com',
  sessionLabel,
  zoomLink: 'https://zoom.us/j/12345678901?pwd=previewpreviewpreview',
  icsContent: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
  googleCalendarLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
  cancelUrl: 'https://innerwork.nikolasburk.com/api/cancel?token=preview',
});
await sendApplicationReceivedEmail(env, {
  to: 'you@example.com',
  name: 'Alex',
  deadlineLabel: 'September 9',
  sessionLabels: ['September 16', 'October 7', 'October 21', 'November 4', 'November 18', 'December 2'],
});
// Multi-paragraph answers: the case that proves line breaks survive.
await sendApplicationNotificationEmail(env, {
  to: 'nikolas@example.com',
  name: 'Alex Example',
  email: 'alex@example.com',
  whyNow: "I've been circling this for a while.\n\nA few things came to a head this summer, and doing it alone stopped working.",
  commitment: 'Yes — Wednesdays are free and I can make all six.',
  anythingElse: 'Nothing else, thanks for reading this far.',
  openToContribution: true,
});
await sendTimezoneInterestNotificationEmail(env, { to: 'nikolas@example.com', email: 'someone@example.com' });
await sendOpenSignupNotificationEmail(env, {
  to: 'nikolas@example.com',
  email: 'someone@example.com',
  sessionLabel,
  pending: 2,
  confirmed: 7,
});
await sendOpenSignupCancellationEmail(env, {
  to: 'nikolas@example.com',
  email: 'someone@example.com',
  sessionLabel,
  pending: 1,
  confirmed: 7,
});

console.log = realLog;

const page = `<!doctype html>
<html><head><meta charset="utf-8"><title>Email previews</title>
<style>
  body{margin:0;background:#e9e7e1;font:14px/1.5 -apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#374151;}
  .wrap{max-width:680px;margin:0 auto;padding:32px 16px 64px;}
  .meta{margin:40px 0 10px;font-size:13px;color:#4a5568;}
  .meta b{color:#1e293b;font-weight:600;}
  .mail{background:#faf9f6;border:1px solid #d8d4c8;border-radius:10px;overflow:hidden;}
</style></head><body><div class="wrap">
<h1 style="font:600 20px/1.3 -apple-system,sans-serif;color:#1e293b;margin:0 0 4px;">Transactional email previews</h1>
<p style="margin:0;color:#4a5568;">Rendered from <code>src/lib/brevo.ts</code> with fixture data. Fraunces and Karla are not loaded here — you are seeing the same fallback stack most mail clients use.</p>
${captured
  .map(
    (m) => `<p class="meta"><b>To:</b> ${m.to} &nbsp;·&nbsp; <b>Subject:</b> ${m.subject}${
      m.attachments ? ` &nbsp;·&nbsp; <b>Attached:</b> ${m.attachments}` : ''
    }</p><div class="mail">${m.html}</div>`,
  )
  .join('\n')}
</div></body></html>`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, page);
realLog(`Wrote ${captured.length} emails to ${OUT}`);
