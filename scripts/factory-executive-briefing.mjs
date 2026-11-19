import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

async function generateExecutiveBriefing() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("===============================================================");
  console.log("⚡ AI RESUME TAILOR • SOFTWARE FACTORY EXECUTIVE BRIEFING");
  console.log("Timestamp:", new Date().toISOString());
  console.log("===============================================================\n");

  // 1. Fetch Users
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.error("Failed to query users:", usersError.message);
    process.exit(1);
  }

  const totalUsers = usersData.users.length;
  const now = Date.now();
  const past24hUsers = usersData.users.filter(
    (u) => now - new Date(u.created_at).getTime() < 24 * 60 * 60 * 1000
  );
  const past7dUsers = usersData.users.filter(
    (u) => now - new Date(u.created_at).getTime() < 7 * 24 * 60 * 60 * 1000
  );

  // 2. Fetch Resumes
  const { data: resumes, error: resumesError } = await supabase
    .from("resumes")
    .select("id, user_id, created_at, job_title, company_name");

  const totalResumes = resumes ? resumes.length : 0;

  // 3. Fetch Access Grants (Paid Tiers)
  const { data: grants, error: grantsError } = await supabase
    .from("access_grants")
    .select("id, tier_purchased, is_active, created_at");

  const totalGrants = grants ? grants.length : 0;
  const activeGrants = grants ? grants.filter((g) => g.is_active).length : 0;

  // 4. Calculate Activation Rate
  const userIdsWithResumes = new Set(resumes?.map((r) => r.user_id).filter(Boolean));
  const activatedUsers = usersData.users.filter((u) => userIdsWithResumes.has(u.id)).length;
  const activationRate = totalUsers > 0 ? ((activatedUsers / totalUsers) * 100).toFixed(1) : 0;

  // 5. Recent Signups
  const sortedUsers = [...usersData.users].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latestUser = sortedUsers[0];

  console.log("📊 CORE COMPANY KPIS:");
  console.log(`- Total Registered Candidates: ${totalUsers}`);
  console.log(`- New Signups (Last 24 Hours): ${past24hUsers.length}`);
  console.log(`- New Signups (Last 7 Days):   ${past7dUsers.length}`);
  console.log(`- Total Resumes Tailored:      ${totalResumes}`);
  console.log(`- Candidate Activation Rate:   ${activationRate}% (${activatedUsers}/${totalUsers} tailored a resume)`);
  console.log(`- Total Access Grants (Paid):  ${totalGrants} (${activeGrants} currently active)`);

  console.log("\n👤 LATEST RECIPIENT PROFILE:");
  if (latestUser) {
    const name = latestUser.user_metadata?.full_name || latestUser.user_metadata?.name || "Candidate";
    const hasResume = userIdsWithResumes.has(latestUser.id);
    console.log(`- Name:     ${name}`);
    console.log(`- Email:    ${latestUser.email}`);
    console.log(`- Joined:   ${latestUser.created_at}`);
    console.log(`- Status:   ${hasResume ? "✅ Activated (Tailored Resume Created)" : "⚠️ Inactive (Has Not Tailored Yet)"}`);
  }

  console.log("\n🎯 FACTORY TEAM ACTION DIRECTIVES:");
  console.log("1. [CEO]: Prioritize converting the remaining 50%+ unactivated signups into tailored resumes.");
  console.log("2. [CMO / Growth]: Deploy the 5-part product-led email drip sequence (24h/48h/72h/7d/30d).");
  console.log("3. [Customer Success]: Target new signups with zero tailored resumes for automated low-friction onboarding.");
  console.log("4. [Engineering & QA]: Maintain 100% test coverage, $0 infrastructure spend, and zero-hallucination outputs.");
  console.log("\n===============================================================");
}

generateExecutiveBriefing().catch((err) => {
  console.error("Executive Briefing Error:", err);
  process.exit(1);
});
