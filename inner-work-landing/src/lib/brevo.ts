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
	options: { to: string; sessionLabel: string; confirmUrl: string },
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
		`.trim(),
		attachment: [
			{
				name: 'session.ics',
				content: base64EncodeUtf8(options.icsContent),
			},
		],
	});
}
