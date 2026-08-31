import { addContactToContactsList } from './brevo';

export interface ContactsEnv {
  BREVO_API_KEY: string;
  BREVO_CONTACTS_LIST_ID: string;
}

/**
 * Add an email to the catch-all Brevo contacts list.
 *
 * Every route where a visitor leaves an email address calls this — session
 * signups, closed-group applications, timezone interest, the newsletter form.
 * It is deliberately *not* the newsletter list: that one is marketing consent
 * and stays gated behind an explicit opt-in.
 *
 * Never throws. A Brevo outage must not fail the thing the visitor actually
 * came to do; the failure is logged for manual follow-up instead.
 */
export async function addToContactsList(env: ContactsEnv, options: { email: string }): Promise<void> {
  try {
    await addContactToContactsList(env, { email: options.email });
  } catch (error) {
    console.error('Failed to add contact to Brevo contacts list', error);
  }
}
