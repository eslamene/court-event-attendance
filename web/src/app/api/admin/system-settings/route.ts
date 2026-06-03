import { NextResponse } from "next/server";
import { auth, canManageEvents } from "@/lib/auth";
import { apiT } from "@/lib/i18n/api";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import {
  EMAIL_PROVIDER_PREFERENCES,
  getSystemEnvironmentInfo,
  getSystemSettings,
  updateSystemSettings,
  type SystemSettingsData,
} from "@/lib/system-settings";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const [settings, environment] = await Promise.all([
    getSystemSettings(),
    getSystemEnvironmentInfo(),
  ]);

  return NextResponse.json({
    settings,
    environment,
    emailProviderOptions: EMAIL_PROVIDER_PREFERENCES,
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || !canManageEvents(session.user.role)) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  const input = body as Partial<SystemSettingsData>;
  const current = await getSystemSettings();
  const email = input.notifyEmailOnApprove ?? current.notifyEmailOnApprove;
  const wa = input.notifyWhatsAppOnApprove ?? current.notifyWhatsAppOnApprove;
  const sms = input.notifySmsOnApprove ?? current.notifySmsOnApprove;
  if (!email && !wa && !sms) {
    return NextResponse.json(
      { error: await apiT("api.systemSettingsNoChannels") },
      { status: 400 }
    );
  }

  const settings = await updateSystemSettings(input);

  await recordAudit({
    action: AUDIT_ACTIONS.SETTINGS_UPDATE,
    actor: auditActorFromSession(session.user),
    entityType: "settings",
    entityId: "global",
    entityLabel: settings.platformName,
    metadata: { changes: input },
    req,
  });

  return NextResponse.json({
    settings,
    message: await apiT("api.systemSettingsSaved"),
  });
}
