import { createClient } from "@supabase/supabase-js";
import { generateDripEmailContent, type DripStage } from "@/app/utils/dripEmailTemplates";
import { sendEmail } from "./emailService";

export interface DripExecutionSummary {
  totalUsersChecked: number;
  inactiveUsersCount: number;
  dispatches: Array<{
    userId: string;
    email: string;
    stage: DripStage;
    status: "sent" | "skipped" | "failed";
    messageId?: string;
    error?: string;
  }>;
}

const STAGE_INTERVALS_MS: Array<{ stage: DripStage; minAgeMs: number; maxAgeMs: number }> = [
  // 30 days (up to 60 days)
  { stage: "30d", minAgeMs: 30 * 24 * 60 * 60 * 1000, maxAgeMs: 60 * 24 * 60 * 60 * 1000 },
  // 7 days (up to 30 days)
  { stage: "7d", minAgeMs: 7 * 24 * 60 * 60 * 1000, maxAgeMs: 30 * 24 * 60 * 60 * 1000 },
  // 72 hours (up to 7 days)
  { stage: "72h", minAgeMs: 72 * 60 * 60 * 1000, maxAgeMs: 7 * 24 * 60 * 60 * 1000 },
  // 48 hours (up to 72 hours)
  { stage: "48h", minAgeMs: 48 * 60 * 60 * 1000, maxAgeMs: 72 * 60 * 60 * 1000 },
  // 24 hours (up to 48 hours)
  { stage: "24h", minAgeMs: 24 * 60 * 60 * 1000, maxAgeMs: 48 * 60 * 60 * 1000 },
];

export async function processDripSequence(options?: {
  dryRun?: boolean;
  targetEmail?: string;
}): Promise<DripExecutionSummary> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY)");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Fetch Users
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError || !usersData?.users) {
    throw new Error(`Failed to list users: ${usersError?.message || "Unknown error"}`);
  }

  // 2. Fetch all tailored resumes to determine activated users
  const { data: resumes, error: resumesError } = await supabase
    .from("resumes")
    .select("user_id");

  if (resumesError) {
    throw new Error(`Failed to query resumes table: ${resumesError.message}`);
  }

  const activeUserIds = new Set((resumes || []).map((r) => r.user_id).filter(Boolean));

  // 3. Filter for candidates who signed up but have NOT tailored a resume
  let targetUsers = usersData.users.filter((user) => !activeUserIds.has(user.id) && user.email);

  if (options?.targetEmail) {
    targetUsers = targetUsers.filter((u) => u.email?.toLowerCase() === options.targetEmail?.toLowerCase());
  }

  const summary: DripExecutionSummary = {
    totalUsersChecked: usersData.users.length,
    inactiveUsersCount: targetUsers.length,
    dispatches: [],
  };

  const now = Date.now();

  for (const user of targetUsers) {
    const email = user.email!;
    const name = user.user_metadata?.full_name || user.user_metadata?.name || null;
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
    const userMetadata = user.user_metadata || {};
    const sentStages: string[] = Array.isArray(userMetadata.drip_stages_sent)
      ? userMetadata.drip_stages_sent
      : [];

    const createdAt = new Date(user.created_at).getTime();
    const ageMs = now - createdAt;

    // Find the current eligible stage based on account age
    let eligibleStage: DripStage | null = null;
    for (const rule of STAGE_INTERVALS_MS) {
      if (ageMs >= rule.minAgeMs && !sentStages.includes(rule.stage)) {
        eligibleStage = rule.stage;
        break;
      }
    }

    if (!eligibleStage) {
      continue;
    }

    if (options?.dryRun) {
      summary.dispatches.push({
        userId: user.id,
        email,
        stage: eligibleStage,
        status: "skipped",
      });
      continue;
    }

    // Generate product-led content
    const content = generateDripEmailContent({
      stage: eligibleStage,
      name,
      email,
      avatarUrl,
    });

    try {
      const sendResult = await sendEmail({
        to: email,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });

      if (sendResult.success) {
        // Record stage sent in user_metadata
        const updatedStages = [...sentStages, eligibleStage];
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...userMetadata,
            drip_stages_sent: updatedStages,
            last_drip_sent_at: new Date().toISOString(),
          },
        });

        summary.dispatches.push({
          userId: user.id,
          email,
          stage: eligibleStage,
          status: "sent",
          messageId: sendResult.messageId,
        });
      } else {
        summary.dispatches.push({
          userId: user.id,
          email,
          stage: eligibleStage,
          status: "failed",
          error: sendResult.error || "Email provider rejected send",
        });
      }
    } catch (err: any) {
      summary.dispatches.push({
        userId: user.id,
        email,
        stage: eligibleStage,
        status: "failed",
        error: err?.message || "Unexpected exception during send",
      });
    }
  }

  return summary;
}
