import { addContactToNewsletterList } from './brevo';

interface NewsletterEnv {
  DB: D1Database;
  BREVO_API_KEY: string;
  BREVO_LIST_ID: string;
}

export type SubscribeToNewsletterResult =
  | { status: 'subscribed' }
  | { status: 'already-subscribed' };

export async function subscribeToNewsletter(
  env: NewsletterEnv,
  options: { email: string },
): Promise<SubscribeToNewsletterResult> {
  const email = options.email.trim().toLowerCase();

  try {
    await env.DB.prepare(`INSERT INTO newsletter_signups (email) VALUES (?)`).bind(email).run();
  } catch {
    // Unique-index hit: this email is already subscribed.
    return { status: 'already-subscribed' };
  }

  try {
    await addContactToNewsletterList(env, { email });
  } catch (error) {
    console.error('Failed to add contact to Brevo newsletter list', error);
  }

  return { status: 'subscribed' };
}
