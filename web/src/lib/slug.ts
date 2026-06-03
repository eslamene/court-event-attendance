/** Normalize admin-entered registration path segment (event slug). */
export function normalizeEventSlug(text: string): string {
  return slugify(text);
}

export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function uniqueEventSlug(
  name: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  let base = slugify(name) || "event";
  let slug = base;
  let i = 1;
  while (await exists(slug)) {
    slug = `${base}-${i++}`;
  }
  return slug;
}
