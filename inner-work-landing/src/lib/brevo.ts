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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
  await sendBrevoEmail(env, {
    to: options.to,
    subject: `Confirm your spot — ${options.sessionLabel}`,
    htmlContent: `
      <p>Hi,</p>
      <p>You signed up for the open group session on <strong>${options.sessionLabel}</strong>.</p>
      <p>Please confirm you'd like to attend — you'll get the link and a calendar invite once you do.</p>
      <p><a href="${options.confirmUrl}">Confirm my spot →</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
      <p>Changed your mind? <a href="${options.cancelUrl}">Cancel your spot →</a></p>
    `.trim(),
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
  await sendBrevoEmail(env, {
    to: options.to,
    subject: `You're confirmed — ${options.sessionLabel}`,
    htmlContent: `
      <p>Hi,</p>
      <p>You're confirmed for the open group session on <strong>${options.sessionLabel}</strong>.</p>
      <p>Join link: <a href="${options.zoomLink}">${options.zoomLink}</a></p>
      <p>A calendar invite is attached. Or <a href="${options.googleCalendarLink}">add it to Google Calendar →</a></p>
      <p>See you there.</p>
      <p>Can't make it anymore? <a href="${options.cancelUrl}">Cancel your spot →</a></p>
    `.trim(),
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
  options: { to: string; name: string; email: string; whyNow: string; commitment: string; anythingElse: string },
): Promise<void> {
  await sendBrevoEmail(env, {
    to: options.to,
    subject: `New closed-group application — ${options.name}`,
    htmlContent: `
      <p><strong>Name:</strong> ${escapeHtml(options.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(options.email)}</p>
      <p><strong>Why now:</strong><br>${escapeHtml(options.whyNow)}</p>
      <p><strong>Commitment:</strong><br>${escapeHtml(options.commitment)}</p>
      ${options.anythingElse ? `<p><strong>Anything else:</strong><br>${escapeHtml(options.anythingElse)}</p>` : ''}
    `.trim(),
  });
}

export async function sendApplicationReceivedEmail(
  env: BrevoEnv,
  options: { to: string; name: string },
): Promise<void> {
  await sendBrevoEmail(env, {
    to: options.to,
    subject: `Got your application — Learning group for inner work`,
    htmlContent: `
      <p>Hi ${escapeHtml(options.name)},</p>
      <p>I've got your application for the closed group. I'll get back to you either way, once applications close.</p>
      <p>Thanks for taking the time.</p>
    `.trim(),
  });
}
