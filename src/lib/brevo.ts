function base64EncodeUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

interface BrevoEnv {
  BREVO_API_KEY: string;
  FROM_EMAIL: string;
  FROM_NAME: string;
}

// The newsletter list is marketing consent — only explicit opt-ins reach it.
interface BrevoNewsletterListEnv {
  BREVO_API_KEY: string;
  BREVO_NEWSLETTER_LIST_ID: string;
}

// The contacts list is the catch-all: every email anyone leaves us, whatever
// form it came through.
interface BrevoContactsListEnv {
  BREVO_API_KEY: string;
  BREVO_CONTACTS_LIST_ID: string;
}

// Each list var holds one or more numeric IDs, comma-separated.
function parseListIds(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Email layout
//
// Transactional emails are built with the same scaffold and tokens as the
// hand-written campaigns in `emails/` (see `emails/README.md`): nested tables,
// every style inlined, hex colors only — old-fashioned on purpose, because
// that is what survives Gmail, Outlook and Apple Mail unchanged.
// ---------------------------------------------------------------------------

const BODY_FONT = "Karla,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";
const HEADING_FONT = "Fraunces,Georgia,'Times New Roman',serif";
const PAGE_BG = '#faf9f6'; // base3
const TEXT_BODY = '#374151';
const TEXT_HEADING = '#1e293b';
const TEXT_SECONDARY = '#4a5568';
const LINK = '#6c71c4'; // violet
const RULE = '#eee8d5'; // base2

/** A body paragraph. The last one before the footer rule takes `last: true`. */
function p(html: string, options: { last?: boolean } = {}): string {
  return `<p style="margin:0 0 ${options.last ? 32 : 20}px 0;">${html}</p>`;
}

/** An inline link — clients apply their own blue without an explicit style. */
function link(href: string, label: string): string {
  return `<a href="${href}" style="color:${LINK};text-decoration:underline;">${label}</a>`;
}

/** The one primary action of an email. Table-based so Outlook renders it. */
function button(href: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td align="left" style="padding:4px 0 28px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
                    <tr>
                      <td align="center" bgcolor="${LINK}" style="background-color:${LINK};border-radius:8px;">
                        <a href="${href}" style="display:inline-block;padding:13px 28px;font-family:${BODY_FONT};font-size:17px;line-height:1.2;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>`;
}

/** The site's sharpie highlight, pre-composited — email clients drop alpha. */
function highlight(html: string): string {
  return `<span style="background-color:#e0dcec;padding:0.15em 0.2em 0.1em;margin:0 0.05em;border-radius:2px 3px 2px 3px;-webkit-box-decoration-break:clone;box-decoration-break:clone;">${html}</span>`;
}

/** A bulleted list. Outlook drops the inherited font inside lists, hence the repeat. */
function list(items: string[]): string {
  const li = items
    .map(
      (item, index) =>
        `<li style="margin:${index === items.length - 1 ? '0' : '0 0 10px 0'};padding:0 0 0 4px;">${item}</li>`,
    )
    .join('\n              ');
  return `<ul style="margin:0 0 20px 0;padding:0 0 0 24px;font-family:${BODY_FONT};font-size:17px;line-height:1.65;color:${TEXT_BODY};">
              ${li}
            </ul>`;
}

/** A labelled value, for the notification emails that are really a form dump. */
function field(label: string, valueHtml: string): string {
  return `<p style="margin:0 0 2px 0;font-size:13px;line-height:1.6;color:${TEXT_SECONDARY};">${label}</p>
            <p style="margin:0 0 20px 0;">${valueHtml}</p>`;
}

/** Free-text answers arrive with newlines; without this they collapse into one run-on line. */
function multiline(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, '<br>');
}

/** The rule and context line every attendee-facing email ends on. */
function footerBlock(text: string): string {
  return `<hr style="border:0;border-top:1px solid ${RULE};margin:0 0 20px 0;height:1px;line-height:1px;">

            <p style="margin:0;font-size:13px;line-height:1.6;color:${TEXT_SECONDARY};">
              ${text}
            </p>`;
}

/**
 * Wraps body content in the shared scaffold. `preheader` is the grey preview
 * line inbox clients show next to the subject — it is read without the
 * greeting in front of it, so it has to stand alone.
 */
function renderEmail(options: { preheader: string; heading: string; body: string; footer?: string }): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${PAGE_BG};margin:0;padding:0;width:100%;">
  <tr>
    <td align="center" style="padding:0;">

      <!-- preheader: inbox preview line, hidden in the body -->
      <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${PAGE_BG};">
        ${options.preheader}
      </div>

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;">
        <tr>
          <td style="padding:40px 24px 48px 24px;font-family:${BODY_FONT};font-size:17px;line-height:1.65;color:${TEXT_BODY};">

            <h1 style="margin:0 0 28px 0;font-family:${HEADING_FONT};font-size:28px;line-height:1.3;font-weight:700;color:${TEXT_HEADING};">${options.heading}</h1>

            ${options.body.trim()}

            ${options.footer ? footerBlock(options.footer) : ''}

          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>`.trim();
}

interface BrevoAttachment {
  name: string;
  content: string; // base64
}

async function sendBrevoEmail(
  env: BrevoEnv,
  options: {
    to: string;
    subject: string;
    htmlContent: string;
    attachment?: BrevoAttachment[];
  },
): Promise<void> {
  // No API key configured (e.g. local dev without Brevo set up) — log the
  // email instead of sending it, so the full flow (confirm links, ICS
  // content, etc.) can still be exercised end-to-end without a real account.
  if (!env.BREVO_API_KEY) {
    console.log(
      [
        '[dev email — not sent, BREVO_API_KEY is not set]',
        `To: ${options.to}`,
        `Subject: ${options.subject}`,
        '',
        options.htmlContent,
        options.attachment?.length ? `\n[attachments: ${options.attachment.map((a) => a.name).join(', ')}]` : '',
      ].join('\n'),
    );
    return;
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: env.FROM_EMAIL, name: env.FROM_NAME },
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.htmlContent,
      attachment: options.attachment,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo send failed (${response.status}): ${body}`);
  }
}

export async function sendConfirmationRequestEmail(
  env: BrevoEnv,
  options: { to: string; sessionLabel: string; confirmUrl: string; cancelUrl: string },
): Promise<void> {
  const sessionLabel = escapeHtml(options.sessionLabel);
  await sendBrevoEmail(env, {
    to: options.to,
    subject: `Confirm your spot \u2014 ${sessionLabel}`,
    htmlContent: renderEmail({
      preheader: `You signed up for the open group session on ${sessionLabel} \u2014 confirm you're coming and you'll get the link and a calendar invite.`,
      heading: 'Confirm your spot',
      body: [
        p('Hi,'),
        p(
          `You signed up for the open group session on <strong style="font-weight:700;color:${TEXT_HEADING};">${sessionLabel}</strong>.`,
        ),
        p("Please confirm you'd like to attend \u2014 you'll get the link and a calendar invite once you do."),
        button(options.confirmUrl, 'Confirm my spot'),
        p("If you didn't request this, you can ignore this email."),
        p(`Changed your mind? ${link(options.cancelUrl, 'Cancel my spot \u2192')}`, { last: true }),
      ].join('\n\n            '),
      footer: "You're getting this because you signed up for a session of the Practice Group for Inner Work.",
    }),
  });
}

export async function sendCalendarInviteEmail(
  env: BrevoEnv,
  options: {
    to: string;
    sessionLabel: string;
    zoomLink: string;
    icsContent: string;
    googleCalendarLink: string;
    cancelUrl: string;
  },
): Promise<void> {
  const sessionLabel = escapeHtml(options.sessionLabel);
  await sendBrevoEmail(env, {
    to: options.to,
    subject: `You're confirmed \u2014 ${sessionLabel}`,
    htmlContent: renderEmail({
      preheader: `You're confirmed for the open group session on ${sessionLabel}. Here's the join link and a calendar invite.`,
      heading: "You're confirmed",
      body: [
        p('Hi,'),
        p(
          `You're confirmed for the open group session on <strong style="font-weight:700;color:${TEXT_HEADING};">${sessionLabel}</strong>.`,
        ),
        p(`Join link: ${link(options.zoomLink, options.zoomLink)}`),
        p(
          `A calendar invite is attached. Or ${link(options.googleCalendarLink, 'add it to Google Calendar \u2192')}`,
        ),
        p('A few tips to help you feel comfortable during the session:'),
        list([
          '<strong>Don\u2019t do it at your desk:</strong> Find a comfortable place in your living room or elsewhere and make it cozy.',
          '<strong>Don\u2019t worry about how you look:</strong> Camera angle and lighting setup don\u2019t matter for this one.',
          '<strong>Don\u2019t rush into it:</strong> Leave some buffer before and after our session to slow down and digest.',
        ]),
        p(link('https://innerwork.nikolasburk.com/#how-to-prepare', 'More on how to prepare \u2192')),
        p('See you there.'),
        p(`Can't make it anymore? ${link(options.cancelUrl, 'Cancel my spot \u2192')}`, { last: true }),
      ].join('\n\n            '),
      footer: "You're getting this because you signed up for a session of the Practice Group for Inner Work.",
    }),
    attachment: [
      {
        name: 'session.ics',
        content: base64EncodeUtf8(options.icsContent),
      },
    ],
  });
}

export async function sendApplicationNotificationEmail(
  env: BrevoEnv,
  options: {
    to: string;
    name: string;
    email: string;
    whyNow: string;
    commitment: string;
    anythingElse: string;
    openToContribution: boolean;
  },
): Promise<void> {
  const name = escapeHtml(options.name);
  const email = escapeHtml(options.email);
  await sendBrevoEmail(env, {
    to: options.to,
    subject: `New closed-group application \u2014 ${name}`,
    htmlContent: renderEmail({
      preheader: `${name} applied for the closed group.`,
      heading: 'New closed-group application',
      body: [
        field('Name', name),
        field('Email', link(`mailto:${email}`, email)),
        field('Why now', multiline(options.whyNow)),
        field('Commitment', multiline(options.commitment)),
        options.anythingElse ? field('Anything else', multiline(options.anythingElse)) : '',
        field('Open to contributing', options.openToContribution ? 'Yes' : 'No'),
      ]
        .filter(Boolean)
        .join('\n\n            '),
    }),
  });
}

export async function sendApplicationReceivedEmail(
  env: BrevoEnv,
  options: { to: string; name: string; deadlineLabel: string; sessionLabels: string[] },
): Promise<void> {
  const name = escapeHtml(options.name);
  const deadlineLabel = escapeHtml(options.deadlineLabel);
  await sendBrevoEmail(env, {
    to: options.to,
    subject: `Got your application \u2014 Practice group for inner work`,
    htmlContent: renderEmail({
      preheader: "I've got your application for the closed group \u2014 here's what happens next.",
      heading: 'Got your application',
      body: [
        p(`Hi ${name},`),
        p(
          `I've got your application for the closed group. Applications close <strong style="font-weight:700;color:${TEXT_HEADING};">${deadlineLabel}</strong>, and ${highlight("I'll get back to you either way")} once they do.`,
        ),
        p('If you\u2019re in, the cycle runs six sessions \u2014 first and third Wednesday, 19:00\u201321:00 Berlin time:'),
        list(options.sessionLabels.map((label) => escapeHtml(label))),
        p('Nothing to do until then. If something changes on your side, or you have a question, just reply to this email.'),
        p('Thanks for taking the time,<br>Nikolas', { last: true }),
      ].join('\n\n            '),
      footer: "You're getting this because you applied to the closed group of the Practice Group for Inner Work.",
    }),
  });
}

async function addBrevoContact(
  env: { BREVO_API_KEY: string },
  options: { email: string; listIds: number[]; label: string },
): Promise<void> {
  // No API key/list configured (e.g. local dev, or before a Brevo list has
  // been created) — log instead of calling the API, same fallback as
  // sendBrevoEmail above.
  if (!env.BREVO_API_KEY || options.listIds.length === 0) {
    console.log(`[dev ${options.label} — not sent to Brevo, API key or list ID not set] ${options.email}`);
    return;
  }

  const response = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    // updateEnabled: an existing contact gets added to these lists rather
    // than the call failing — which is what makes every caller idempotent.
    body: JSON.stringify({
      email: options.email,
      listIds: options.listIds,
      updateEnabled: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo add-contact failed (${response.status}): ${body}`);
  }
}

export async function addContactToNewsletterList(
  env: BrevoNewsletterListEnv,
  options: { email: string },
): Promise<void> {
  await addBrevoContact(env, {
    email: options.email,
    listIds: parseListIds(env.BREVO_NEWSLETTER_LIST_ID),
    label: 'newsletter signup',
  });
}

export async function addContactToContactsList(
  env: BrevoContactsListEnv,
  options: { email: string },
): Promise<void> {
  await addBrevoContact(env, {
    email: options.email,
    listIds: parseListIds(env.BREVO_CONTACTS_LIST_ID),
    label: 'contact',
  });
}

export async function sendTimezoneInterestNotificationEmail(
  env: BrevoEnv,
  options: { to: string; email: string },
): Promise<void> {
  const email = escapeHtml(options.email);
  await sendBrevoEmail(env, {
    to: options.to,
    subject: `New Asia-timezone interest signup \u2014 ${email}`,
    htmlContent: renderEmail({
      preheader: `${email} registered interest in an Asian-friendly time zone group.`,
      heading: 'New Asia-timezone interest',
      body: [
        p('Someone registered interest in an Asian-friendly time zone group.'),
        field('Email', link(`mailto:${email}`, email)),
      ].join('\n\n            '),
    }),
  });
}

/** "7 confirmed · 2 awaiting confirmation" — the head count both host notifications carry. */
function headCount(confirmed: number, pending: number): string {
  return `${confirmed} confirmed \u00b7 ${pending} awaiting confirmation`;
}

export async function sendOpenSignupNotificationEmail(
  env: BrevoEnv,
  options: { to: string; email: string; sessionLabel: string; pending: number; confirmed: number },
): Promise<void> {
  const email = escapeHtml(options.email);
  const sessionLabel = escapeHtml(options.sessionLabel);
  await sendBrevoEmail(env, {
    to: options.to,
    subject: `New open-session signup \u2014 ${email}`,
    htmlContent: renderEmail({
      preheader: `${email} signed up for the open group session on ${sessionLabel}.`,
      heading: 'New open-session signup',
      body: [
        p('Someone signed up for the open group session. They still have to confirm before they get the link.'),
        field('Email', link(`mailto:${email}`, email)),
        field('Session', sessionLabel),
        field('Signed up so far', headCount(options.confirmed, options.pending)),
      ].join('\n\n            '),
    }),
  });
}

export async function sendOpenSignupCancellationEmail(
  env: BrevoEnv,
  options: { to: string; email: string; sessionLabel: string; pending: number; confirmed: number },
): Promise<void> {
  const email = escapeHtml(options.email);
  const sessionLabel = escapeHtml(options.sessionLabel);
  await sendBrevoEmail(env, {
    to: options.to,
    subject: `Open-session signup cancelled \u2014 ${email}`,
    htmlContent: renderEmail({
      preheader: `${email} cancelled their spot for the open group session on ${sessionLabel}.`,
      heading: 'Open-session signup cancelled',
      body: [
        p('Someone cancelled their spot for the open group session.'),
        field('Email', link(`mailto:${email}`, email)),
        field('Session', sessionLabel),
        field('Still signed up', headCount(options.confirmed, options.pending)),
      ].join('\n\n            '),
    }),
  });
}
