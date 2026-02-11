import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PaymentGate from '@/app/components/PaymentGate';

vi.mock('@/app/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    loading: false,
  }),
}));

vi.mock('@/app/utils/accessManager', () => ({
  hasActiveAccess: vi.fn().mockResolvedValue(false),
}));

describe('PaymentGate', () => {
  it('should render children when isUnlocked is true', async () => {
    render(
      <PaymentGate isUnlocked={true}>
        <p>Resume content</p>
      </PaymentGate>
    );
    await screen.findByText(/resume content/i);
    expect(screen.getByText(/resume content/i)).toBeInTheDocument();
    expect(screen.queryByText(/unlock access/i)).not.toBeInTheDocument();
  });

  it('should show overlay when isUnlocked is false and user has no access', async () => {
    render(
      <PaymentGate isUnlocked={false} resumeId="resume-1">
        <p>Resume content</p>
      </PaymentGate>
    );
    await screen.findByText(/unlock access/i);
    expect(screen.getByText(/unlock access/i)).toBeInTheDocument();
    expect(screen.getByText(/choose access plan/i)).toBeInTheDocument();
  });
});
