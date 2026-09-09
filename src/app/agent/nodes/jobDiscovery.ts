import type { AgentState, DiscoveredJob } from "../state";

export async function jobDiscoveryNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  if (state.rawJobDescription && state.rawJobDescription.trim().length > 30) {
    return {
      selectedJobDescription: state.rawJobDescription.trim(),
      logs: ["[jobDiscovery] User-provided job description used"],
    };
  }

  const profile = state.candidateProfile;
  const searchQuery = profile?.searchQuery || `${profile?.primaryTitle || "Software Engineer"} remote`;
  const apiKey = process.env.GOOGLE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  let jobs: DiscoveredJob[] = [];

  // 1. Try Google Custom Search if configured
  if (apiKey && cseId) {
    try {
      const q = encodeURIComponent(`${searchQuery} (job OR opening OR careers)`);
      const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${q}&num=5`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        jobs = (data.items || []).map((item: any) => ({
          title: item.title,
          company: item.displayLink || "Company",
          location: "See posting",
          url: item.link,
          snippet: item.snippet || "",
        }));
      }
    } catch (e) {
      console.warn("[jobDiscovery] Google CSE search failed:", e);
    }
  }

  // 2. Fallback to open remote job feed if no results yet
  if (jobs.length === 0) {
    try {
      const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(profile?.primaryTitle || "software")}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        jobs = (data.jobs || []).slice(0, 5).map((job: any) => ({
          title: job.title,
          company: job.company_name,
          location: job.candidate_required_location || "Remote",
          url: job.url,
          snippet: (job.description || "").replace(/<[^>]*>?/gm, "").slice(0, 500),
        }));
      }
    } catch (e) {
      console.warn("[jobDiscovery] Open job API fallback failed:", e);
    }
  }

  const primaryJob = jobs[0];
  const selectedJobDescription = primaryJob ? `${primaryJob.title} at ${primaryJob.company}\n\n${primaryJob.snippet}` : "Target Role Alignment";

  return {
    discoveredJobs: jobs,
    selectedJobDescription,
    jobTitle: primaryJob?.title || state.jobTitle || profile?.primaryTitle,
    logs: [
      `[jobDiscovery] Found ${jobs.length} matching live job openings`,
    ],
  };
}
