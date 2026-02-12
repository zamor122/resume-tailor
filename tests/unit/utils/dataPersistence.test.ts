import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveResumeData,
  loadResumeData,
  clearResumeData,
  hasStoredData,
} from '@/app/utils/dataPersistence';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('dataPersistence utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('saveResumeData', () => {
    it('should save resume data to localStorage', () => {
      const data = {
        resumeText: 'Test resume',
        jobDescription: 'Test job',
        sessionId: 'test-session',
      };
      saveResumeData(data);
      const stored = localStorage.getItem('resume-tailor-data');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.resumeText).toBe('Test resume');
      expect(parsed.jobDescription).toBe('Test job');
      expect(parsed.sessionId).toBe('test-session');
    });

    it('should merge with existing data', () => {
      const existing = {
        resumeText: 'Existing resume',
        jobDescription: 'Existing job',
        sessionId: 'existing-session',
        timestamp: 1000,
      };
      localStorage.setItem('resume-tailor-data', JSON.stringify(existing));
      
      saveResumeData({ resumeText: 'New resume' });
      const stored = JSON.parse(localStorage.getItem('resume-tailor-data')!);
      expect(stored.resumeText).toBe('New resume');
      expect(stored.jobDescription).toBe('Existing job');
    });

    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      
      saveResumeData({ resumeText: 'Test' });
      expect(consoleSpy).toHaveBeenCalled();
      
      localStorage.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('loadResumeData', () => {
    it('should load resume data from localStorage', () => {
      const data = {
        resumeText: 'Test resume',
        jobDescription: 'Test job',
        sessionId: 'test-session',
        results: null,
        uploadMode: 'file' as const,
        timestamp: Date.now(),
      };
      localStorage.setItem('resume-tailor-data', JSON.stringify(data));
      
      const loaded = loadResumeData();
      expect(loaded).toEqual(data);
    });

    it('should return null when no data exists', () => {
      expect(loadResumeData()).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      localStorage.setItem('resume-tailor-data', 'invalid json');
      expect(loadResumeData()).toBeNull();
    });

    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      
      expect(loadResumeData()).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      localStorage.getItem = originalGetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('clearResumeData', () => {
    it('should remove data from localStorage', () => {
      localStorage.setItem('resume-tailor-data', JSON.stringify({ resumeText: 'Test' }));
      clearResumeData();
      expect(localStorage.getItem('resume-tailor-data')).toBeNull();
    });

    it('should handle errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      
      clearResumeData();
      expect(consoleSpy).toHaveBeenCalled();
      
      localStorage.removeItem = originalRemoveItem;
      consoleSpy.mockRestore();
    });
  });

  describe('hasStoredData', () => {
    it('should return true when data exists', () => {
      localStorage.setItem('resume-tailor-data', JSON.stringify({ resumeText: 'Test' }));
      expect(hasStoredData()).toBe(true);
    });

    it('should return false when no data exists', () => {
      expect(hasStoredData()).toBe(false);
    });

    it('should return false on error', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      
      expect(hasStoredData()).toBe(false);
      
      localStorage.getItem = originalGetItem;
    });
  });
});



