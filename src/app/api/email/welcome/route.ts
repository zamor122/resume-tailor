import { NextRequest, NextResponse } from "next/server";
import { generateWelcomeEmailHtml, generateWelcomeEmailText } from "@/app/utils/welcomeEmailTemplate";
import { sendEmail } from "@/app/services/emailService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { to, name } = body;

    if (!to || typeof to !== "string" || !to.includes("@")) {
      return NextResponse.json(
        { error: "A valid 'to' email address is required" },
        { status: 400 }
      );
    }

    const html = generateWelcomeEmailHtml({ name, email: to });
    const text = generateWelcomeEmailText({ name, email: to });

    const result = await sendEmail({
      to,
      subject: "⚡ Welcome to AI Resume Tailor — Here's what you get for free (No card required)",
      html,
      text,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          note: "Email template generated successfully, but delivery provider was not configured or rejected authentication.",
          previewHtml: html,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      provider: result.provider,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process welcome email request" },
      { status: 500 }
    );
  }
}
