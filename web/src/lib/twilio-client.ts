import { normalizeMobile } from "./validators";

export type TwilioMessageParams = {
  to: string;
  body: string;
  mediaUrl?: string;
  channel: "sms" | "whatsapp";
};

function getTwilioCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;
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
    return { ok: false, error: text.slice(0, 800) };
  }

  const data = (await res.json()) as { sid?: string };
  return { ok: true, sid: data.sid };
}
