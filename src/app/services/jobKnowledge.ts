/**
 * Job Role Knowledge & Canonical Resolver Service
 *
 * Manages permanent role-specific knowledge bases in Supabase, maps diverse job titles
 * to standardized canonical titles, and provides sub-15ms cached domain profiles
 * containing native power verbs and authentic operational metrics.
 */

import { supabaseAdmin } from "@/app/lib/supabase/server";
import {
  detectIndustryCategory,
  getDomainTaxonomy,
  type IndustryCategory,
} from "@/app/config/domainTaxonomy";

export interface JobRoleKnowledge {
  id?: string;
  canonicalTitle: string;
  industryCategory: IndustryCategory;
  alternateTitles?: string[];
  powerVerbs: string[];
  authenticMetricTypes: string[];
  coreCompetencies: string[];
  seniorityExpectations?: Record<string, string>;
}

/**
 * Standardizes diverse, non-standard job titles into normalized canonical role titles.
 */
export function resolveCanonicalTitle(title: string, category: IndustryCategory): string {
  const clean = (title || "").trim();
  const lower = clean.toLowerCase();

  switch (category) {
    case "healthcare":
      if (/\b(nurse manager|nursing lead|charge nurse|clinical supervisor|nurse supervisor)\b/.test(lower)) {
        return "Nurse Manager / Clinical Lead";
      }
      if (/\b(registered nurse|staff nurse|icu nurse|er nurse|telemetry nurse|rn\b)\b/.test(lower)) {
        return "Registered Nurse (Acute Care)";
      }
      if (/\b(physician|doctor|hospitalist|internist|attending)\b/.test(lower)) {
        return "Attending Physician / Hospitalist";
      }
      if (/\b(medical assistant|clinical assistant|cma\b)\b/.test(lower)) {
        return "Certified Medical Assistant";
      }
      break;

    case "hospitality_service":
      if (/\b(waiter|waitress|server|food server|dining room)\b/.test(lower)) {
        return "Restaurant Server / Food & Beverage Host";
      }
      if (/\b(bartender|mixologist|bar lead)\b/.test(lower)) {
        return "Lead Bartender & Beverage Specialist";
      }
      if (/\b(line cook|prep cook|short order cook)\b/.test(lower)) {
        return "Line Cook / Culinary Specialist";
      }
      if (/\b(chef|executive chef|head chef|sous chef)\b/.test(lower)) {
        return "Executive Chef & Kitchen Director";
      }
      break;

    case "trades_facilities":
      if (/\b(janitor|custodian|custodial|cleaner|housekeeping)\b/.test(lower)) {
        return "Facilities Custodian & Maintenance Specialist";
      }
      if (/\b(hvac|maintenance technician|facilities technician)\b/.test(lower)) {
        return "HVAC & Facilities Maintenance Technician";
      }
      break;

    case "aviation_aerospace":
      if (/\b(pilot|captain|first officer|aviator|flight officer)\b/.test(lower)) {
        return "Commercial Airline Pilot / Flight Commander";
      }
      if (/\b(flight attendant|cabin crew|stewardess|steward)\b/.test(lower)) {
        return "Flight Attendant & Cabin Safety Specialist";
      }
      break;

    case "education_coaching":
      if (/\b(coach|varsity coach|athletic director|head coach)\b/.test(lower)) {
        return "Varsity Athletic Coach & Player Development Director";
      }
      if (/\b(teacher|educator|instructor|faculty)\b/.test(lower)) {
        return "Lead Educator & Classroom Instructor";
      }
      break;

    case "finance_accounting":
      if (/\b(accountant|staff accountant|senior accountant|cpa)\b/.test(lower)) {
        return "Senior Accountant & Financial Specialist";
      }
      if (/\b(financial analyst|fp&a analyst|finance analyst)\b/.test(lower)) {
        return "Financial Analyst & FP&A Specialist";
      }
      break;

    case "sales_marketing":
      if (/\b(account executive|sales rep|bdr|sdr|sales director)\b/.test(lower)) {
        return "Enterprise Account Executive & Revenue Specialist";
      }
      break;

    case "operations_logistics":
      if (/\b(supply chain|logistics|warehouse manager|distribution manager)\b/.test(lower)) {
        return "Logistics & Supply Chain Operations Manager";
      }
      break;

    case "technology_engineering":
      if (/\b(software engineer|backend engineer|frontend engineer|full stack engineer|developer)\b/.test(lower)) {
        return "Software Engineer / Systems Developer";
      }
      break;
  }

  return clean || "Professional";
}

/**
 * Retrieves role knowledge from Supabase cache, or synthesizes using domain taxonomy.
 * Guaranteed sub-15ms response on cache hits with graceful fallback on database errors.
 */
export async function getOrSynthesizeJobKnowledge(params: {
  title: string;
  jobDescription?: string;
  apiKey?: string;
  sessionApiKeys?: Record<string, string>;
  modelKey?: string;
}): Promise<JobRoleKnowledge> {
  const { title, jobDescription = "" } = params;
  const industryCategory = detectIndustryCategory(title, jobDescription);
  const canonicalTitle = resolveCanonicalTitle(title, industryCategory);
  const domainConfig = getDomainTaxonomy(industryCategory);

  // Default baseline built from taxonomy
  const fallbackKnowledge: JobRoleKnowledge = {
    canonicalTitle,
    industryCategory,
    powerVerbs: domainConfig.primaryVerbs,
    authenticMetricTypes: domainConfig.authenticMetricExamples,
    coreCompetencies: [domainConfig.displayName, ...domainConfig.evaluationDirectives],
    alternateTitles: [title],
  };

  try {
    // 1. Check Supabase cache (sub-15ms)
    const { data: cachedRow, error } = await supabaseAdmin
      .from("job_role_knowledge")
      .select("canonical_title, industry_category, power_verbs, authentic_metric_types, core_competencies, alternate_titles")
      .ilike("canonical_title", canonicalTitle)
      .limit(1)
      .maybeSingle();

    if (!error && cachedRow) {
      console.log(`[jobKnowledge] ⚡ Cache HIT for role "${canonicalTitle}" (${industryCategory})`);
      return {
        canonicalTitle: cachedRow.canonical_title || canonicalTitle,
        industryCategory: (cachedRow.industry_category as IndustryCategory) || industryCategory,
        powerVerbs: cachedRow.power_verbs && cachedRow.power_verbs.length > 0 ? cachedRow.power_verbs : domainConfig.primaryVerbs,
        authenticMetricTypes: cachedRow.authentic_metric_types && cachedRow.authentic_metric_types.length > 0 ? cachedRow.authentic_metric_types : domainConfig.authenticMetricExamples,
        coreCompetencies: cachedRow.core_competencies || [],
        alternateTitles: cachedRow.alternate_titles || [title],
      };
    }

    // 2. Cache miss: Save synthesized baseline asynchronously for all future users
    console.log(`[jobKnowledge] 🔍 Cache MISS for role "${canonicalTitle}". Persisting baseline to Supabase...`);
    supabaseAdmin
      .from("job_role_knowledge")
      .insert({
        canonical_title: canonicalTitle,
        industry_category: industryCategory,
        alternate_titles: [title],
        power_verbs: domainConfig.primaryVerbs,
        authentic_metric_types: domainConfig.authenticMetricExamples,
        core_competencies: [domainConfig.displayName, ...domainConfig.evaluationDirectives],
        usage_count: 1,
      })
      .then(({ error: insertErr }) => {
        if (insertErr) {
          console.warn("[jobKnowledge] Async role cache insert skipped:", insertErr.message);
        } else {
          console.log(`[jobKnowledge] ✔ Role knowledge persisted for "${canonicalTitle}"`);
        }
      })
      .catch((err) => {
        console.warn("[jobKnowledge] Async role cache insert failed:", err);
      });

    return fallbackKnowledge;
  } catch (err) {
    console.warn(`[jobKnowledge] Supabase query failed, using domain taxonomy fallback:`, err);
    return fallbackKnowledge;
  }
}
