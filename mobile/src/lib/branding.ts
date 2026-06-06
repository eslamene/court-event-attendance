import type { ImageSourcePropType } from "react-native";
import { API_BASE_URL } from "../config";
import type { EventItem } from "../api";

/** Bundled Court of Cassation logo (same file as web/public/logo.png). */
export const PLATFORM_LOGO_LOCAL: ImageSourcePropType = require("../../assets/logo.png");

export const PLATFORM_LOGO_PATH = "/logo.png";

export function resolveImageUri(path: string | null | undefined): string | null {
  const value = path?.trim();
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${API_BASE_URL}${value}`;
  return `${API_BASE_URL}/${value}`;
}

export function getPlatformLogoUri(): string {
  return `${API_BASE_URL}${PLATFORM_LOGO_PATH}`;
}

export function getEventLogoUri(event: Pick<EventItem, "logoPath">): string | null {
  return resolveImageUri(event.logoPath);
}

export function getEventDisplayLogoUri(
  event: Pick<EventItem, "logoPath"> | null | undefined
): string {
  return getEventLogoUri(event ?? {}) ?? getPlatformLogoUri();
}
