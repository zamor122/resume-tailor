import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SplitScreenTailorView from "@/app/components/SplitScreenTailorView";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/app/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "user@example.com", created_at: new Date().toISOString() },
    session: { access_token: "tok-123" },
    loading: false,
  }),
}));

vi.mock("@/app/contexts/GamificationContext", () => ({
  useGamification: () => ({
    playSfx: vi.fn(),
    awardXp: vi.fn(),
    completeQuest: vi.fn(),
    pokeMascot: vi.fn(),
  }),
}));

vi.mock("@/app/components/TierSelectionModal", () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="tier-selection-modal">UPGRADE MODAL OPEN</div> : null,
}));

vi.mock("@/app/components/AuthModal", () => ({
  default: () => null,
}));

vi.mock("@/app/components/ResetConfirmationModal", () => ({
  default: () => null,
}));

vi.mock("@/app/components/ElicitationPanel", () => ({
  default: () => null,
}));

describe("SplitScreenTailorView upgrade modal & inline CTA on 402 limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it("opens TierSelectionModal and renders inline unlock button when /api/humanize/stream returns 402 requireUpgrade", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/elicitation/questions")) {
        return new Response(JSON.stringify({ questions: [] }), { status: 200 });
      }
      if (url.includes("/api/humanize/stream")) {
        return new Response(
          JSON.stringify({
            error: "You've used your 2 free ATS audits. Purchase a one-time pass starting at $9 to tailor unlimited resumes and download PDFs.",
            requireUpgrade: true,
          }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("{}", { status: 200 });
    }) as any;

    render(<SplitScreenTailorView />);

    const resumeBox = screen.getByPlaceholderText(/Paste your current resume/i);
    const jdBox = screen.getByPlaceholderText(/Paste the target job posting/i);

    fireEvent.change(resumeBox, { target: { value: "Senior Engineer at Acme Corp. ".repeat(8) } });
    fireEvent.change(jdBox, { target: { value: "Looking for a Senior Engineer with TypeScript and Node.js. ".repeat(5) } });

    const tailorButtons = screen.getAllByRole("button", { name: /TAILOR.*RESUME/i });
    fireEvent.click(tailorButtons[0]);

    await waitFor(() => {
      expect(screen.getByTestId("tier-selection-modal")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Unlock Pass From \$9/i })).toBeInTheDocument();
  });
});
