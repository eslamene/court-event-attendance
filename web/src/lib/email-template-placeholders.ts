import { getPreviewSrcForPlaceholder } from "./email-template-preview-src";

/** Matches `{{judgeName}}` style template variables. */
export const PLACEHOLDER_TOKEN_REGEX = /\{\{(\w+)\}\}/g;

export function formatPlaceholderToken(key: string): string {
  return `{{${key}}}`;
}

export function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Fix chips accidentally injected into attributes (e.g. img data-template-src). */
export function repairCorruptedTemplateHtml(html: string): string {
  let result = html;

  result = result.replace(
    /data-template-src=["']([^"']*(?:<span[\s\S]*?<\/span>)[^"']*)["']/gi,
    (_match, inner: string) => {
      const keyMatch = inner.match(/data-template-var="(\w+)"/);
      return keyMatch ? `data-template-src="{{${keyMatch[1]}}}"` : _match;
    }
  );

  result = result.replace(
    /\ssrc=["']([^"']*(?:<span[\s\S]*?<\/span>)[^"']*)["']/gi,
    (match, inner: string) => {
      const keyMatch = inner.match(/data-template-var="(\w+)"/);
      if (!keyMatch) return match;
      return ` src="{{${keyMatch[1]}}}"`;
    }
  );

  result = result.replace(
    /<span[^>]*data-template-var="([^"]+)"[^>]*>[\s\S]*?<\/span>/gi,
    "{{$1}}"
  );

  result = result.replace(
    />\s*<\s*"([^"]+)"\s*(?=alt=)/gi,
    "><img "
  );

  return result;
}

function resolveEditorImageSrc(html: string): string {
  return html.replace(/<img\b([^>]*?)>/gi, (tag, attrs) => {
    const srcMatch = attrs.match(/\ssrc=["']([^"']+)["']/i);
    if (!srcMatch) return tag;

    const src = srcMatch[1];
    const tokenMatch = src.match(/^\{\{(\w+)\}\}$/);
    if (!tokenMatch) return tag;

    const preview = getPreviewSrcForPlaceholder(tokenMatch[1]);
    if (!preview) return tag;

    let next = attrs.replace(/\ssrc=["'][^"']+["']/i, ` src="${preview}"`);
    if (!/data-template-src=/i.test(next)) {
      next += ` data-template-src="${src}"`;
    }
    return `<img${next}>`;
  });
}

function restoreStorageImageSrc(html: string): string {
  return html.replace(/<img\b([^>]*?)>/gi, (tag, attrs) => {
    const templateMatch = attrs.match(/\sdata-template-src=["']([^"']+)["']/i);
    if (!templateMatch) return tag;

    const templateSrc = templateMatch[1];
    const withoutTemplate = attrs.replace(
      /\sdata-template-src=["'][^"']+["']/i,
      ""
    );
    const withoutSrc = withoutTemplate.replace(/\ssrc=["'][^"']*["']/i, "");
    return `<img${withoutSrc} src="${templateSrc}">`;
  });
}

/** Replace `{{key}}` only in text nodes — never inside HTML tags/attributes. */
function replacePlaceholdersOutsideTags(
  html: string,
  getLabel: (key: string) => string
): string {
  const tagPattern = /<[^>]+>/g;
  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) !== null) {
    const textSegment = html.slice(lastIndex, match.index);
    parts.push(
      textSegment.replace(PLACEHOLDER_TOKEN_REGEX, (_m, key: string) => {
        const label = escapeHtmlText(getLabel(key) || key);
        return `<span data-template-var="${key}" class="email-template-var">${label}</span>`;
      })
    );
    parts.push(match[0]);
    lastIndex = match.index + match[0].length;
  }

  const tail = html.slice(lastIndex);
  parts.push(
    tail.replace(PLACEHOLDER_TOKEN_REGEX, (_m, key: string) => {
      const label = escapeHtmlText(getLabel(key) || key);
      return `<span data-template-var="${key}" class="email-template-var">${label}</span>`;
    })
  );

  return parts.join("");
}

/** Convert stored `{{key}}` tokens to inline chips for the rich editor. */
export function toEditorHtml(
  html: string,
  getLabel: (key: string) => string
): string {
  let result = repairCorruptedTemplateHtml(html);
  result = resolveEditorImageSrc(result);
  result = replacePlaceholdersOutsideTags(result, getLabel);
  return result;
}

/** Convert editor chips back to `{{key}}` for storage and email sending. */
export function toStorageHtml(html: string): string {
  let result = repairCorruptedTemplateHtml(html);
  result = result
    .replace(
      /<span[^>]*data-template-var="([^"]+)"[^>]*>[\s\S]*?<\/span>/gi,
      "{{$1}}"
    )
    .replace(PLACEHOLDER_TOKEN_REGEX, "{{$1}}");
  result = restoreStorageImageSrc(result);
  return result;
}

export function extractPlaceholderKeys(html: string): string[] {
  const keys = new Set<string>();
  for (const match of html.matchAll(PLACEHOLDER_TOKEN_REGEX)) {
    if (match[1]) keys.add(match[1]);
  }
  for (const match of html.matchAll(/data-template-var="([^"]+)"/gi)) {
    if (match[1]) keys.add(match[1]);
  }
  return [...keys];
}
