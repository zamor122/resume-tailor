import nodemailer from "nodemailer";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider?: "mailgun" | "resend" | "smtp" | "mock";
  error?: string;
}

/**
 * Universal Email Delivery Service
 * Supports:
 * 1. Mailgun REST API (when MAILGUN_API_KEY and MAILGUN_DOMAIN are provided)
 * 2. Resend REST API (when RESEND_API_KEY is provided)
 * 3. SMTP via nodemailer (when EMAIL_HOST, EMAIL_PORT, EMAIL_PASSWORD are provided)
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
}: SendEmailOptions): Promise<SendEmailResult> {
  const fromAddress = from || process.env.EMAIL_FROM || "AI Resume Tailor <hello@mail.airesumetailor.com>";
  const mailgunDomain = process.env.MAILGUN_DOMAIN;
  const mailgunApiKey = process.env.MAILGUN_API_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailHost = process.env.EMAIL_HOST;
  const emailPassword = process.env.EMAIL_PASSWORD;

  // 1. Try Resend if configured
  if (resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, messageId: data.id, provider: "resend" };
      }
      console.warn("[EmailService] Resend failed:", data);
    } catch (err: any) {
      console.warn("[EmailService] Resend error:", err?.message || err);
    }
  }

  // 2. Try Mailgun REST API if configured
  if (mailgunDomain && mailgunApiKey) {
    try {
      const formData = new FormData();
      formData.append("from", fromAddress);
      formData.append("to", to);
      formData.append("subject", subject);
      formData.append("html", html);
      if (text) formData.append("text", text);

      const res = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${mailgunApiKey}`).toString("base64")}`,
        },
        body: formData,
      });

      const body = await res.text();
      if (res.ok) {
        let parsedId: string | undefined;
        try {
          parsedId = JSON.parse(body)?.id;
        } catch {}
        return { success: true, messageId: parsedId || "sent", provider: "mailgun" };
      }
      console.warn(`[EmailService] Mailgun status ${res.status}:`, body);
    } catch (err: any) {
      console.warn("[EmailService] Mailgun error:", err?.message || err);
    }
  }

  // 3. Try SMTP via Nodemailer if configured
  if (emailHost && emailPassword) {
    try {
      const transporter = nodemailer.createTransport({
        host: emailHost,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: Number(process.env.EMAIL_PORT) === 465,
        auth: {
          user: process.env.EMAIL_FROM || "internal@airesumetailor.com",
          pass: emailPassword,
        },
      });

      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        text,
      });

      return { success: true, messageId: info.messageId, provider: "smtp" };
    } catch (err: any) {
      console.warn("[EmailService] SMTP error:", err?.message || err);
      return { success: false, error: err?.message || "SMTP sending failed" };
    }
  }

  return {
    success: false,
    error: "No active email transport available. Please configure an active MAILGUN_API_KEY, RESEND_API_KEY, or EMAIL_PASSWORD.",
  };
}
