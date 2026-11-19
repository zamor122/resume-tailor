import { extractFirstName, getInitials } from "./welcomeEmailTemplate";

export type DripStage = "24h" | "48h" | "72h" | "7d" | "30d";

export interface DripEmailOptions {
  stage: DripStage;
  name?: string | null;
  email: string;
  avatarUrl?: string | null;
  siteUrl?: string;
}

export interface DripEmailContent {
  stage: DripStage;
  subject: string;
  html: string;
  text: string;
}

interface StageMetadata {
  badge: string;
  subject: (firstName: string) => string;
  headline: string;
  hook: string;
  featureTitle: string;
  featureBody: string;
  featureStat: string;
  ctaText: string;
  footnote: string;
}

const STAGE_CONFIGS: Record<DripStage, StageMetadata> = {
  "24h": {
    badge: "STAGE 01 • SPEED & ATS ENGINE",
    subject: (name) => `⚡ ${name}, your resume is 45 seconds away from an 85%+ ATS score`,
    headline: "Stop Guessing What Recruiters Want.",
    hook: "Most job seekers spend 2+ hours manually rewriting their resume for every job posting—only to get filtered out by the applicant tracking system.",
    featureTitle: "Instant ATS Match & Keyword Gap Scanner",
    featureBody: "Our automated ATS simulator scans your resume against any live job description in under 45 seconds. It highlights the exact missing hard skills, software keywords, and phrasing hiring managers filter for.",
    featureStat: "⏱️ Takes 45 seconds • 100% Free • Zero credit card required",
    ctaText: "⚡ RUN YOUR FREE ATS SCAN NOW →",
    footnote: "Your free starter account includes 3 full ATS audits. No card needed.",
  },
  "48h": {
    badge: "STAGE 02 • THE CHANGE STUDIO",
    subject: (name) => `⚡ ${name}, see the Change Studio in action (Line-by-line diffs)`,
    headline: "ChatGPT Hallucinates. Our Change Studio Doesn't.",
    hook: "Generic AI chatbots invent fake experience and robotic corporate jargon. We built AI Resume Tailor with strict zero-hallucination guardrails and line-by-line transparency.",
    featureTitle: "Side-by-Side Diff Cards & Recruiter Rationale",
    featureBody: "Every single edit is presented as an interactive diff with clear recruiter rationale explaining WHY the ATS algorithm and hiring manager look for that specific phrasing. You accept or reject each change with one click.",
    featureStat: "🛡️ Zero hallucinated facts • Full line-by-line control • Instant preview",
    ctaText: "⚡ INSPECT YOUR TAILORED DIFFS FREE →",
    footnote: "You maintain 100% control over every word. Test it free today.",
  },
  "72h": {
    badge: "STAGE 03 • FREE UNLOCKED ASSET",
    subject: (name) => `⚡ ${name}, your free unlocked bullet is waiting in Mission Control`,
    headline: "A Real Google X-Y-Z Bullet You Can Use Today.",
    hook: "We don't lock your entire resume behind a sneaky paywall. Your free account comes with a fully unlocked, high-impact bullet optimization ready to copy right into your active job search.",
    featureTitle: "Google X-Y-Z Metric-Driven Transformation",
    featureBody: "Watch your weakest generic bullet transform into a high-converting formula: Accomplished [X], measured by [Y], by doing [Z]. Copy it directly into your live resume and notice the instant lift in callback rates.",
    featureStat: "🎁 1 Full High-Impact Bullet Unlocked • 100% Free • Copy & Paste Ready",
    ctaText: "⚡ CLAIM YOUR FREE OPTIMIZED BULLET →",
    footnote: "No trial auto-billing. Your unlocked bullet is yours permanently.",
  },
  "7d": {
    badge: "STAGE 04 • THE VOLUME MULTIPLIER",
    subject: (name) => `⚡ Applying to jobs this week, ${name}? Tailor each one in 45s`,
    headline: "Sending One Generic Resume Gets a 2% Callback Rate.",
    hook: "Top candidates don't submit one static PDF to 30 companies. They tailor their resume for each target job. With AI Resume Tailor, that takes 45 seconds instead of 4 hours.",
    featureTitle: "Batch Customization at Machine Speed",
    featureBody: "Paste your next target job spec and generate a targeted version tuned specifically for that company's stack, tone, and requirements. Applying with a 85%+ matched resume puts you in the top 5% of applicants.",
    featureStat: "🚀 10x faster applications • Tailored for each posting • Proven callback lift",
    ctaText: "⚡ TAILOR FOR YOUR NEXT APPLICATION FREE →",
    footnote: "Your free account is still loaded with complimentary scans. Put them to work.",
  },
  "30d": {
    badge: "STAGE 05 • CONTINUOUS ADVANTAGE",
    subject: (name) => `⚡ New roles just dropped, ${name} — run a free ATS check before you apply`,
    headline: "Fresh Job Openings Just Posted. Are You Ready?",
    hook: "High-paying roles receive 300+ applications within 48 hours of posting. The candidates landing screening calls are submitting ATS-aligned resumes before the hiring manager closes the intake.",
    featureTitle: "On-Demand Recruiter Match Diagnostic",
    featureBody: "Before you hit 'Easy Apply', run our automated diagnostic. Verify your resume isn't missing critical keywords or structural ATS tags that get candidates auto-rejected in round one.",
    featureStat: "📊 0–100% Compatibility Score • Instant Keyword Check • Completely Free",
    ctaText: "⚡ SCAN YOUR RESUME FREE BEFORE APPLYING →",
    footnote: "No subscription trap. Always free to scan, score, and diagnose.",
  },
};

export function generateDripEmailContent(options: DripEmailOptions): DripEmailContent {
  const { stage, name, email, avatarUrl, siteUrl = "https://airesumetailor.com" } = options;
  const config = STAGE_CONFIGS[stage];
  if (!config) {
    throw new Error(`Invalid drip stage: ${stage}`);
  }

  const firstName = extractFirstName(name || undefined, email);
  const initials = getInitials(name || undefined, email);
  const subject = config.subject(firstName);

  const avatarSnippet = avatarUrl
    ? `<img src="${avatarUrl}" alt="${firstName}" width="42" height="42" style="border-radius: 8px; border: 2px solid #1C2028; display: block;" />`
    : `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="42" height="42" style="background-color: #1C2028; border-radius: 8px; text-align: center;"><tr><td align="center" valign="middle" style="color: #FAF7F0; font-family: 'Courier New', Courier, monospace; font-size: 15px; font-weight: 800;">${initials}</td></tr></table>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${subject}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #FAF7F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .neo-btn:hover { background-color: #F4511E !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F0;">

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F0;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; width: 100%;">
          
          <!-- BRAND & CONSOLE HEADER -->
          <tr>
            <td style="padding-bottom: 16px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1C2028; border: 2px solid #1C2028; border-radius: 12px; box-shadow: 4px 4px 0px #1C2028;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left">
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 10px; font-weight: 700; color: #FF5722; text-transform: uppercase; letter-spacing: 1.5px;">⚡ MISSION CONTROL</span>
                          <h1 style="margin: 4px 0 0 0; font-family: 'Courier New', Courier, monospace; font-size: 18px; font-weight: 900; color: #FAF7F0; letter-spacing: -0.5px;">
                            AI RESUME TAILOR
                          </h1>
                        </td>
                        <td align="right">
                          <span style="display: inline-block; background-color: #10B981; color: #1C2028; font-family: 'Courier New', Courier, monospace; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 999px; border: 1.5px solid #FAF7F0; text-transform: uppercase;">
                            FREE PASS UNLOCKED
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN HERO CARD -->
          <tr>
            <td>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFFFF; border: 2px solid #1C2028; border-radius: 12px; box-shadow: 5px 5px 0px #1C2028; overflow: hidden;">
                
                <!-- Stage Top Banner -->
                <tr>
                  <td style="background-color: #F4F1EA; border-bottom: 2px solid #1C2028; padding: 10px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: 800; color: #1C2028; text-transform: uppercase;">
                          ${config.badge}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CANDIDATE HUD CARD -->
                <tr>
                  <td style="padding: 20px 24px 0 24px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F0; border: 2px solid #1C2028; border-radius: 10px; box-shadow: 3px 3px 0px #1C2028;">
                      <tr>
                        <td style="padding: 12px 16px;">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td width="48" valign="top">
                                ${avatarSnippet}
                              </td>
                              <td style="padding-left: 12px;">
                                <div style="font-family: 'Courier New', Courier, monospace; font-size: 13px; font-weight: 800; color: #1C2028;">
                                  ${name || firstName}
                                </div>
                                <div style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #4B5563; margin-top: 1px;">
                                  ${email}
                                </div>
                                <div style="margin-top: 4px;">
                                  <span style="display: inline-block; background-color: #1C2028; color: #FAF7F0; font-family: 'Courier New', Courier, monospace; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
                                    FREE STARTER
                                  </span>
                                  <span style="display: inline-block; background-color: #ECFDF5; color: #065F46; font-family: 'Courier New', Courier, monospace; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; border: 1px solid #10B981; margin-left: 4px; text-transform: uppercase;">
                                    NO CARD NEEDED
                                  </span>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td style="padding: 22px 24px 20px 24px;">
                    <h2 style="margin: 0 0 10px 0; font-family: 'Courier New', Courier, monospace; font-size: 20px; font-weight: 900; color: #1C2028;">
                      ${config.headline}
                    </h2>
                    
                    <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 22px; color: #374151;">
                      Hey ${firstName},
                    </p>

                    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #374151;">
                      ${config.hook}
                    </p>

                    <!-- PRODUCT SPOTLIGHT BOX -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F0; border: 2px solid #1C2028; border-radius: 8px; box-shadow: 3px 3px 0px #1C2028; margin: 18px 0;">
                      <tr>
                        <td style="padding: 16px 18px;">
                          <div style="font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: 800; color: #FF5722; text-transform: uppercase; margin-bottom: 4px;">
                            ⚡ PRODUCT SUPERPOWER
                          </div>
                          <strong style="font-family: 'Courier New', Courier, monospace; font-size: 15px; color: #1C2028; display: block; margin-bottom: 6px;">
                            ${config.featureTitle}
                          </strong>
                          <p style="margin: 0 0 10px 0; font-size: 13px; line-height: 20px; color: #4B5563;">
                            ${config.featureBody}
                          </p>
                          <div style="font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: 700; color: #065F46; background-color: #ECFDF5; padding: 6px 10px; border-radius: 4px; border: 1px solid #10B981;">
                            ${config.featureStat}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA BUTTON -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 16px 0;">
                      <tr>
                        <td align="center">
                          <a href="${siteUrl}" target="_blank" class="neo-btn" style="display: inline-block; background-color: #FF5722; color: #FFFFFF; font-family: 'Courier New', Courier, monospace; font-size: 14px; font-weight: 800; text-decoration: none; padding: 15px 28px; border: 2px solid #1C2028; border-radius: 8px; box-shadow: 3px 3px 0px #1C2028; text-transform: uppercase; letter-spacing: 0.5px;">
                            ${config.ctaText}
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 8px;">
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #6B7280;">
                            ${config.footnote}
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- Personal Founder Note -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 2px solid #1C2028; padding-top: 16px; margin-top: 20px;">
                      <tr>
                        <td style="font-size: 13px; line-height: 20px; color: #374151;">
                          Have questions or want me to take a quick look at your target job description, ${firstName}? Reply directly to this email anytime.<br><br>
                          <strong style="color: #1C2028;">Shayne Zamora</strong><br>
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #6B7280;">Founder • AI Resume Tailor</span>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 24px 16px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: 700; color: #1C2028; text-transform: uppercase;">
                AI RESUME TAILOR • MISSION CONTROL
              </p>
              <p style="margin: 0 0 8px 0; font-size: 11px; line-height: 16px; color: #6B7280;">
                You received this email because you signed up at <a href="${siteUrl}" style="color: #FF5722; text-decoration: none; font-weight: 700;">airesumetailor.com</a> with <span style="font-family: monospace;">${email}</span>.
              </p>
              <p style="margin: 0; font-size: 10px; color: #9CA3AF;">
                &copy; 2026 AI Resume Tailor. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

  const text = `⚡ MISSION CONTROL • AI RESUME TAILOR
${config.badge}

CANDIDATE: ${name || firstName} (${email})
TIER:      FREE STARTER • NO CARD NEEDED

Hey ${firstName},

${config.headline}

${config.hook}

----------------------------------------------------------------------
⚡ PRODUCT SUPERPOWER: ${config.featureTitle}
----------------------------------------------------------------------
${config.featureBody}

${config.featureStat}

${config.ctaText}
${siteUrl}

(${config.footnote})

----------------------------------------------------------------------
Have questions or want me to take a quick look at your target job description, ${firstName}? Reply directly to this email anytime.

Shayne Zamora
Founder • AI Resume Tailor
${siteUrl}
`;

  return {
    stage,
    subject,
    html,
    text,
  };
}
