/**
 * Safely serialize structured data for embedding inside a `<script type="application/ld+json">` tag.
 * Escapes `<`, `>`, `&`, and Unicode line separators so dynamic content (e.g. blog titles/FAQs)
 * can never break out of the script element (`</script>` XSS).
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
