import { put } from "@vercel/blob";
import { apiT } from "@/lib/i18n/api";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

import {
  EVENT_LOGO_ALLOWED_TYPES,
  EVENT_LOGO_MAX_BYTES,
} from "./event-logo-constants";

export function isExternalLogoUrl(path: string) {
  return path.startsWith("http://") || path.startsWith("https://");
}

export function logoPublicPath(eventId: string, ext: string) {
  return `/events/${eventId}${ext}`;
}

function extensionForMime(type: string) {
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  return ".jpg";
}

export async function saveEventLogo(
  eventId: string,
  file: File
): Promise<{ logoPath: string } | { error: string }> {
  if (!EVENT_LOGO_ALLOWED_TYPES.has(file.type)) {
    return { error: await apiT("api.unsupportedFileType") };
  }
  if (file.size > EVENT_LOGO_MAX_BYTES) {
    return { error: await apiT("api.fileTooLarge") };
  }

  const ext = extensionForMime(file.type);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`events/${eventId}${ext}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return { logoPath: blob.url };
  }

  const dir = path.join(process.cwd(), "public", "events");
  await mkdir(dir, { recursive: true });
  const filename = `${eventId}${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  return { logoPath: logoPublicPath(eventId, ext) };
}

export async function removeEventLogoFiles(eventId: string, logoPath?: string | null) {
  if (logoPath && isExternalLogoUrl(logoPath)) return;

  const dir = path.join(process.cwd(), "public", "events");
  for (const ext of [".jpg", ".jpeg", ".png", ".webp", ".gif"]) {
    try {
      await unlink(path.join(dir, `${eventId}${ext}`));
    } catch {
      /* file may not exist */
    }
  }
}
