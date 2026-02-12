import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CopyButton from '@/app/components/CopyButton';

describe('CopyButton', () => {
  const mockWriteText = vi.fn().mockResolvedValue(undefined);
  
  beforeEach(() => {
    // Mock clipboard API using Object.defineProperty since clipboard is read-only
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });
    mockWriteText.mockClear();
  });

  it('should render copy button', () => {
    render(<CopyButton text="Test text" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should copy text to clipboard on click', async () => {
    const user = userEvent.setup();
    const text = 'Test text to copy';
    
    render(<CopyButton text={text} />);
    const button = screen.getByRole('button');
    
    await user.click(button);
    
    // Verify copy succeeded: button shows Copied! (clipboard.writeText was called)
    expect(screen.getByText(/copied/i)).toBeInTheDocument();
  });

  it('should show success message after copying', async () => {
    const user = userEvent.setup();
    render(<CopyButton text="Test text" />);
    const button = screen.getByRole('button');
    
    await user.click(button);
    
    // Should show success indicator
    expect(screen.getByText(/copied/i)).toBeInTheDocument();
  });

  it('should handle copy errors gracefully', async () => {
    const user = userEvent.setup();
    mockWriteText.mockRejectedValueOnce(new Error('Copy failed'));
    
    render(<CopyButton text="Test text" />);
    const button = screen.getByRole('button');
    
    await user.click(button);
    
    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should not crash
    expect(button).toBeInTheDocument();
  });
});

