import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { generateWelcomeEmailHtml, generateWelcomeEmailText } from "./src/app/utils/welcomeEmailTemplate.js";
import { sendEmail } from "./src/app/services/emailService.js";

async function main() {
  const targetEmail = process.argv[2];

  if (targetEmail) {
    console.log(`Sending welcome email to specific address: ${targetEmail}`);
    const html = generateWelcomeEmailHtml({ email: targetEmail });
    const text = generateWelcomeEmailText({ email: targetEmail });

    const result = await sendEmail({
      to: targetEmail,
      subject: "⚡ Welcome to AI Resume Tailor — Here's what you get for free (No card required)",
      html,
      text,
    });

    console.log("Send result:", result);
    return;
  }

  // Otherwise, list recent signups from Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: usersData, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("Failed to list users:", error.message);
    process.exit(1);
  }

  const sorted = usersData.users.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  console.log(`Found ${sorted.length} total registered users.`);
  console.log("Most recent signup:", sorted[0]?.email, "created at:", sorted[0]?.created_at);

  const user = sorted[0];
  const recipient = user?.email;
  if (!recipient) {
    console.log("No recipient found.");
    return;
  }

  const name = user.user_metadata?.full_name || user.user_metadata?.name;
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;

  console.log(`Preparing personalized email for ${recipient} (${name || "Candidate"})...`);
  const html = generateWelcomeEmailHtml({
    name,
    email: recipient,
    avatarUrl,
  });
  const text = generateWelcomeEmailText({
    name,
    email: recipient,
  });

  const result = await sendEmail({
    to: recipient,
    subject: `⚡ Welcome to AI Resume Tailor, ${name ? name.split(" ")[0] : "Candidate"} — Here's what you get for free (No card required)`,
    html,
    text,
  });

  console.log("Send result:", result);
}

main().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
