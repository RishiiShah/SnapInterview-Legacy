import nodemailer from "nodemailer";
import { isIP } from "node:net";
import { env } from "@/lib/env";

const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST || "smtp.gmail.com",
    port: Number(env.SMTP_PORT) || 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
    },
});

function escapeHtml(value: string | number) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeSubject(value: string) {
    return value.replace(/[\r\n]+/g, " ").trim();
}

function notificationFrom() {
    const configured = env.SMTP_FROM || env.SMTP_USER || "noreply@snapinterview.app";
    const address = configured.match(/<([^>]+)>/)?.[1] ?? configured;
    return `SnapInterview Notifications <${address}>`;
}

function isLocalHost(hostname: string) {
    const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
    if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;

    const ipVersion = isIP(normalized);
    return (
        (ipVersion === 4 && normalized.startsWith("127.")) ||
        (ipVersion === 6 && (normalized === "::1" || normalized.startsWith("::ffff:127.")))
    );
}

export function publicAppUrl(candidate = env.NEXT_PUBLIC_APP_URL ?? env.APP_URL) {
    if (candidate) {
        try {
            const url = new URL(candidate);
            if (!isLocalHost(url.hostname)) {
                return url.origin;
            }
        } catch {
            // Use the public default below.
        }
    }
    return "https://snapinterview.app";
}

function publicLink(value: string) {
    try {
        const url = new URL(value);
        if (isLocalHost(url.hostname)) {
            return `${publicAppUrl()}${url.pathname}${url.search}${url.hash}`;
        }
        return url.toString();
    } catch {
        return `${publicAppUrl()}${value.startsWith('/') ? value : `/${value}`}`;
    }
}

const automatedEmailFooter = '<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">This is an automated email. Please do not reply.</p>';

/**
 * Send a 6-digit OTP verification email.
 */
export async function sendOtpEmail(to: string, otp: string): Promise<void> {
    const from = notificationFrom();

    await transporter.sendMail({
        from,
        to,
        subject: "Verify your SnapInterview email",
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
              ${automatedEmailFooter}
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

export async function sendResetPasswordLinkEmail(to: string, resetUrl: string): Promise<void> {
    const from = notificationFrom();
    const safeResetUrl = publicLink(resetUrl);

    await transporter.sendMail({
        from,
        to,
        subject: "Reset your SnapInterview password",
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
          <tr>
            <td style="padding:32px 32px 12px;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#18181b;">Reset your password</h1>
              <p style="margin:10px 0 0;font-size:14px;line-height:1.6;color:#71717a;">Click the button below to reset your password. If you did not request this, you can ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:12px 32px 24px;">
              <a href="${safeResetUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:10px;">Reset password</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#a1a1aa;word-break:break-all;">If the button does not work, copy this link into your browser:<br/>${safeResetUrl}</p>
              ${automatedEmailFooter}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim(),
    });
}

export async function sendEvaluationEmail(params: {
    to: string;
    role: string;
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
}): Promise<void> {
    const from = notificationFrom();
    const { to, role, score, feedback, strengths, improvements } = params;

    const scoreColor = score >= 80 ? "#10b981" : score >= 65 ? "#3b82f6" : "#f59e0b";
    const scoreLabel = score >= 80 ? "Strong performance" : score >= 65 ? "Steady performance" : "Room to improve";

    const safeRole = escapeHtml(role);
    const safeFeedback = escapeHtml(feedback);
    const safeStrengths = strengths.map(escapeHtml);
    const safeImprovements = improvements.map(escapeHtml);
    const listItems = (items: string[]) =>
        items.map(item => `<li style="margin:6px 0;font-size:13px;color:#3f3f46;">${item}</li>`).join("");

    const appUrl = publicAppUrl();

    await transporter.sendMail({
        from,
        to,
        subject: `Your ${escapeSubject(role)} interview evaluation is ready`,
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
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
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
          <tr>
            <td style="padding:28px 32px 8px;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#18181b;">Your evaluation is ready</h1>
              <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#71717a;">Here are the results from your ${safeRole} interview.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:16px 32px;">
              <div style="display:inline-block;border-radius:16px;border:2px solid ${scoreColor};padding:20px 40px;text-align:center;">
                <div style="font-size:48px;font-weight:800;color:${scoreColor};line-height:1;">${score}</div>
                <div style="font-size:12px;font-weight:600;color:${scoreColor};margin-top:4px;letter-spacing:0.5px;text-transform:uppercase;">${scoreLabel}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 20px;">
              <p style="margin:0;font-size:13px;line-height:1.7;color:#52525b;">${safeFeedback}</p>
            </td>
          </tr>
          ${safeStrengths.length > 0 ? `
          <tr>
            <td style="padding:0 32px 16px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.5px;">Strengths</p>
              <ul style="margin:0;padding-left:18px;">${listItems(safeStrengths)}</ul>
            </td>
          </tr>` : ""}
          ${safeImprovements.length > 0 ? `
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:0.5px;">Areas to Improve</p>
              <ul style="margin:0;padding-left:18px;">${listItems(safeImprovements)}</ul>
            </td>
          </tr>` : ""}
          <tr>
            <td align="center" style="padding:0 32px 32px;">
              <a href="${appUrl}/recordings" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;">View Full Results</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;border-top:1px solid #f4f4f5;">
              <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">Keep practicing to improve your score over time.</p>
              ${automatedEmailFooter}
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

export async function sendWeeklyReportEmail(params: {
    to: string;
    name: string;
    sessionsCount: number;
    avgScore: number | null;
    bestRole: string | null;
    bestScore: number | null;
}): Promise<void> {
    const from = notificationFrom();
    const { to, name, sessionsCount, avgScore, bestRole, bestScore } = params;
    const appUrl = publicAppUrl();
    const avgDisplay = avgScore !== null ? Math.round(avgScore).toString() : "Not available";
    const headline = sessionsCount === 1 ? "1 mock interview this week" : `${sessionsCount} mock interviews this week`;
    const safeName = escapeHtml(name);
    const safeBestRole = bestRole ? escapeHtml(bestRole) : null;

    await transporter.sendMail({
        from,
        to,
        subject: "Your SnapInterview weekly progress report",
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <tr><td style="padding:32px 32px 0;"><table cellpadding="0" cellspacing="0"><tr>
        <td style="width:32px;height:32px;background:#18181b;border-radius:8px;text-align:center;vertical-align:middle;color:#fff;font-size:11px;font-weight:700;letter-spacing:-0.5px;">SI</td>
        <td style="padding-left:10px;font-size:18px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">SnapInterview</td>
      </tr></table></td></tr>
      <tr><td style="padding:28px 32px 8px;">
        <h1 style="margin:0;font-size:20px;font-weight:700;color:#18181b;">Hey ${safeName}, here&apos;s your week</h1>
        <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#71717a;">${headline}</p>
      </td></tr>
      <tr><td style="padding:16px 32px 8px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="background:#fafafa;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#18181b;">${sessionsCount}</div>
          <div style="font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Sessions</div>
        </td>
        <td style="width:8px;"></td>
        <td style="background:#fafafa;border-radius:12px;padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#18181b;">${avgDisplay}</div>
          <div style="font-size:11px;color:#a1a1aa;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Avg score</div>
        </td>
      </tr></table></td></tr>
      ${safeBestRole && bestScore !== null ? `<tr><td style="padding:8px 32px 16px;"><p style="margin:0;font-size:13px;line-height:1.7;color:#52525b;">Top performance: <strong>${safeBestRole}</strong> at <strong>${bestScore}/100</strong>.</p></td></tr>` : ""}
      <tr><td align="center" style="padding:8px 32px 32px;">
        <a href="${appUrl}/analytics" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;">View analytics</a>
      </td></tr>
      <tr><td style="padding:0 32px 32px;border-top:1px solid #f4f4f5;">
        <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">You&apos;re receiving this because weekly reports are enabled. <a href="${appUrl}/settings" style="color:#a1a1aa;">Manage notifications</a>.</p>
        ${automatedEmailFooter}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>
        `.trim(),
    });
}

export async function sendPracticeReminderEmail(params: {
    to: string;
    name: string;
    daysSinceLast: number;
}): Promise<void> {
    const from = notificationFrom();
    const { to, name, daysSinceLast } = params;
    const appUrl = publicAppUrl();
    const safeName = escapeHtml(name);

    await transporter.sendMail({
        from,
        to,
        subject: "Ready for another practice session?",
        html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <tr><td style="padding:32px 32px 0;"><table cellpadding="0" cellspacing="0"><tr>
        <td style="width:32px;height:32px;background:#18181b;border-radius:8px;text-align:center;vertical-align:middle;color:#fff;font-size:11px;font-weight:700;letter-spacing:-0.5px;">SI</td>
        <td style="padding-left:10px;font-size:18px;font-weight:600;color:#18181b;letter-spacing:-0.3px;">SnapInterview</td>
      </tr></table></td></tr>
      <tr><td style="padding:28px 32px 8px;">
        <h1 style="margin:0;font-size:20px;font-weight:700;color:#18181b;">Hey ${safeName}, ready for round two?</h1>
        <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#52525b;">It&apos;s been ${daysSinceLast} days since your last mock interview. A short 10-minute session keeps your reps sharp.</p>
      </td></tr>
      <tr><td align="center" style="padding:24px 32px 32px;">
        <a href="${appUrl}/practice" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;">Start a practice session</a>
      </td></tr>
      <tr><td style="padding:0 32px 32px;border-top:1px solid #f4f4f5;">
        <p style="margin:16px 0 0;font-size:12px;color:#a1a1aa;">You&apos;re receiving this because practice reminders are enabled. <a href="${appUrl}/settings" style="color:#a1a1aa;">Manage notifications</a>.</p>
        ${automatedEmailFooter}
      </td></tr>
    </table>
  </td></tr></table>
</body></html>
        `.trim(),
    });
}
