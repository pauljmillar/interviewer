export async function sendInterviewInvite(params: {
  recipientEmail: string;
  recipientName: string;
  positionName: string;
  companyName: string;
  numQuestions: number;
  interviewUrl: string;
  fromEmail: string;
  fromName: string;
}): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY is not set');

  const firstName = params.recipientName.split(/\s+/)[0] ?? params.recipientName;

  const subject = `Interview invitation – ${params.positionName} at ${params.companyName}`;

  const textContent = `Dear ${firstName},

Thank you for your interest in ${params.positionName} at ${params.companyName}. We'd like to learn more about you.

The next step in the process is for you to chat with our AI agent for a few minutes. Click the link below to begin the session.

The interview is ${params.numQuestions} questions, should take no more than 15 minutes, and will be recorded. We are considering several candidates for this position, and your responses in this interview will determine who advances to the next round to meet with one of our recruiting team.

${params.interviewUrl}

Best regards,
${params.companyName}`;

  const htmlContent = `<p>Dear ${firstName},</p>
<p>Thank you for your interest in <strong>${params.positionName}</strong> at <strong>${params.companyName}</strong>. We'd like to learn more about you.</p>
<p>The next step in the process is for you to chat with our AI agent for a few minutes. Click the link below to begin the session.</p>
<p>The interview is ${params.numQuestions} questions, should take no more than 15 minutes, and will be recorded. We are considering several candidates for this position, and your responses in this interview will determine who advances to the next round to meet with one of our recruiting team.</p>
<p><a href="${params.interviewUrl}">${params.interviewUrl}</a></p>
<p>Best regards,<br>${params.companyName}</p>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: params.fromName, email: params.fromEmail },
      to: [{ name: params.recipientName, email: params.recipientEmail }],
      subject,
      textContent,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
}
