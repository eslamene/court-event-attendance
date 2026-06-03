const EMAIL_ADDRESS_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/** Strips wrapping quotes from .env values. */
export function stripEnvQuotes(value: string): string {
  const t = value.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1).trim();
  }
  return t;
}

/** Parses `Name <email@domain.com>` or plain `email@domain.com`. */
export function parseEmailAddress(raw: string): {
  address: string;
  name?: string;
} {
  const trimmed = stripEnvQuotes(raw.trim());
  const angle = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (angle) {
    const name = angle[1].trim().replace(/^["']|["']$/g, "");
    return {
      name: name || undefined,
      address: stripEnvQuotes(angle[2].trim()),
    };
  }
  return { address: trimmed };
}

export function isValidEmailAddress(address: string): boolean {
  return EMAIL_ADDRESS_RE.test(address);
}

/** Normalizes recipient input (trim, unwrap, remove invisible chars / spaces). */
export function normalizeRecipientEmail(raw: string): string {
  let s = stripEnvQuotes(raw.trim());
  const angle = s.match(/<([^>]+)>/);
  if (angle) s = angle[1].trim();
  s = s.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "");
  s = s.replace(/\s+/g, "");
  return s;
}

export type EmailValidationResult =
  | { ok: true; address: string; name?: string }
  | { ok: false; error: string; code: "empty" | "invalid" };

export function validateRecipientEmail(
  raw: string,
  label = "Recipient"
): EmailValidationResult {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return {
      ok: false,
      code: "empty",
      error: `${label} email is required.`,
    };
  }

  const parsed = parseEmailAddress(trimmed);
  const address = normalizeRecipientEmail(parsed.address || trimmed);

  if (!address) {
    return {
      ok: false,
      code: "empty",
      error: `${label} email is required.`,
    };
  }

  if (!isValidEmailAddress(address)) {
    const display = trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
    return {
      ok: false,
      code: "invalid",
      error:
        `${label} email is not valid: "${display}". ` +
        `Use a well-formed address (e.g. name@example.com) with no spaces or extra characters.`,
    };
  }

  return {
    ok: true,
    address,
    name: parsed.name,
  };
}

export function validateSenderEmail(
  raw: string,
  label = "Sender (EMAIL_FROM)"
): EmailValidationResult {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, code: "empty", error: `${label} is not configured.` };
  }

  const { address, name } = parseEmailAddress(trimmed);
  if (!isValidEmailAddress(address)) {
    return {
      ok: false,
      code: "invalid",
      error: `${label} is not a valid email address: "${address}".`,
    };
  }

  const lower = address.toLowerCase();
  if (lower.endsWith("@resend.dev") || lower.includes("onboarding@")) {
    return {
      ok: false,
      code: "invalid",
      error:
        `${label} cannot use Resend sandbox addresses with Twilio Email. ` +
        `Use a sender verified in Twilio Console → Email.`,
    };
  }

  return { ok: true, address, name };
}
