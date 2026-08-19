import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  sendEvaluationEmail,
  sendOtpEmail,
  sendPracticeReminderEmail,
  sendResetPasswordLinkEmail,
  sendWeeklyReportEmail,
  sendSupportTicketEmail,
} from "./email";

const { sendMailMock } = vi.hoisted(() => ({

  sendMailMock: vi.fn<(...args: any[]) => Promise<void>>(() => Promise.resolve()),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: sendMailMock,
    })),
  },
}));

describe("email templates", () => {
  beforeEach(() => {
    sendMailMock.mockClear();
  });

  it("escapes evaluation content before interpolating it into HTML", async () => {
    await sendEvaluationEmail({
      to: "user@example.com",
      role: `<img src=x onerror=alert(1)>`,
      score: 88,
      feedback: `Great <script>alert("x")</script>`,
      strengths: [`Owns <b>delivery</b>`],
      improvements: [`Use "clearer" & safer examples`],
    });

    const html = sendMailMock.mock.calls[0]?.[0]?.html as string;

    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("Great &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("Owns &lt;b&gt;delivery&lt;/b&gt;");
    expect(html).toContain("Use &quot;clearer&quot; &amp; safer examples");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("logo.png");
  });

  it("escapes user-facing names and roles in notification emails", async () => {
    await sendWeeklyReportEmail({
      to: "user@example.com",
      name: `<Admin>`,
      sessionsCount: 2,
      avgScore: 91,
      bestRole: `Backend & "API"`,
      bestScore: 95,
    });
    await sendPracticeReminderEmail({
      to: "user@example.com",
      name: `<Admin>`,
      daysSinceLast: 4,
    });

    const weeklyHtml = sendMailMock.mock.calls[0]?.[0]?.html as string;
    const reminderHtml = sendMailMock.mock.calls[1]?.[0]?.html as string;

    expect(weeklyHtml).toContain("Hey &lt;Admin&gt;");
    expect(weeklyHtml).toContain("<strong>Backend &amp; &quot;API&quot;</strong>");
    expect(weeklyHtml).toContain("logo.png");
    expect(reminderHtml).toContain("Hey &lt;Admin&gt;");
    expect(reminderHtml).toContain("logo.png");
  });

  it("renders the actual logo in OTP, reset password, and support emails without raw SI placeholder text", async () => {
    await sendOtpEmail("user@example.com", "123456");
    await sendResetPasswordLinkEmail("user@example.com", "https://snapinterview.app/reset-password?token=abc");
    await sendSupportTicketEmail({
      ticketId: "SUP-123456",
      userEmail: "user@example.com",
      userName: "Alex Doe",
      category: "technical",
      priority: "normal",
      subject: "Microphone issue",
      description: "Audio is not detected",
    });

    const otpHtml = sendMailMock.mock.calls[0]?.[0]?.html as string;
    const resetHtml = sendMailMock.mock.calls[1]?.[0]?.html as string;
    const userConfirmationHtml = sendMailMock.mock.calls[3]?.[0]?.html as string; // User confirmation

    expect(otpHtml).toContain("logo.png");
    expect(resetHtml).toContain("logo.png");
    expect(userConfirmationHtml).toContain("logo.png");
    expect(userConfirmationHtml).toContain("SnapInterview Support");
  });

  it("uses the public app URL and identifies automated notification emails", async () => {
    await sendWeeklyReportEmail({
      to: "user@example.com",
      name: "User",
      sessionsCount: 1,
      avgScore: 70,
      bestRole: "Frontend Engineer",
      bestScore: 70,
    });

    const message = sendMailMock.mock.calls[0]?.[0];
    const html = message?.html as string;

    expect(message?.subject).toBe("Your SnapInterview weekly progress report");
    expect(html).toContain("https://snapinterview.app/analytics");
    expect(html).not.toContain("localhost");
    expect(html).toContain("This is an automated email. Please do not reply.");
  });

  it("does not use an IPv6 loopback app URL in notification links", async () => {
    expect(publicAppUrl("http://[::1]:3000")).toBe("https://snapinterview.app");
    expect(publicAppUrl("http://localhost.:3000")).toBe("https://snapinterview.app");
  });
});
