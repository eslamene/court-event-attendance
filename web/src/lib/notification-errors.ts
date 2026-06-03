import { suggestFromAddressVariants } from "./sendgrid-senders";

export type NotificationErrorContext = {
  to?: string;
  from?: string;
  channel?: "email" | "sms" | "whatsapp";
  provider?: string;
};

type TwilioCommsErrorItem = {
  code?: number;
  message?: string;
  field?: string;
};

function matchFieldHint(
  message: string,
  field: string | undefined,
  ctx: NotificationErrorContext
): string | null {
  const blob = `${field ?? ""} ${message}`.toLowerCase();

  if (
    blob.includes("to[0]") ||
    blob.includes("to.address") ||
    blob.includes("recipient") ||
    (blob.includes("field 'to") && blob.includes("address"))
  ) {
    const sample = ctx.to ? `"${ctx.to}"` : "the recipient address";
    return (
      `Invalid recipient email ${sample}. ` +
      `Check the registration or test form: use name@domain.com with no spaces, Arabic letters, or phone numbers in the email field.`
    );
  }

  if (blob.includes("from") && (blob.includes("address") || blob.includes("sender"))) {
    const addr = ctx.from ?? "—";
    const variants = ctx.from ? suggestFromAddressVariants(ctx.from) : [];
    const alt =
      variants.length > 0
        ? ` If you verified the parent domain only, try EMAIL_FROM=${variants[0]}.`
        : "";
    return (
      `Invalid sender "${addr}". Set EMAIL_FROM to an address verified in ` +
      `Twilio Console → Email → Sender Identities.${alt}`
    );
  }

  if (blob.includes("content.subject")) {
    return "Email subject is invalid or missing.";
  }

  if (blob.includes("content.html") || blob.includes("content.text")) {
    return "Email body content is invalid or too large.";
  }

  if (blob.includes("authentication") || blob.includes("unauthorized") || blob === "401") {
    return (
      "Twilio authentication failed. Use Account SID (AC…) and Auth Token from the Twilio Console dashboard."
    );
  }

  return null;
}

/** Formats Twilio Comms Email API (`comms.twilio.com/v1/Emails`) error JSON. */
export function formatTwilioCommsEmailError(
  raw: string,
  ctx: NotificationErrorContext = {}
): string {
  try {
    const json = JSON.parse(raw) as {
      errors?: TwilioCommsErrorItem[];
      message?: string;
      status?: number;
    };

    const items = json.errors?.length
      ? json.errors
      : json.message
        ? [{ message: json.message }]
        : [];

    if (items.length === 0) {
      return raw.trim() || "Twilio Email API request failed.";
    }

    const parts = items.map((item) => {
      const msg = item.message?.trim();
      if (!msg) return "Unknown Twilio error.";
      const hint = matchFieldHint(msg, item.field, ctx);
      const code = item.code ? ` [${item.code}]` : "";
      return hint ? `${hint}${code}` : `${msg}${code}`;
    });

    const unique = [...new Set(parts)];
    return unique.join(" — ");
  } catch {
    const hint = matchFieldHint(raw, undefined, ctx);
    return hint ?? (raw.trim() || "Twilio Email API request failed.");
  }
}

/** Formats Twilio REST API errors (SMS / WhatsApp). */
export function formatTwilioRestError(
  raw: string,
  ctx: NotificationErrorContext = {}
): string {
  try {
    const json = JSON.parse(raw) as {
      code?: number;
      message?: string;
      more_info?: string;
    };
    const msg = json.message?.trim();
    if (!msg) return raw.trim() || "Twilio request failed.";

    const hint = matchFieldHint(msg, undefined, {
      ...ctx,
      channel: ctx.channel ?? "sms",
    });

    const code = json.code ? ` (code ${json.code})` : "";
    if (hint) return `${hint}${code}`;
    if (json.code === 21608 || msg.toLowerCase().includes("from")) {
      return `Invalid WhatsApp/SMS From number. Check TWILIO_WHATSAPP_NUMBER or TWILIO_PHONE_NUMBER.${code}`;
    }
    if (json.code === 21211 || msg.toLowerCase().includes("to")) {
      return `Invalid phone number for ${ctx.channel ?? "messaging"}: ${ctx.to ?? "recipient"}.${code}`;
    }
    return `${msg}${code}`;
  } catch {
    return raw.trim() || "Twilio request failed.";
  }
}

/** SendGrid / @sendgrid/mail thrown errors. */
export function formatSendGridError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "SendGrid send failed.";
  }

  const err = error as {
    message?: string;
    code?: number;
    response?: {
      statusCode?: number;
      body?: { errors?: { message?: string; field?: string }[] };
    };
  };

  const bodyErrors = err.response?.body?.errors;
  if (bodyErrors?.length) {
    return bodyErrors
      .map((e) => {
        const hint = e.field
          ? matchFieldHint(e.message ?? "", e.field, {})
          : null;
        return hint ?? e.message ?? "SendGrid error";
      })
      .join(" — ");
  }

  if (err.message) {
    const hint = matchFieldHint(err.message, undefined, {});
    return hint ?? err.message;
  }

  return "SendGrid send failed.";
}

export function formatResendError(message: string): string {
  const hint = matchFieldHint(message, undefined, {});
  return hint ?? message;
}

/** User-facing message for any delivery failure. */
export function formatDeliveryError(
  error: string | undefined,
  ctx: NotificationErrorContext
): string {
  if (!error?.trim()) {
    return ctx.channel === "email"
      ? "Email could not be sent."
      : ctx.channel === "whatsapp"
        ? "WhatsApp message could not be sent."
        : "Message could not be sent.";
  }
  return error;
}
