/**
 * StaffPulse Unified Transactional Email Service
 * Supports Resend, SMTP, or gracefully logs during development/testing.
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Base responsive email template with StaffPulse enterprise styling
 */
function wrapHtmlTemplate(title: string, contentHtml: string, orgName = 'StaffPulse'): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 20px; color: #f3f4f6; }
    .container { max-width: 580px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { padding: 24px 32px; background: linear-gradient(135deg, #ea580c 0%, #d97706 100%); text-align: left; }
    .logo-text { font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
    .body-content { padding: 32px; font-size: 14px; line-height: 1.6; color: #d1d5db; }
    .body-content h1, .body-content h2 { color: #ffffff; font-size: 18px; margin-top: 0; font-weight: 700; }
    .card { background-color: #1f2937; border: 1px solid #374151; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .btn { display: inline-block; background-color: #ea580c; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; margin-top: 16px; }
    .footer { padding: 20px 32px; background-color: #0f172a; border-top: 1px solid #1e293b; font-size: 11px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-text">${orgName}</div>
    </div>
    <div class="body-content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p>This is an automated operational notification sent on behalf of ${orgName} via StaffPulse Cloud.</p>
      <p>Zero raw biometric scans are stored. Compliant with the Digital Personal Data Protection Act (DPDP) 2023.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.SYSTEM_EMAIL_FROM || 'StaffPulse <notifications@staffpulse.io>';

  if (resendApiKey && !resendApiKey.startsWith('mock_')) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          reply_to: payload.replyTo,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[EmailService] Resend API error:', errorText);
        return { success: false, error: errorText };
      }

      const data = await res.json();
      return { success: true, messageId: data.id };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error sending email';
      return { success: false, error: msg };
    }
  }

  // Fallback: development simulation logger (never breaks flow if API key is not yet set)
  console.log(`[EmailService:Simulated] To: ${payload.to} | Subject: "${payload.subject}"`);
  return { success: true, messageId: `sim_${Date.now()}` };
}

// ── Pre-packaged Transactional Templates ──────────────────────────────────────

export async function sendWelcomeEmployeeEmail(params: {
  to: string;
  name: string;
  orgName: string;
  loginUrl: string;
  employeeCode: string;
}) {
  const content = `
    <h2>Welcome to the team, ${params.name}!</h2>
    <p>Your workforce profile on <strong>${params.orgName}</strong> is ready. You can now track your daily attendance punches, view leave balances, and request regularizations online.</p>
    <div class="card">
      <p><strong>Employee ID:</strong> ${params.employeeCode}</p>
      <p><strong>Work Email:</strong> ${params.to}</p>
    </div>
    <p>Click below to sign in to your self-service portal:</p>
    <a href="${params.loginUrl}" class="btn">Sign In to StaffPulse</a>
  `;

  return sendEmail({
    to: params.to,
    subject: `Welcome to ${params.orgName} — Your Attendance & Leave Portal`,
    html: wrapHtmlTemplate(`Welcome to ${params.orgName}`, content, params.orgName),
  });
}

export async function sendLeaveApprovalRequestEmail(params: {
  to: string;
  managerName: string;
  employeeName: string;
  leaveType: string;
  dates: string;
  daysCount: number;
  reason?: string;
  approvalUrl: string;
  orgName: string;
}) {
  const content = `
    <h2>New Leave Application Pending Review</h2>
    <p>Hello ${params.managerName},</p>
    <p><strong>${params.employeeName}</strong> has submitted a new leave application requiring your authorization:</p>
    <div class="card">
      <p><strong>Leave Type:</strong> ${params.leaveType}</p>
      <p><strong>Duration:</strong> ${params.dates} (${params.daysCount} day${params.daysCount > 1 ? 's' : ''})</p>
      ${params.reason ? `<p><strong>Reason:</strong> ${params.reason}</p>` : ''}
    </div>
    <a href="${params.approvalUrl}" class="btn">Review & Authorize Leave</a>
  `;

  return sendEmail({
    to: params.to,
    subject: `Action Required: Leave Application from ${params.employeeName} (${params.dates})`,
    html: wrapHtmlTemplate('Leave Request Notification', content, params.orgName),
  });
}

export async function sendLeaveDecisionEmail(params: {
  to: string;
  employeeName: string;
  leaveType: string;
  dates: string;
  status: 'approved' | 'rejected';
  approverName: string;
  notes?: string;
  orgName: string;
}) {
  const isApproved = params.status === 'approved';
  const statusColor = isApproved ? '#10b981' : '#ef4444';

  const content = `
    <h2>Your Leave Application has been <span style="color: ${statusColor};">${params.status.toUpperCase()}</span></h2>
    <p>Hello ${params.employeeName},</p>
    <p>Your request for <strong>${params.leaveType}</strong> from <strong>${params.dates}</strong> has been reviewed by <strong>${params.approverName}</strong>.</p>
    ${params.notes ? `<div class="card"><p><strong>Manager Remarks:</strong> ${params.notes}</p></div>` : ''}
    <p>Your updated leave balance ledger is now reflected in your self-service portal.</p>
  `;

  return sendEmail({
    to: params.to,
    subject: `Leave Application ${params.status.toUpperCase()}: ${params.leaveType} (${params.dates})`,
    html: wrapHtmlTemplate(`Leave ${params.status}`, content, params.orgName),
  });
}
