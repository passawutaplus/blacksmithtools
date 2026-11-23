/** JSON for a <script type="application/ld+json"> — escapes "<" so data can't close the tag. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
