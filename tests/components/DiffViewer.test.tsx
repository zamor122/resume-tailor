import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DiffViewer from '@/app/components/DiffViewer';

// Mock fetch
global.fetch = vi.fn();

describe('DiffViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render diff viewer', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sections: [],
        summary: { totalChanges: 0, additions: 0, modifications: 0, removals: 0 },
      }),
    });

    render(
      <DiffViewer
        originalResume="Original text"
        tailoredResume="Tailored text"
      />
    );
    
    // Component will show loading state initially, then render after fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('should fetch diff when both resumes are provided', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sections: [
          {
            name: 'Experience',
            changes: [
              {
                type: 'modified',
                original: 'Original',
                tailored: 'New',
                section: 'Experience',
              },
            ],
          },
        ],
        summary: {
          totalChanges: 1,
          additions: 0,
          modifications: 1,
          removals: 0,
        },
      }),
    });

    render(
      <DiffViewer
        originalResume="Original resume"
        tailoredResume="Tailored resume"
      />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/humanize/diff',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should display changes when diff is loaded', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        sections: [
          {
            name: 'Experience',
            changes: [
              {
                type: 'modified',
                original: 'Original text',
                tailored: 'New text',
                section: 'Experience',
              },
            ],
          },
        ],
        summary: {
          totalChanges: 1,
          additions: 0,
          modifications: 1,
          removals: 0,
        },
      }),
    });

    render(
      <DiffViewer
        originalResume="Original resume"
        tailoredResume="Tailored resume"
      />
    );

    await waitFor(() => {
      // Text appears multiple times in the diff view, so use getAllByText
      const elements = screen.getAllByText(/Original text/i);
      expect(elements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('API error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <DiffViewer
        originalResume="Original resume"
        tailoredResume="Tailored resume"
      />
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});

