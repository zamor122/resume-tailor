import { supabase } from "@/app/lib/supabase/client";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { getTierConfig, FREE_RESUME_LIMIT } from "@/app/config/pricing";

export interface AccessInfo {
  hasAccess: boolean;
  tier: string | null;
  tierLabel: string | null;
  expiresAt: Date | null;
  remainingTime: number | null; // milliseconds
  isExpired: boolean;
}

/**
 * Check if user has active time-based access (client-side)
 */
export async function hasActiveAccess(userId: string): Promise<boolean> {
  if (!userId) return false;
  
  try {
    const { data, error } = await supabase
      .from('access_grants')
      .select('expires_at, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error || !data) {
      return false;
    }
    
    return new Date(data.expires_at) > new Date();
  } catch (error) {
    console.error("Error checking active access:", error);
    return false;
  }
}

/**
 * Get access information for a user (client-side)
 */
export async function getAccessInfo(userId: string): Promise<AccessInfo | null> {
  if (!userId) return null;
  
  try {
    const { data, error } = await supabase
      .from('access_grants')
      .select('tier_purchased, expires_at, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error || !data) {
      return {
        hasAccess: false,
        tier: null,
        tierLabel: null,
        expiresAt: null,
        remainingTime: null,
        isExpired: true,
      };
    }
    
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const remainingTime = expiresAt.getTime() - now.getTime();
    const tierConfig = getTierConfig(data.tier_purchased as '2D' | '7D' | '30D');
    
    return {
      hasAccess: true,
      tier: data.tier_purchased,
      tierLabel: tierConfig?.label || null,
      expiresAt: expiresAt,
      remainingTime: remainingTime > 0 ? remainingTime : 0,
      isExpired: expiresAt <= now,
    };
  } catch (error) {
    console.error("Error getting access info:", error);
    return {
      hasAccess: false,
      tier: null,
      tierLabel: null,
      expiresAt: null,
      remainingTime: null,
      isExpired: true,
    };
  }
}

/**
 * Get access information for a user (server-side)
 */
export async function getAccessInfoServer(userId: string): Promise<AccessInfo | null> {
  if (!userId) return null;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('access_grants')
      .select('tier_purchased, expires_at, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error || !data) {
      return {
        hasAccess: false,
        tier: null,
        tierLabel: null,
        expiresAt: null,
        remainingTime: null,
        isExpired: true,
      };
    }
    
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    const remainingTime = expiresAt.getTime() - now.getTime();
    const tierConfig = getTierConfig(data.tier_purchased as '2D' | '7D' | '30D');
    
    return {
      hasAccess: true,
      tier: data.tier_purchased,
      tierLabel: tierConfig?.label || null,
      expiresAt: expiresAt,
      remainingTime: remainingTime > 0 ? remainingTime : 0,
      isExpired: expiresAt <= now,
    };
  } catch (error) {
    console.error("Error getting access info (server):", error);
    return {
      hasAccess: false,
      tier: null,
      tierLabel: null,
      expiresAt: null,
      remainingTime: null,
      isExpired: true,
    };
  }
}

/**
 * Get remaining time in human-readable format
 */
export function formatRemainingTime(expiresAt: Date | null): string {
  if (!expiresAt) {
    return 'Expired';
  }

  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) {
    return 'Expired';
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
  }
}

/**
 * Check if access has expired
 */
export function isAccessExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) {
    return true;
  }
  return expiresAt <= new Date();
}

/**
 * Get upgrade options (uses upgradeCalculator)
 */
export { getUpgradeOptions } from '@/app/utils/upgradeCalculator';

/**
 * Get IDs of the user's first N resumes by created_at (oldest first)
 * Used for "first 3 free" - these resumes get full access without payment
 */
export async function getFreeResumeIdsServer(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('resumes')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(FREE_RESUME_LIMIT);
    if (error || !data) return [];
    return data.map((r) => r.id);
  } catch {
    return [];
  }
}

/**
 * Check if a resume is within the user's first N free resumes (server-side)
 */
export async function isWithinFreeResumeLimitServer(resumeId: string, userId: string): Promise<boolean> {
  if (!resumeId || !userId) return false;
  const ids = await getFreeResumeIdsServer(userId);
  return ids.includes(resumeId);
}

