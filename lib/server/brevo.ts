export const DEFAULT_EMAIL_SUBJECT =
  'Interview invitation – {{positionName}} at {{companyName}}';

export const DEFAULT_EMAIL_HTML = `<p>Dear {{firstName}},</p>
<p>Thank you for your interest in <strong>{{positionName}}</strong> at <strong>{{companyName}}</strong>. We'd like to learn more about you.</p>
<p>The next step in the process is for you to chat with our AI agent for a few minutes. Click the link below to begin the session.</p>
<p>The interview should take no more than 15 minutes and will be recorded. We are considering several candidates for this position, and your responses will determine who advances to the next round.</p>
<p><a href="{{interviewUrl}}">{{interviewUrl}}</a></p>
<p>Best regards,<br>{{companyName}}</p>`;

function applyPlaceholders(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

type RawEmailParams = {
  subject: string;
  htmlContent: string;
  textContent?: string;
  templateId?: never;
  templateParams?: never;
};

type TemplateEmailParams = {
  templateId: number;
  templateParams: Record<string, string>;
  subject?: never;
  htmlContent?: never;
  textContent?: never;
};

export async function sendTransactionalEmail(params: {
  fromEmail: string;
  fromName: string;
  toEmail: string;
  toName: string;
} & (RawEmailParams | TemplateEmailParams)): Promise<string> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not set');

  const payload: Record<string, unknown> = {
    sender: { name: params.fromName, email: params.fromEmail },
    to: [{ name: params.toName, email: params.toEmail }],
  };

  if ('templateId' in params && params.templateId) {
    payload.templateId = params.templateId;
    payload.params = params.templateParams;
  } else {
    const p = params as RawEmailParams & { fromEmail: string; fromName: string; toEmail: string; toName: string };
    payload.subject = p.subject;
    payload.htmlContent = p.htmlContent;
    if (p.textContent) payload.textContent = p.textContent;
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }

  const data = await res.json().catch(() => ({})) as { messageId?: string };
  return data.messageId ?? '';
}

export async function sendInterviewInvite(params: {
  recipientEmail: string;
  recipientName: string;
  positionName: string;
  companyName: string;
  numQuestions: number;
  interviewUrl: string;
  fromEmail: string;
  fromName: string;
  templateId?: number | null;
  subjectOverride?: string;
  htmlOverride?: string;
}): Promise<void> {
  const firstName = params.recipientName.split(/\s+/)[0] ?? params.recipientName;

  const base = {
    fromEmail: params.fromEmail,
    fromName: params.fromName,
    toEmail: params.recipientEmail,
    toName: params.recipientName,
  };

  if (params.templateId) {
    await sendTransactionalEmail({
      ...base,
      templateId: params.templateId,
      templateParams: {
        firstName,
        positionName: params.positionName,
        companyName: params.companyName,
        interviewLink: params.interviewUrl,
      },
    });
    return;
  }

  // Fall back to raw HTML
  const vars: Record<string, string> = {
    firstName,
    positionName: params.positionName,
    companyName: params.companyName,
    interviewUrl: params.interviewUrl,
  };

  const subject = applyPlaceholders(params.subjectOverride ?? DEFAULT_EMAIL_SUBJECT, vars);
  const htmlContent = applyPlaceholders(params.htmlOverride ?? DEFAULT_EMAIL_HTML, vars);
  const textContent = `Dear ${firstName},\n\nYou have been invited to interview for ${params.positionName} at ${params.companyName}.\n\nClick here to begin: ${params.interviewUrl}\n\nBest regards,\n${params.companyName}`;

  await sendTransactionalEmail({ ...base, subject, htmlContent, textContent });
}
