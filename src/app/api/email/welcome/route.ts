import { NextRequest, NextResponse } from "next/server";
import { generateWelcomeEmailHtml, generateWelcomeEmailText } from "@/app/utils/welcomeEmailTemplate";
import { sendEmail } from "@/app/services/emailService";
import { requireAuthWithEmail } from "@/app/utils/auth";
import { supabaseAdmin } from "@/app/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, accessToken } = body;

    // Security: require valid authenticated session and ONLY ever email the authenticated user's
    // own verified email address (prevents open email relay / spam abuse).
    const authResult = await requireAuthWithEmail(req, { accessToken });
    if ("error" in authResult) return authResult.error;

    const recipientEmail = authResult.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Authenticated account has no email address" },
        { status: 400 }
      );
    }

    // Idempotency guard: send welcome email at most once per user account
    try {
      const { data: userRecord } = await supabaseAdmin.auth.admin.getUserById(authResult.userId);
      const existingMeta = (userRecord?.user?.user_metadata || {}) as Record<string, unknown>;
      if (existingMeta.welcome_sent_at) {
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: "already_sent",
        });
      }
    } catch {
      // Non-fatal metadata check; continue cautiously
    }

    const safeName = typeof name === "string" ? name.slice(0, 80) : undefined;
    const html = generateWelcomeEmailHtml({ name: safeName, email: recipientEmail });
    const text = generateWelcomeEmailText({ name: safeName, email: recipientEmail });

    const result = await sendEmail({
      to: recipientEmail,
      subject: "⚡ Welcome to AI Resume Tailor — Here's what you get for free (No card required)",
      html,
      text,
    });

    if (!result.success) {
      console.error("[welcome-email] Delivery failed:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: "Welcome email delivery failed",
        },
        { status: 502 }
      );
    }

    // Record welcome_sent_at in user_metadata so repeated calls are no-ops
    try {
      const { data: userRecord } = await supabaseAdmin.auth.admin.getUserById(authResult.userId);
      const existingMeta = (userRecord?.user?.user_metadata || {}) as Record<string, unknown>;
      await supabaseAdmin.auth.admin.updateUserById(authResult.userId, {
        user_metadata: {
          ...existingMeta,
          welcome_sent_at: new Date().toISOString(),
        },
      });
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error("[welcome-email] Error:", err);
    return NextResponse.json(
      { error: "Failed to process welcome email request" },
      { status: 500 }
    );
  }
}
