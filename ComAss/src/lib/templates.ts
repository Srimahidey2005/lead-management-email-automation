export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  body: string;
}

export const DEFAULT_SUBJECT = 'Exclusive Singing Bowl Presentation';
export const DEFAULT_BODY =
  'Hello,\n\nBased on your interest in holistic wellness and sound therapy, I have attached a brief presentation on our premium singing bowls.\n\nLet me know if you would like to discuss further.\n\nBest regards,';

/** Built-in starter templates. Placeholders: {{name}}, {{firstName}}, {{company}} */
export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'presentation',
    name: 'Presentation Share',
    description: 'Send the singing bowl presentation with a short personal note.',
    subject: DEFAULT_SUBJECT,
    body: DEFAULT_BODY,
  },
  {
    id: 'introduction',
    name: 'Introduction',
    description: 'A friendly first message introducing your singing bowl collection.',
    subject: 'Introducing our singing bowl collection',
    body:
      'Hello {{firstName}},\n\nI wanted to introduce our collection of handcrafted singing bowls, made for sound therapy and mindful practice. I thought they might be a good fit for {{company}}.\n\nWould you be open to a quick chat, or would you like me to send more details?\n\nBest regards,',
  },
  {
    id: 'follow-up',
    name: 'Follow-up',
    description: 'A polite nudge for leads who have not replied yet.',
    subject: 'Following up on our singing bowls',
    body:
      'Hello {{firstName}},\n\nI wanted to follow up on my earlier message about our singing bowls. I would be happy to answer any questions or share the presentation again.\n\nThank you for your time,',
  },
];

/**
 * Replaces {{name}}, {{firstName}} and {{company}} (case-insensitive) with
 * lead values, using neutral fallbacks when a value is empty.
 */
export function renderTemplate(text: string, vars: { name?: string; company?: string }): string {
  const name = (vars.name ?? '').trim();
  const values: Record<string, string> = {
    name: name || 'there',
    firstname: name.split(/\s+/)[0] || 'there',
    company: (vars.company ?? '').trim() || 'your organization',
  };
  return text.replace(/\{\{\s*(name|firstName|company)\s*\}\}/gi, (_, key: string) => values[key.toLowerCase()]);
}
