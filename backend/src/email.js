const nodemailer = require('nodemailer');

/** Escape special HTML characters to prevent injection in email bodies */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendPasswordResetEmail(toEmail, toName, resetLink) {
  const safeName = escapeHtml(toName);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;">&#x1F3E2;</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">RTO Tracker</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:12px;">Return-To-Office Compliance Dashboard</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              <h2 style="margin:0 0 16px;color:#111827;font-size:18px;font-weight:700;">Password Reset Request</h2>
              <p style="margin:0 0 12px;color:#374151;font-size:14px;line-height:1.6;">Hi <strong>${safeName}</strong>,</p>
              <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6;">
                We received a request to reset your <strong>RTO Tracker</strong> account password.
                Click the button below to choose a new password:
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px;">
                    <a href="${resetLink}"
                       style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 36px;border-radius:8px;letter-spacing:0.2px;">
                      Reset My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 8px;color:#6b7280;font-size:12px;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="${resetLink}" style="color:#2563eb;font-size:12px;">${resetLink}</a>
              </p>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 16px;">
                    <p style="margin:0;color:#78350f;font-size:13px;line-height:1.5;">
                      &#9203; This link expires in <strong>1 hour</strong>.<br/>
                      If you did not request a password reset, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                &copy; ${new Date().getFullYear()} RTO Tracker &mdash;
                <a href="https://rto.dizweb.solutions" style="color:#6b7280;text-decoration:none;">rto.dizweb.solutions</a>
              </p>
              <p style="margin:6px 0 0;color:#d1d5db;font-size:11px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    process.env.SMTP_FROM || '"RTO Tracker" <noreply@dizweb.solutions>',
    to:      toEmail,
    subject: 'Reset Your RTO Tracker Password',
    html,
    text: `Hi ${safeName},\n\nReset your RTO Tracker password using this link (expires in 1 hour):\n${resetLink}\n\nIf you did not request this, ignore this email.\n\n— RTO Tracker`,
  });
}

module.exports = { sendPasswordResetEmail };
