import { resolveTwilioEmailFrom } from "./twilio-client";

export type VerifiedEmailSenders = {
  singleSenders: string[];
  authenticatedDomains: string[];
  configuredFrom: string | null;
  matchesVerified: boolean | null;
  hint?: string;
};

function emailOnDomain(address: string, domain: string): boolean {
  const addr = address.toLowerCase();
  const d = domain.toLowerCase().replace(/^www\./, "");
  return addr === d || addr.endsWith(`@${d}`);
}

export function addressMatchesVerifiedSenders(
  address: string,
  singleSenders: string[],
  domains: string[]
): boolean {
  const lower = address.toLowerCase();
  if (singleSenders.some((s) => s.toLowerCase() === lower)) return true;
  return domains.some((d) => emailOnDomain(lower, d));
}

/** Suggest root-domain From if a subdomain is configured (common misconfiguration). */
export function suggestFromAddressVariants(address: string): string[] {
  const at = address.indexOf("@");
  if (at < 1) return [];
  const local = address.slice(0, at);
  const host = address.slice(at + 1);
  const labels = host.split(".");
  if (labels.length <= 2) return [];
  const root = labels.slice(-2).join(".");
  const variant = `${local}@${root}`;
  return variant !== address ? [variant] : [];
}

export async function fetchVerifiedEmailSenders(): Promise<VerifiedEmailSenders> {
  const configured = resolveTwilioEmailFrom();
  const configuredFrom = configured?.address ?? null;

  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (!apiKey) {
    const variants = configuredFrom
      ? suggestFromAddressVariants(configuredFrom)
      : [];
    return {
      singleSenders: [],
      authenticatedDomains: [],
      configuredFrom,
      matchesVerified: null,
      hint:
        variants.length > 0
          ? `If you authenticated the parent domain, try EMAIL_FROM=${variants[0]} instead of ${configuredFrom}.`
          : "Add SENDGRID_API_KEY (Twilio Console → Email → API Keys) to list verified senders here, or copy the exact From email from Sender Identities.",
    };
  }

  const headers = { Authorization: `Bearer ${apiKey}` };

  const [sendersRes, domainsRes] = await Promise.all([
    fetch("https://api.sendgrid.com/v3/verified_senders", { headers }),
    fetch("https://api.sendgrid.com/v3/whitelabel/domains", { headers }),
  ]);

  const singleSenders: string[] = [];
  const authenticatedDomains: string[] = [];

  if (sendersRes.ok) {
    const data = (await sendersRes.json()) as {
      results?: { from_email?: string; verified?: boolean }[];
    };
    for (const row of data.results ?? []) {
      if (row.from_email && row.verified !== false) {
        singleSenders.push(row.from_email);
      }
    }
  }

  if (domainsRes.ok) {
    const data = (await domainsRes.json()) as {
      domains?: { domain?: string; valid?: boolean }[];
    };
    for (const row of data.domains ?? []) {
      if (row.domain && row.valid !== false) {
        authenticatedDomains.push(row.domain);
      }
    }
  }

  const matchesVerified = configuredFrom
    ? addressMatchesVerifiedSenders(
        configuredFrom,
        singleSenders,
        authenticatedDomains
      )
    : null;

  let hint: string | undefined;
  if (configuredFrom && matchesVerified === false) {
    const variants = suggestFromAddressVariants(configuredFrom).filter((v) =>
      addressMatchesVerifiedSenders(v, singleSenders, authenticatedDomains)
    );
    if (variants.length > 0) {
      hint = `EMAIL_FROM does not match Twilio verification. Try: ${variants.join(" or ")}`;
    } else if (singleSenders.length > 0) {
      hint = `Use one of these verified addresses in EMAIL_FROM: ${singleSenders.join(", ")}`;
    } else if (authenticatedDomains.length > 0) {
      hint = `Send from any address @${authenticatedDomains.join(", @")} (e.g. noreply@${authenticatedDomains[0]})`;
    } else {
      hint =
        "No verified senders found. Complete Single Sender or Domain Authentication in Twilio Console → Email.";
    }
  }

  return {
    singleSenders,
    authenticatedDomains,
    configuredFrom,
    matchesVerified,
    hint,
  };
}
