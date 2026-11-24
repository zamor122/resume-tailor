import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Navigation from '@/app/components/Navigation';

describe('Navigation', () => {
  it('keeps the top bar clean without telemetry ticker, streak, XP, or time limit clutter', () => {
    render(<Navigation />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.queryByText(/RADAR: ONLINE/i)).toBeNull();
    expect(screen.queryByText(/Streak/i)).toBeNull();
    expect(screen.queryByText(/XP/i)).toBeNull();
    expect(screen.queryByText(/remaining/i)).toBeNull();
  });

  it('renders core navigation links and reveals condensed status inside the hamburger menu', () => {
    render(<Navigation />);
    expect(screen.getByText(/AI RESUME TAILOR/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Tailor$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Pricing$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Blog$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^FAQ$/i })).toBeInTheDocument();

    const menuButton = screen.getByRole('button', { name: /Open menu/i });
    fireEvent.click(menuButton);

    expect(screen.getByText(/Streak/i)).toBeInTheDocument();
    expect(screen.getByText(/XP/i)).toBeInTheDocument();
    expect(screen.getByText(/Sound Effects/i)).toBeInTheDocument();
  });
});
