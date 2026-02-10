import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ToolsPanel from '@/app/components/ToolsPanel';

// Mock fetch
global.fetch = vi.fn();

describe('ToolsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render tools panel', () => {
    render(<ToolsPanel resume="Test resume" jobDescription="Test job" />);
    expect(screen.getByText(/ATS Simulator/i)).toBeInTheDocument();
  });

  it('should show all available tools', () => {
    render(<ToolsPanel resume="Test resume" jobDescription="Test job" />);
    
    expect(screen.getByText(/ATS Simulator/i)).toBeInTheDocument();
    expect(screen.getByText(/Keyword Analyzer/i)).toBeInTheDocument();
    expect(screen.getByText(/Skills Gap/i)).toBeInTheDocument();
  });

  it('should disable tools that require resume when resume is missing', () => {
    render(<ToolsPanel jobDescription="Test job" />);
    
    const atsSimulator = screen.getByText(/ATS Simulator/i).closest('button');
    expect(atsSimulator).toBeDisabled();
  });

  it('should disable tools that require job description when job description is missing', () => {
    render(<ToolsPanel resume="Test resume" />);
    
    const keywordAnalyzer = screen.getByText(/Keyword Analyzer/i).closest('button');
    expect(keywordAnalyzer).toBeDisabled();
  });

  it('should call tool endpoint on tool click', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 'test result' }),
    });

    render(<ToolsPanel resume="Test resume" jobDescription="Test job" />);
    
    const atsSimulator = screen.getByText(/ATS Simulator/i).closest('button');
    await user.click(atsSimulator!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/tools/ats-simulator',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should call onToolResult callback when tool completes', async () => {
    const user = userEvent.setup();
    const onToolResult = vi.fn();
    
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: 'test result' }),
    });

    render(
      <ToolsPanel
        resume="Test resume"
        jobDescription="Test job"
        onToolResult={onToolResult}
      />
    );

    const atsSimulator = screen.getByText(/ATS Simulator/i).closest('button');
    await user.click(atsSimulator!);

    await waitFor(() => {
      expect(onToolResult).toHaveBeenCalled();
    });
  });

  it('should handle tool errors gracefully', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockRejectedValueOnce(new Error('Tool error'));

    render(<ToolsPanel resume="Test resume" jobDescription="Test job" />);

    const atsSimulator = screen.getByText(/ATS Simulator/i).closest('button');
    await user.click(atsSimulator!);

    // Should not crash
    await waitFor(() => {
      expect(screen.getByText(/ATS Simulator/i)).toBeInTheDocument();
    });
  });
});



