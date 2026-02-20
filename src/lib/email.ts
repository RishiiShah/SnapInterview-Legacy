import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Send a 6-digit OTP verification email.
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@snapinterview.com";

    await transporter.sendMail({
        from,
        to,
        subject: "SnapInterview — Verify your email",
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:32px;height:32px;background:#18181b;border-radius:8px;text-align:center;vertical-align:middle;color:#fff;font-size:11px;font-weight:700;letter-spacing:-0.5px;">SI</td>
                  <td style="padding-left:10px;font-size:18px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">SnapInterview</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px 12px;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#18181b;">Verify your email</h1>
              <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#71717a;">Enter the code below to complete your sign-up. This code expires in <strong>5 minutes</strong>.</p>
            </td>
          </tr>
          <!-- OTP Code -->
          <tr>
            <td align="center" style="padding:12px 32px 24px;">
              <div style="display:inline-block;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;padding:16px 32px;font-size:32px;font-weight:700;letter-spacing:8px;color:#18181b;font-family:'Courier New',monospace;">
                ${otp}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:#a1a1aa;">If you didn't create a SnapInterview account, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;">&copy; ${new Date().getFullYear()} SnapInterview</p>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim(),
    });
}
