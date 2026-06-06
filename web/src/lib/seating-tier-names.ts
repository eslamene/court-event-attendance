/** Client-safe tier name helpers (no server / DB imports). */

export function tierNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function findDuplicateTierNames(
  tiers: { name: string }[]
): string | null {
  const seen = new Set<string>();
  for (const tier of tiers) {
    const key = tierNameKey(tier.name);
    if (!key) continue;
    if (seen.has(key)) return tier.name.trim();
    seen.add(key);
  }
  return null;
}

export function suggestUniqueTierName(
  baseName: string,
  existingNames: string[]
): string {
  const keys = new Set(existingNames.map(tierNameKey));
  const trimmed = baseName.trim() || "Tier";
  if (!keys.has(tierNameKey(trimmed))) return trimmed;
  for (let n = 2; n <= 999; n++) {
    const candidate = `${trimmed} ${n}`;
    if (!keys.has(tierNameKey(candidate))) return candidate;
  }
  return `${trimmed} ${Date.now()}`;
}
