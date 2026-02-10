import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import RealtimeATSScore from '@/app/components/RealtimeATSScore';

// Mock fetch
global.fetch = vi.fn();

describe('RealtimeATSScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render component', () => {
    render(<RealtimeATSScore resume="Test resume" jobDescription="Test job" />);
    expect(screen.getByText(/ATS Score/i)).toBeInTheDocument();
  });

  it('should fetch and display ATS score', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        score: 85,
        keywordMatches: {
          matched: 15,
          total: 20,
          percentage: 75,
        },
      }),
    });

    render(<RealtimeATSScore resume="Test resume" jobDescription="Test job description" />);
    
    await waitFor(() => {
      expect(screen.getByText(/85/i)).toBeInTheDocument();
    });
  });

  it('should not fetch when resume or job description is missing', () => {
    render(<RealtimeATSScore resume="" jobDescription="Test job" />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should debounce API calls', async () => {
    vi.useFakeTimers();
    
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ score: 80 }),
    });

    const { rerender } = render(
      <RealtimeATSScore resume="Resume" jobDescription="Job" />
    );

    // Change props multiple times quickly
    rerender(<RealtimeATSScore resume="Resume updated" jobDescription="Job" />);
    rerender(<RealtimeATSScore resume="Resume updated again" jobDescription="Job" />);

    // Fast-forward time
    vi.advanceTimersByTime(500);

    await waitFor(() => {
      // Should only call fetch once due to debouncing
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    vi.useRealTimers();
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<RealtimeATSScore resume="Test resume" jobDescription="Test job" />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});



