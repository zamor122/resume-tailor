import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthGate from '@/app/components/AuthGate';

vi.mock('@/app/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithOAuth: vi.fn(),
  }),
}));

describe('AuthGate', () => {
  it('should render children when unauthenticated', () => {
    render(
      <AuthGate action="save">
        <button>Save Resume</button>
      </AuthGate>
    );
    expect(screen.getByRole('button', { name: /save resume/i })).toBeInTheDocument();
  });

  it('should show auth modal when unauthenticated user clicks (tailor action)', async () => {
    const user = userEvent.setup();
    render(
      <AuthGate action="tailor">
        <button>Tailor</button>
      </AuthGate>
    );
    const tailorButton = screen.getByRole('button', { name: /tailor/i });
    await user.click(tailorButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/sign in to tailor your resume/i)).toBeInTheDocument();
    expect(screen.getByText(/your first 3 resumes are free/i)).toBeInTheDocument();
  });

  it('should show auth modal when unauthenticated user clicks (save action)', async () => {
    const user = userEvent.setup();
    render(
      <AuthGate action="save">
        <button>Save</button>
      </AuthGate>
    );
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/sign in to save/i)).toBeInTheDocument();
  });
});
