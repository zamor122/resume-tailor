import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hasActiveAccess,
  getAccessInfo,
  getAccessInfoServer,
  formatRemainingTime,
  isAccessExpired,
  getFreeResumeIdsServer,
  isWithinFreeResumeLimitServer,
} from '@/app/utils/accessManager';
import { supabase } from '@/app/lib/supabase/client';
import { supabaseAdmin } from '@/app/lib/supabase/server';
import { getTierConfig } from '@/app/config/pricing';

// Mock dependencies - must provide factories to prevent env checks
vi.mock('@/app/lib/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));
vi.mock('@/app/lib/supabase/server', () => ({
  supabaseAdmin: { from: vi.fn() },
}));
vi.mock('@/app/config/pricing');

describe('accessManager utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasActiveAccess', () => {
    it('should return false for empty userId', async () => {
      const result = await hasActiveAccess('');
      expect(result).toBe(false);
    });

    it('should return true when user has active access', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { expires_at: futureDate.toISOString(), is_active: true },
          error: null,
        }),
      });
      
      const result = await hasActiveAccess('user-id');
      expect(result).toBe(true);
    });

    it('should return false when access is expired', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });
      
      const result = await hasActiveAccess('user-id');
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockRejectedValue(new Error('Database error')),
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await hasActiveAccess('user-id');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getAccessInfo', () => {
    it('should return null for empty userId', async () => {
      const result = await getAccessInfo('');
      expect(result).toBeNull();
    });

    it('should return access info when user has active access', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      (getTierConfig as any).mockReturnValue({ label: '2 Days' });
      
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            tier_purchased: '2D',
            expires_at: futureDate.toISOString(),
            is_active: true,
          },
          error: null,
        }),
      });
      
      const result = await getAccessInfo('user-id');
      
      expect(result).not.toBeNull();
      expect(result?.hasAccess).toBe(true);
      expect(result?.tier).toBe('2D');
      expect(result?.isExpired).toBe(false);
    });

    it('should return expired access info when no active access', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      });
      
      const result = await getAccessInfo('user-id');
      
      expect(result).not.toBeNull();
      expect(result?.hasAccess).toBe(false);
      expect(result?.isExpired).toBe(true);
    });
  });

  describe('formatRemainingTime', () => {
    it('should return "Expired" for null date', () => {
      expect(formatRemainingTime(null)).toBe('Expired');
    });

    it('should return "Expired" for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(formatRemainingTime(pastDate)).toBe('Expired');
    });

    it('should format days and hours correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      futureDate.setHours(futureDate.getHours() + 3);
      
      const result = formatRemainingTime(futureDate);
      expect(result).toContain('day');
      expect(result).toContain('hour');
    });

    it('should format hours and minutes correctly', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2);
      futureDate.setMinutes(futureDate.getMinutes() + 30);
      
      const result = formatRemainingTime(futureDate);
      expect(result).toContain('hour');
      expect(result).toContain('minute');
    });

    it('should format minutes correctly for short durations', () => {
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 15);
      
      const result = formatRemainingTime(futureDate);
      expect(result).toContain('minute');
      expect(result).not.toContain('hour');
    });
  });

  describe('isAccessExpired', () => {
    it('should return true for null date', () => {
      expect(isAccessExpired(null)).toBe(true);
    });

    it('should return true for past date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(isAccessExpired(pastDate)).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(isAccessExpired(futureDate)).toBe(false);
    });
  });

  describe('getFreeResumeIdsServer', () => {
    it('should return empty array for empty userId', async () => {
      const result = await getFreeResumeIdsServer('');
      expect(result).toEqual([]);
    });

    it('should return first N resume IDs by created_at ascending', async () => {
      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { id: 'resume-1' },
            { id: 'resume-2' },
            { id: 'resume-3' },
          ],
          error: null,
        }),
      });

      const result = await getFreeResumeIdsServer('user-id');
      expect(result).toEqual(['resume-1', 'resume-2', 'resume-3']);
    });

    it('should return empty array on error', async () => {
      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'DB error' },
        }),
      });

      const result = await getFreeResumeIdsServer('user-id');
      expect(result).toEqual([]);
    });
  });

  describe('isWithinFreeResumeLimitServer', () => {
    it('should return false for empty resumeId or userId', async () => {
      expect(await isWithinFreeResumeLimitServer('', 'user-id')).toBe(false);
      expect(await isWithinFreeResumeLimitServer('resume-1', '')).toBe(false);
    });

    it('should return true when resume is in free list', async () => {
      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: 'resume-1' }, { id: 'resume-2' }, { id: 'resume-3' }],
          error: null,
        }),
      });

      const result = await isWithinFreeResumeLimitServer('resume-2', 'user-id');
      expect(result).toBe(true);
    });

    it('should return false when resume is not in free list', async () => {
      (supabaseAdmin.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [{ id: 'resume-1' }, { id: 'resume-2' }, { id: 'resume-3' }],
          error: null,
        }),
      });

      const result = await isWithinFreeResumeLimitServer('resume-99', 'user-id');
      expect(result).toBe(false);
    });
  });
});



