import {
  parseEmailAddress,
  validateRecipientEmail,
  validateSenderEmail,
} from "./email-address";
import { formatTwilioCommsEmailError, formatTwilioRestError } from "./notification-errors";
import { normalizeMobile } from "./validators";

export type TwilioMessageParams = {
  to: string;
  body: string;
  mediaUrl?: string;
  channel: "sms" | "whatsapp";
};

export {
  parseEmailAddress,
  isValidEmailAddress,
} from "./email-address";

function getTwilioCredentials():
  | { accountSid: string; authToken: string }
  | { error: string }
  | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!accountSid || !authToken) return null;
  if (accountSid.startsWith("SK")) {
    return {
      error:
        "TWILIO_ACCOUNT_SID must be your Account SID (starts with AC), not an API Key (SK). Copy AC… from Twilio Console dashboard.",
    };
  }
  if (!accountSid.startsWith("AC")) {
    return { error: "TWILIO_ACCOUNT_SID must start with AC." };
  }
  return { accountSid, authToken };
}

function formatAddress(
  phone: string,
  channel: "sms" | "whatsapp"
): string {
  const normalized = normalizeMobile(phone);
  if (channel === "whatsapp") {
    return normalized.startsWith("whatsapp:")
      ? normalized
      : `whatsapp:${normalized}`;
  }
  return normalized.replace(/^whatsapp:/, "");
}

function formatFrom(
  from: string,
  channel: "sms" | "whatsapp"
): string {
  if (channel === "whatsapp") {
    return from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
  }
  return from.replace(/^whatsapp:/, "");
}

export async function sendTwilioMessage(
  params: TwilioMessageParams
): Promise<{ ok: boolean; error?: string; sid?: string }> {
  const creds = getTwilioCredentials();
  if (!creds) {
    return { ok: false, error: "Twilio credentials not configured" };
  }
  if ("error" in creds) {
    return { ok: false, error: creds.error };
  }

  const fromRaw =
    params.channel === "whatsapp"
      ? process.env.TWILIO_WHATSAPP_NUMBER
      : process.env.TWILIO_PHONE_NUMBER;

  if (!fromRaw) {
    return {
      ok: false,
      error:
        params.channel === "whatsapp"
          ? "TWILIO_WHATSAPP_NUMBER not set"
          : "TWILIO_PHONE_NUMBER not set",
    };
  }

  const form = new URLSearchParams({
    To: formatAddress(params.to, params.channel),
    From: formatFrom(fromRaw, params.channel),
    Body: params.body,
  });

  if (params.mediaUrl) {
    form.append("MediaUrl", params.mediaUrl);
  }

  const auth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString(
    "base64"
  );

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    return {
      ok: false,
      error: formatTwilioRestError(text.slice(0, 1200), {
        to: params.to,
        channel: params.channel,
        provider: "Twilio",
      }),
    };
  }

  const data = (await res.json()) as { sid?: string };
  return { ok: true, sid: data.sid };
}

/** Twilio-only sender; falls back to EMAIL_FROM. */
export function resolveTwilioEmailFrom(): {
  raw: string;
  address: string;
  name?: string;
  error?: string;
} | null {
  const raw = (
    process.env.TWILIO_EMAIL_FROM ||
    process.env.EMAIL_FROM ||
    ""
  ).trim();
  if (!raw) return null;

  const validated = validateSenderEmail(raw);
  if (!validated.ok) {
    return {
      raw,
      address: parseEmailAddress(raw).address,
      error: validated.error,
    };
  }

  return {
    raw,
    address: validated.address,
    name: validated.name,
  };
}

/** @deprecated Use formatTwilioCommsEmailError from notification-errors */
export function formatTwilioEmailError(
  raw: string,
  fromAddress?: string
): string {
  return formatTwilioCommsEmailError(raw, { from: fromAddress });
}

export type TwilioEmailParams = {
  to: string;
  toName?: string;
  fromRaw: string;
  subject: string;
  html: string;
  text?: string;
};

/** Twilio Email API — uses Account SID + Auth Token (no SendGrid API key). */
export async function sendTwilioCommsEmail(
  params: TwilioEmailParams
): Promise<{ ok: boolean; error?: string; operationId?: string }> {
  const creds = getTwilioCredentials();
  if (!creds) {
    return { ok: false, error: "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required" };
  }
  if ("error" in creds) {
    return { ok: false, error: creds.error };
  }

  const toCheck = validateRecipientEmail(params.to, "Recipient");
  if (!toCheck.ok) {
    return { ok: false, error: toCheck.error };
  }

  const resolved = resolveTwilioEmailFrom();
  const from = resolved ?? parseEmailAddress(params.fromRaw);
  if (resolved?.error) {
    return { ok: false, error: resolved.error };
  }

  const fromCheck = validateSenderEmail(from.address, "Sender");
  if (!fromCheck.ok) {
    return { ok: false, error: fromCheck.error };
  }

  const auth = Buffer.from(`${creds.accountSid}:${creds.authToken}`).toString(
    "base64"
  );

  const fromPayload: { address: string; name?: string } = {
    address: fromCheck.address,
  };
  const displayName = from.name?.trim() || resolved?.name?.trim();
  if (displayName) {
    fromPayload.name = displayName;
  }

  const toPayload: { address: string; name?: string } = {
    address: toCheck.address,
  };
  const recipientName = params.toName?.trim() || toCheck.name?.trim();
  if (recipientName) {
    toPayload.name = recipientName;
  }

  const res = await fetch("https://comms.twilio.com/v1/Emails", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromPayload,
      to: [toPayload],
      content: {
        subject: params.subject,
        html: params.html,
        text: params.text ?? params.subject,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return {
      ok: false,
      error: formatTwilioCommsEmailError(text.slice(0, 1200), {
        to: toCheck.address,
        from: fromCheck.address,
        channel: "email",
        provider: "Twilio Email",
      }),
    };
  }

  const data = (await res.json()) as { operationId?: string };
  return { ok: true, operationId: data.operationId };
}

export function isTwilioEmailConfigured(): boolean {
  const creds = getTwilioCredentials();
  if (!creds || "error" in creds) return false;
  const from = resolveTwilioEmailFrom();
  return Boolean(from && !from.error);
}
