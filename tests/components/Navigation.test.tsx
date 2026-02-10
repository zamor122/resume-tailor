import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navigation from '@/app/components/Navigation';

describe('Navigation', () => {
  it('should render navigation', () => {
    render(<Navigation />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    render(<Navigation />);
    // Use getAllByText since "Resume Tailor" appears in both the logo and the link
    const resumeTailorLinks = screen.getAllByText(/Resume Tailor/i);
    expect(resumeTailorLinks.length).toBeGreaterThan(0);
    expect(screen.getByText(/Profile/i)).toBeInTheDocument();
    expect(screen.getByText(/FAQ/i)).toBeInTheDocument();
  });
});

