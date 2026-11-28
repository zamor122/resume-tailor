import Link from "next/link";

/**
 * Server-rendered site-wide internal link map.
 * Always present in initial SSR HTML so crawlers discover every route, while
 * styling reacts fluidly to the active design tokens (Pomegranate / Risograph).
 */
const GROUPS: Array<{ title: string; links: Array<[string, string]> }> = [
  {
    title: "Free tools",
    links: [
      ["Futureproof: Add AI Skills", "/futureproof"],
      ["ATS Resume Checker", "/resume-checker"],
      ["Resume Optimizer", "/resume-optimizer"],
      ["Pricing (No Subscription)", "/pricing"],
    ],
  },
  {
    title: "AI Skills by Profession",
    links: [
      ["Physicians & Clinicians AI", "/futureproof/doctor"],
      ["Nurses & Care Teams AI", "/futureproof/nurse"],
      ["Admin & Executive Assistants AI", "/futureproof/admin"],
      ["Finance & Accounting AI", "/futureproof/finance"],
      ["Attorneys & Paralegals AI", "/futureproof/legal"],
      ["Teachers & Educators AI", "/futureproof/teacher"],
    ],
  },
  {
    title: "Compare alternatives",
    links: [
      ["Jobscan alternative", "/alternatives/jobscan"],
      ["Teal alternative", "/alternatives/teal"],
      ["Rezi alternative", "/alternatives/rezi"],
      ["Kickresume alternative", "/alternatives/kickresume"],
      ["Resume.io alternative", "/alternatives/resume-io"],
      ["Zety alternative", "/alternatives/zety"],
    ],
  },
  {
    title: "Learn",
    links: [
      ["Blog", "/blog"],
      ["FAQ", "/faq"],
      ["ATS resume checker by role", "/keywords"],
      ["For AI Agents & Developers", "/agents"],
    ],
  },
];

export default function SiteLinks() {
  return (
    <nav
      aria-label="Site map"
      className="w-full border-t border-[var(--design-border-soft)] bg-[var(--design-surface-tint)]/65 text-[var(--design-ink)] transition-colors"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-9">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--design-ink)] mb-3 flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full bg-[var(--design-accent)] shrink-0"
                  aria-hidden="true"
                />
                {group.title}
              </h2>
              <ul className="space-y-2">
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-xs font-medium text-[var(--design-ink-muted)] hover:text-[var(--design-accent)] transition-colors duration-150 block"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
