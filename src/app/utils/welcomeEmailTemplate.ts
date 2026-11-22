/**
 * Soft Neo-Brutalist Highly-Personalized Welcome Email Template
 * 
 * Styled with the warm retro-futuristic palette:
 * - Canvas: #FAF7F0
 * - Ink / Border: #1C2028
 * - Accent: #FF5722 (Retro Orange)
 * - Success: #10B981 (Mint Emerald)
 * - Muted: #F4F1EA
 * 
 * Table-based HTML for 100% compatibility across Outlook, Gmail, Apple Mail, and mobile clients.
 */

export interface WelcomeEmailParams {
  name?: string;
  email: string;
  avatarUrl?: string;
  accountTier?: string;
  appUrl?: string;
  targetRole?: string;
}

export function extractFirstName(name?: string, email?: string): string {
  if (name && name.trim().length > 0) {
    const first = name.trim().split(/\s+/)[0];
    if (first && first.length > 0) {
      return first.charAt(0).toUpperCase() + first.slice(1);
    }
  }
  if (email && email.includes("@")) {
    const username = email.split("@")[0].split(/[._-]/)[0];
    if (username && username.length > 0) {
      return username.charAt(0).toUpperCase() + username.slice(1);
    }
  }
  return "Candidate";
}

export function getInitials(name?: string, email?: string): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "RT";
}

export function generateWelcomeEmailHtml({
  name,
  email,
  avatarUrl,
  accountTier = "Free Starter",
  appUrl = "https://airesumetailor.com",
  targetRole,
}: WelcomeEmailParams): string {
  const firstName = extractFirstName(name, email);
  const fullName = name?.trim() || firstName;
  const initials = getInitials(name, email);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Welcome to AI Resume Tailor, ${firstName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #FAF7F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .neo-btn:hover { background-color: #F4511E !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F0;">

  <!-- Outer wrapper table -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FAF7F0;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        
        <!-- Main Container (600px max) -->
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
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: 700; color: #FF5722; text-transform: uppercase; letter-spacing: 1.5px;">⚡ MISSION CONTROL</span>
                          <h1 style="margin: 4px 0 0 0; font-family: 'Courier New', Courier, monospace; font-size: 20px; font-weight: 900; color: #FAF7F0; letter-spacing: -0.5px;">
                            AI RESUME TAILOR
                          </h1>
                        </td>
                        <td align="right">
                          <span style="display: inline-block; background-color: #10B981; color: #1C2028; font-family: 'Courier New', Courier, monospace; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 999px; border: 1.5px solid #FAF7F0; text-transform: uppercase;">
                            ACCOUNT ACTIVE
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
                
                <!-- Zero Card Banner Strip -->
                <tr>
                  <td style="background-color: #ECFDF5; border-bottom: 2px solid #1C2028; padding: 10px 20px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-family: 'Courier New', Courier, monospace; font-size: 11px; font-weight: 800; color: #065F46; text-transform: uppercase;">
                          ✓ 100% FREE ACCESS • NO CREDIT CARD REQUIRED
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- PERSONALIZED CANDIDATE HUD CARD -->
                <tr>
                  <td style="padding: 20px 24px 0 24px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F1EA; border: 2px solid #1C2028; border-radius: 10px; box-shadow: 3px 3px 0px #1C2028;">
                      <tr>
                        <td style="padding: 14px 16px;">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td width="48" valign="top">
                                ${
                                  avatarUrl
                                    ? `<img src="${avatarUrl}" alt="${fullName}" width="42" height="42" style="border-radius: 8px; border: 2px solid #1C2028; display: block;" />`
                                    : `<div style="width: 42px; height: 42px; border-radius: 8px; background-color: #FF5722; color: #FFFFFF; border: 2px solid #1C2028; font-family: 'Courier New', Courier, monospace; font-size: 15px; font-weight: 800; line-height: 42px; text-align: center;">${initials}</div>`
                                }
                              </td>
                              <td style="padding-left: 12px;">
                                <div style="font-family: 'Courier New', Courier, monospace; font-size: 13px; font-weight: 800; color: #1C2028;">
                                  ${fullName}
                                </div>
                                <div style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #4B5563; margin-top: 1px;">
                                  ${email}
                                </div>
                                <div style="margin-top: 5px;">
                                  <span style="display: inline-block; background-color: #1C2028; color: #FAF7F0; font-family: 'Courier New', Courier, monospace; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
                                    TIER: ${accountTier.toUpperCase()}
                                  </span>
                                  <span style="display: inline-block; background-color: #10B981; color: #1C2028; font-family: 'Courier New', Courier, monospace; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-left: 4px; text-transform: uppercase;">
                                    FREE PASS UNLOCKED
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

                <!-- Greeting & Personalized Message -->
                <tr>
                  <td style="padding: 24px 24px 20px 24px;">
                    <h2 style="margin: 0 0 12px 0; font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 800; color: #1C2028;">
                      Hey ${firstName},
                    </h2>
                    <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 22px; color: #374151;">
                      Your AI Resume Tailor account is officially set up and ready to run. We built this platform with one foundational rule:
                    </p>
                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #1C2028; font-weight: 700; background-color: #FAF7F0; border-left: 4px solid #FF5722; padding: 12px 14px; border-radius: 4px;">
                      You should see real, measurable keyword alignment and exact recruiter metrics on your own resume before ever touching a credit card. No trial auto-billing, no catch.
                    </p>

                    <!-- SECTION: WHAT YOU GET FOR FREE -->
                    <div style="border-top: 2px solid #1C2028; padding-top: 20px; margin-top: 10px;">
                      <span style="display: inline-block; background-color: #FF5722; color: #FFFFFF; font-family: 'Courier New', Courier, monospace; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; border: 1px solid #1C2028; margin-bottom: 12px; text-transform: uppercase;">
                        YOUR 100% FREE SUITE
                      </span>
                      <h3 style="margin: 0 0 16px 0; font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: 800; color: #1C2028;">
                        What&rsquo;s Waiting In Your Account Right Now:
                      </h3>

                      <!-- FEATURE CARD 1 -->
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px; background-color: #FAF7F0; border: 2px solid #1C2028; border-radius: 8px; box-shadow: 2px 2px 0px #1C2028;">
                        <tr>
                          <td style="padding: 14px 16px;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="32" valign="top" style="font-size: 20px; line-height: 1;">📊</td>
                                <td style="padding-left: 8px;">
                                  <strong style="font-family: 'Courier New', Courier, monospace; font-size: 13px; color: #1C2028; display: block; margin-bottom: 2px;">
                                    1. Instant ATS Match Score &amp; Keyword Gap Diagnostic
                                  </strong>
                                  <span style="font-size: 12px; line-height: 18px; color: #4B5563; display: block;">
                                    Paste your resume and any job posting. In 15 seconds, see your score (0–100%) and the exact hard keywords the applicant tracking system filters for.
                                  </span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- FEATURE CARD 2 -->
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 12px; background-color: #FAF7F0; border: 2px solid #1C2028; border-radius: 8px; box-shadow: 2px 2px 0px #1C2028;">
                        <tr>
                          <td style="padding: 14px 16px;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="32" valign="top" style="font-size: 20px; line-height: 1;">⚡</td>
                                <td style="padding-left: 8px;">
                                  <strong style="font-family: 'Courier New', Courier, monospace; font-size: 13px; color: #1C2028; display: block; margin-bottom: 2px;">
                                    2. Full Side-by-Side Tailored Resume Preview
                                  </strong>
                                  <span style="font-size: 12px; line-height: 18px; color: #4B5563; display: block;">
                                    Watch your bullets transform into Google X-Y-Z quantifiable achievements (Action + Metric + Outcome) with strict zero-hallucination guardrails.
                                  </span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- FEATURE CARD 3 -->
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 14px; background-color: #ECFDF5; border: 2px solid #1C2028; border-radius: 8px; box-shadow: 2px 2px 0px #1C2028;">
                        <tr>
                          <td style="padding: 14px 16px;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="32" valign="top" style="font-size: 20px; line-height: 1;">🎁</td>
                                <td style="padding-left: 8px;">
                                  <strong style="font-family: 'Courier New', Courier, monospace; font-size: 13px; color: #065F46; display: block; margin-bottom: 2px;">
                                    3. 1 Free High-Impact Bullet Optimization
                                  </strong>
                                  <span style="font-size: 12px; line-height: 18px; color: #065F46; display: block;">
                                    We fully unlock 1 substantive tailored bullet for free. Copy it directly into your live resume today and see the difference in recruiter response rates.
                                  </span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- FEATURE CARD 4 -->
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px; background-color: #FAF7F0; border: 2px solid #1C2028; border-radius: 8px; box-shadow: 2px 2px 0px #1C2028;">
                        <tr>
                          <td style="padding: 14px 16px;">
                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                              <tr>
                                <td width="32" valign="top" style="font-size: 20px; line-height: 1;">🛠️</td>
                                <td style="padding-left: 8px;">
                                  <strong style="font-family: 'Courier New', Courier, monospace; font-size: 13px; color: #1C2028; display: block; margin-bottom: 2px;">
                                    4. Change Studio &amp; Recruiter Rationale
                                  </strong>
                                  <span style="font-size: 12px; line-height: 18px; color: #4B5563; display: block;">
                                    Review every change with clear plain-English reasons explaining why the ATS algorithm and hiring manager look for that specific wording.
                                  </span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- CTA BUTTON -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 16px 0;">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${appUrl}" style="height:50px;v-text-anchor:middle;width:320px;" arcsize="12%" stroke="f" fillcolor="#FF5722">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:bold;">RUN YOUR FREE ATS AUDIT &rarr;</center>
                          </v:roundrect>
                          <![endif]-->
                          <a href="${appUrl}" target="_blank" class="neo-btn" style="display: inline-block; background-color: #FF5722; color: #FFFFFF; font-family: 'Courier New', Courier, monospace; font-size: 14px; font-weight: 800; text-decoration: none; padding: 15px 30px; border: 2px solid #1C2028; border-radius: 8px; box-shadow: 3px 3px 0px #1C2028; text-transform: uppercase; letter-spacing: 0.5px;">
                            ⚡ RUN YOUR FREE ATS AUDIT &rarr;
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 8px;">
                          <span style="font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #6B7280;">
                            Zero card required • Ready in 45 seconds • Instant preview
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- PERSONAL NOTE FROM FOUNDER -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 2px solid #1C2028; padding-top: 18px; margin-top: 20px;">
                      <tr>
                        <td style="font-size: 13px; line-height: 20px; color: #374151;">
                          Have an unusual career change or tricky transition, ${firstName}? Reply directly to this email—I personally read and reply to every message from our candidates.<br><br>
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
                You received this email because you signed up at <a href="${appUrl}" style="color: #FF5722; text-decoration: none; font-weight: 700;">airesumetailor.com</a> with <span style="font-family: monospace;">${email}</span>.
              </p>
              <p style="margin: 0; font-size: 10px; color: #9CA3AF;">
                &copy; ${year} AI Resume Tailor. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;
}

export function generateWelcomeEmailText({
  name,
  email,
  accountTier = "Free Starter",
  appUrl = "https://airesumetailor.com",
}: WelcomeEmailParams): string {
  const firstName = extractFirstName(name, email);
  const fullName = name?.trim() || firstName;

  return `AI RESUME TAILOR — MISSION CONTROL
-------------------------------------------
Hey ${firstName},

Your AI Resume Tailor account is officially set up and ready to run.

CANDIDATE: ${fullName}
ACCOUNT:   ${email}
TIER:      ${accountTier.toUpperCase()} (Active)

We built this platform with one foundational rule:
You should see real, measurable keyword alignment and exact recruiter metrics on your own resume before ever touching a credit card. No trial auto-billing, no catch.

HERE IS WHAT'S WAITING IN YOUR ACCOUNT 100% FREE:
1. Instant ATS Match Score & Keyword Gap Diagnostic:
   Paste your resume and target job posting. In 15 seconds, see your score (0-100%) and the exact hard keywords the applicant tracking system filters for.

2. Full Side-by-Side Tailored Resume Preview:
   Watch your bullets transform into Google X-Y-Z quantifiable achievements (Action + Metric + Outcome) with strict zero-hallucination guardrails.

3. 1 Free High-Impact Bullet Optimization:
   We fully unlock 1 substantive tailored bullet for free. Copy it directly into your live resume today and see the difference in recruiter response rates.

4. Change Studio & Recruiter Rationale:
   Review every change with clear plain-English reasons explaining why the ATS algorithm and hiring manager look for that specific wording.

START YOUR FREE ATS AUDIT NOW:
${appUrl}

Have an unusual career change or tricky transition, ${firstName}? Reply directly to this email—I personally read and reply to every message.

Shayne Zamora
Founder, AI Resume Tailor
https://airesumetailor.com
`;
}
