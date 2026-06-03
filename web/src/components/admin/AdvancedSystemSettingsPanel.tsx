"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Cloud,
  Database,
  EnvelopeSimple,
  FloppyDisk,
  GearSix,
  Globe,
  type IconProps,
} from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import {
  CheckboxField,
  ReadOnlyField,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/ui/Field";
import { PrimaryFormButton } from "@/components/ui/FormActions";
import type {
  EmailProviderPreference,
  SystemEnvironmentInfo,
  SystemSettingsData,
} from "@/lib/system-settings";

type Payload = {
  settings: SystemSettingsData;
  environment: SystemEnvironmentInfo;
  emailProviderOptions: EmailProviderPreference[];
};

export function AdvancedSystemSettingsPanel() {
  const { t } = useI18n();
  const { toastSuccess, toastError } = useFeedback();
  const [settings, setSettings] = useState<SystemSettingsData | null>(null);
  const [environment, setEnvironment] = useState<SystemEnvironmentInfo | null>(
    null
  );
  const [providerOptions, setProviderOptions] = useState<
    EmailProviderPreference[]
  >(["auto"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/system-settings");
    const data = (await res.json()) as Payload & { error?: string };
    setLoading(false);
    if (!res.ok) {
      toastError(data.error || t("admin.systemSettings.loadFailed"));
      return;
    }
    setSettings(data.settings);
    setEnvironment(data.environment);
    setProviderOptions(data.emailProviderOptions ?? ["auto"]);
  }, [t, toastError]);

  useEffect(() => {
    load();
  }, [load]);

  function patch(partial: Partial<SystemSettingsData>) {
    setSettings((prev) => (prev ? { ...prev, ...partial } : prev));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    const res = await fetch("/api/admin/system-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toastError(data.error || t("admin.systemSettings.saveFailed"));
      return;
    }
    setSettings(data.settings);
    toastSuccess(t("admin.systemSettings.saved"));
  }

  if (loading || !settings) {
    return (
      <p className="text-sm text-bronze">{t("admin.systemSettings.loading")}</p>
    );
  }

  return (
    <form onSubmit={onSave} className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <SectionTitle
          icon={Globe}
          title={t("admin.systemSettings.brandingTitle")}
        />
        <p className="mb-4 text-xs text-bronze leading-relaxed">
          {t("admin.systemSettings.brandingIntro")}
        </p>
        <div className="space-y-4">
          <TextField
            label={t("admin.systemSettings.platformName")}
            value={settings.platformName}
            onChange={(e) => patch({ platformName: e.target.value })}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t("admin.systemSettings.supportEmail")}
              value={settings.supportEmail ?? ""}
              onChange={(e) =>
                patch({ supportEmail: e.target.value || null })
              }
              dir="ltr"
              className="text-left"
              type="email"
            />
            <TextField
              label={t("admin.systemSettings.supportPhone")}
              value={settings.supportPhone ?? ""}
              onChange={(e) =>
                patch({ supportPhone: e.target.value || null })
              }
              dir="ltr"
              className="text-left"
            />
          </div>
          <p className="text-xs text-bronze -mb-2">
            {t("admin.systemSettings.qrInstructionsHint")}
          </p>
          <TextAreaField
            label={t("admin.systemSettings.qrInstructions")}
            value={settings.qrInstructionsOverride ?? ""}
            onChange={(e) =>
              patch({ qrInstructionsOverride: e.target.value || null })
            }
            rows={3}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <SectionTitle
          icon={EnvelopeSimple}
          title={t("admin.systemSettings.notificationsTitle")}
        />
        <div className="space-y-3">
          <CheckboxField
            label={t("admin.systemSettings.notifyEmail")}
            description={t("admin.systemSettings.notifyEmailHint")}
            checked={settings.notifyEmailOnApprove}
            onChange={(v) => patch({ notifyEmailOnApprove: v })}
          />
          <CheckboxField
            label={t("admin.systemSettings.notifyWhatsApp")}
            checked={settings.notifyWhatsAppOnApprove}
            onChange={(v) => patch({ notifyWhatsAppOnApprove: v })}
          />
          <CheckboxField
            label={t("admin.systemSettings.notifySms")}
            description={t("admin.systemSettings.notifySmsHint")}
            checked={settings.notifySmsOnApprove}
            onChange={(v) => patch({ notifySmsOnApprove: v })}
          />
          <CheckboxField
            label={t("admin.systemSettings.smsFallback")}
            description={t("admin.systemSettings.smsFallbackHint")}
            checked={settings.smsWhenWhatsAppUnavailable}
            onChange={(v) => patch({ smsWhenWhatsAppUnavailable: v })}
          />
          <p className="text-xs text-bronze -mb-2">
            {t("admin.systemSettings.emailProviderHint")}
          </p>
          <SelectField
            label={t("admin.systemSettings.emailProvider")}
            value={settings.emailProviderPreference}
            onChange={(e) =>
              patch({
                emailProviderPreference: e.target
                  .value as EmailProviderPreference,
              })
            }
          >
            {providerOptions.map((opt) => (
              <option key={opt} value={opt}>
                {t(`admin.systemSettings.provider.${opt}`)}
              </option>
            ))}
          </SelectField>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <SectionTitle
          icon={GearSix}
          title={t("admin.systemSettings.registrationTitle")}
        />
        <div className="space-y-3">
          <CheckboxField
            label={t("admin.systemSettings.allowPublicRegistration")}
            checked={settings.allowPublicRegistration}
            onChange={(v) => patch({ allowPublicRegistration: v })}
          />
          <CheckboxField
            label={t("admin.systemSettings.maintenanceMode")}
            description={t("admin.systemSettings.maintenanceModeHint")}
            checked={settings.maintenanceMode}
            onChange={(v) => patch({ maintenanceMode: v })}
          />
          <TextAreaField
            label={t("admin.systemSettings.maintenanceMessage")}
            value={settings.maintenanceMessage ?? ""}
            onChange={(e) =>
              patch({ maintenanceMessage: e.target.value || null })
            }
            rows={2}
          />
          <CheckboxField
            label={t("admin.systemSettings.requireNotes")}
            checked={settings.requireRegistrationNotes}
            onChange={(v) => patch({ requireRegistrationNotes: v })}
          />
        </div>
      </section>

      {environment && (
        <section className="rounded-xl border border-dashed border-border bg-[#faf8f5] p-6">
          <SectionTitle
            icon={Database}
            title={t("admin.systemSettings.environmentTitle")}
          />
          <p className="mb-4 text-xs text-bronze">
            {t("admin.systemSettings.environmentIntro")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <EnvBadge
              label={t("admin.systemSettings.env.database")}
              ok={environment.databaseOk}
            />
            <EnvBadge
              label={t("admin.systemSettings.env.authSecret")}
              ok={environment.authSecretConfigured}
            />
            <EnvBadge
              label={t("admin.systemSettings.env.staffJwt")}
              ok={environment.staffJwtConfigured}
            />
            <EnvBadge
              label={t("admin.systemSettings.env.emailFrom")}
              ok={environment.emailFromConfigured}
            />
            <EnvBadge
              label={t("admin.systemSettings.env.twilio")}
              ok={environment.twilioConfigured}
            />
            <EnvBadge
              label={t("admin.systemSettings.env.nodeEnv")}
              ok={environment.nodeEnv === "production"}
              value={environment.nodeEnv}
            />
          </div>
          <div className="mt-4 space-y-3">
            <ReadOnlyField
              label={t("admin.systemSettings.env.appUrl")}
              value={environment.appUrl ?? "—"}
            />
            <ReadOnlyField
              label={t("admin.systemSettings.env.version")}
              value={environment.appVersion}
            />
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-bronze">
            <Cloud size={16} className="mt-0.5 shrink-0 text-gold-dark" aria-hidden />
            {t("admin.systemSettings.secretsNote")}
          </p>
        </section>
      )}

      <PrimaryFormButton icon={FloppyDisk} disabled={saving}>
        {saving
          ? t("admin.systemSettings.saving")
          : t("admin.systemSettings.save")}
      </PrimaryFormButton>
    </form>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<IconProps>;
  title: string;
}) {
  return (
    <h3 className="mb-3 inline-flex items-center gap-2 font-bold text-gold-dark">
      <Icon size={22} aria-hidden />
      {title}
    </h3>
  );
}

function EnvBadge({
  label,
  ok,
  value,
}: {
  label: string;
  ok: boolean;
  value?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
      <span className="text-gold-dark">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          ok ? "bg-green-100 text-green-900" : "bg-amber-100 text-amber-900"
        }`}
        dir={value ? "ltr" : undefined}
      >
        {value ?? (ok ? t("admin.settings.enabled") : t("admin.settings.disabled"))}
      </span>
    </div>
  );
}
