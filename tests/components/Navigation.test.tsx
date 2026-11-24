import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Navigation from '@/app/components/Navigation';

describe('Navigation', () => {
  it('should render a single clean navigation landmark without telemetry ticker clutter', () => {
    render(<Navigation />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.queryByText(/RADAR: ONLINE/i)).toBeNull();
    expect(screen.queryByText(/STREAK/i)).toBeNull();
    expect(screen.queryByText(/XP/i)).toBeNull();
  });

  it('should render core navigation links and CTA', () => {
    render(<Navigation />);
    expect(screen.getByText(/AI RESUME TAILOR/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Tailor$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Pricing$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Blog$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^FAQ$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start Free/i })).toBeInTheDocument();
  });
});
