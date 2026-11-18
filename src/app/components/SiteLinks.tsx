import Link from 'next/link';

/**
 * Server-rendered site-wide internal link map.
 *
 * WHY THIS EXISTS: an audit of the live site found every page shipped **zero** anchor
 * tags to a crawler — /, /blog, /pricing and /alternatives/* all had no nav, no footer
 * links and no internal links in the server-rendered HTML. The interactive nav and
 * footer are client components that do not reach the initial HTML, so search engines saw
 * pages with no crawl path and no link graph. Google sent this site 2 visitors in 20
 * months while Bing sent 14.
 *
 * This is a plain server component: its markup is always present in the HTML, so it
 * guarantees every page exposes real internal links to crawlers. It is also genuinely
 * useful to visitors, which is why it is visible rather than hidden (hidden link blocks
 * are treated as cloaking).
 */
const GROUPS: Array<{ title: string; links: Array<[string, string]> }> = [
  {
    title: 'Free tools',
    links: [
      ['ATS Resume Checker', '/resume-checker'],
      ['Resume Optimizer', '/resume-optimizer'],
      ['Pricing', '/pricing'],
    ],
  },
  {
    title: 'Compare alternatives',
    links: [
      ['Jobscan alternative', '/alternatives/jobscan'],
      ['Teal alternative', '/alternatives/teal'],
      ['Rezi alternative', '/alternatives/rezi'],
      ['Kickresume alternative', '/alternatives/kickresume'],
      ['Resume.io alternative', '/alternatives/resume-io'],
      ['Zety alternative', '/alternatives/zety'],
    ],
  },
  {
    title: 'Learn',
    links: [
      ['Blog', '/blog'],
      ['FAQ', '/faq'],
      ['ATS resume checker by role', '/keywords'],
    ],
  },
];

export default function SiteLinks() {
  return (
    <nav
      aria-label="Site map"
      className="w-full border-t-2 border-[#1C2028] bg-[#FAF7F0] text-[#1C2028]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1C2028] mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5722]"></span>
                {group.title}
              </h2>
              <ul className="space-y-2">
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-xs font-mono text-gray-700 hover:text-[#FF5722] transition-colors duration-150 block"
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
