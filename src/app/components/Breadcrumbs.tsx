import React from "react";
import Link from "next/link";
import { BreadcrumbListStructuredData } from "./StructuredData";

const BASE_URL = "https://airesumetailor.com";

export interface Crumb {
  name: string;
  /** Omit on the last (current) crumb — it links nowhere. */
  href?: string;
}

/**
 * Visible breadcrumb trail + matching BreadcrumbList JSON-LD.
 *
 * Renders the SAME crumbs it marks up: hidden-only breadcrumb markup is
 * cloaking and is penalised. The last crumb is the current page and is
 * intentionally not a link.
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const structured = items.map((crumb) => ({
    name: crumb.name,
    ...(crumb.href ? { item: `${BASE_URL}${crumb.href}` } : {}),
  }));

  return (
    <>
      <BreadcrumbListStructuredData items={structured} />
      <nav
        aria-label="Breadcrumb"
        className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2"
      >
        {items.map((crumb, idx) => (
          <span key={idx} className="flex items-center gap-2">
            {idx > 0 && <span aria-hidden="true">/</span>}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="hover:text-cyan-600 dark:hover:text-cyan-400"
              >
                {crumb.name}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-gray-200 font-medium">
                {crumb.name}
              </span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
