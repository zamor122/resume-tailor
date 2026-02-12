import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider } from '@/app/contexts/AuthContext';
import { ThemeProvider } from '@/app/components/ThemeProvider';

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock data helpers
export const mockResume = `John Doe
Email: john.doe@example.com
Phone: (555) 123-4567

EXPERIENCE
Software Engineer | Tech Corp | 2020 - Present
- Developed web applications using React and TypeScript
- Improved application performance by 40%
- Led team of 3 developers

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2016 - 2020

SKILLS
JavaScript, TypeScript, React, Node.js, Python`;

export const mockJobDescription = `Software Engineer Position

We are looking for a skilled Software Engineer to join our team.

Requirements:
- 3+ years of experience with React and TypeScript
- Strong knowledge of JavaScript and web development
- Experience with Node.js and Python
- Excellent problem-solving skills
- Bachelor's degree in Computer Science or related field

Responsibilities:
- Develop and maintain web applications
- Collaborate with cross-functional teams
- Write clean, maintainable code
- Participate in code reviews`;

export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
};

export const mockSession = {
  sessionId: 'test-session-id',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  jobDescriptions: [],
  contextPairs: [],
  toolExecutions: [],
  conversationHistory: [],
};

// Mock fetch helper
export const mockFetch = (response: any, ok: boolean = true) => {
  return vi.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      status: ok ? 200 : 400,
      statusText: ok ? 'OK' : 'Bad Request',
    } as Response),
  );
};

// Wait for async updates
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));



