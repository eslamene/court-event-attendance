"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
} from "react";
import Image from "next/image";
import {
  CircleNotch,
  Image as ImageIcon,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import {
  EVENT_LOGO_ACCEPT,
  EVENT_LOGO_ALLOWED_TYPES,
  EVENT_LOGO_MAX_BYTES,
} from "@/lib/event-logo-constants";
import { PLATFORM_LOGO_PATH } from "@/lib/platform-logo";
import { cn } from "@/lib/utils";

type Props = {
  label?: string;
  eventId?: string;
  currentLogoUrl?: string | null;
  onLogoChange?: (logoPath: string | null) => void;
  /** For create flow: file is uploaded after the event exists */
  onPendingFile?: (file: File | null) => void;
  disabled?: boolean;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EventLogoUploader({
  label,
  eventId,
  currentLogoUrl,
  onLogoChange,
  onPendingFile,
  disabled = false,
}: Props) {
  const { t } = useI18n();
  const { toastSuccess, toastError } = useFeedback();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localLogoUrl, setLocalLogoUrl] = useState<string | null>(
    currentLogoUrl ?? null
  );
  const [pendingFile, setPendingFile] = useState<{
    name: string;
    size: number;
  } | null>(null);

  useEffect(() => {
    setLocalLogoUrl(currentLogoUrl ?? null);
  }, [currentLogoUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displaySrc = previewUrl ?? localLogoUrl ?? PLATFORM_LOGO_PATH;
  const hasCustomLogo = Boolean(previewUrl || localLogoUrl);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!EVENT_LOGO_ALLOWED_TYPES.has(file.type)) {
        return t("api.unsupportedFileType");
      }
      if (file.size > EVENT_LOGO_MAX_BYTES) {
        return t("api.fileTooLarge");
      }
      return null;
    },
    [t]
  );

  const setPreviewFromFile = useCallback((file: File | null) => {
    setPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setPendingFile(
      file ? { name: file.name, size: file.size } : null
    );
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!eventId) return false;
      setUploading(true);
      setError("");
      const fd = new FormData();
      fd.append("logo", file);
      try {
        const res = await fetch(`/api/admin/events/${eventId}/logo`, {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          const msg = data.error || t("admin.events.logoUploadFailed");
          setError(msg);
          toastError(msg);
          return false;
        }
        setPreviewFromFile(null);
        setLocalLogoUrl(data.logoPath ?? null);
        onLogoChange?.(data.logoPath ?? null);
        onPendingFile?.(null);
        toastSuccess(t("admin.events.logoUploaded"));
        return true;
      } catch {
        const msg = t("admin.events.logoUploadFailed");
        setError(msg);
        toastError(msg);
        return false;
      } finally {
        setUploading(false);
      }
    },
    [eventId, onLogoChange, onPendingFile, setPreviewFromFile, t, toastError, toastSuccess]
  );

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file || disabled || processingRef.current) return;
      processingRef.current = true;
      try {
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          toastError(validationError);
          return;
        }
        setError("");
        setPreviewFromFile(file);
        if (eventId) {
          await uploadFile(file);
        } else {
          onPendingFile?.(file);
        }
      } finally {
        processingRef.current = false;
      }
    },
    [
      disabled,
      eventId,
      onPendingFile,
      setPreviewFromFile,
      toastError,
      uploadFile,
      validateFile,
    ]
  );

  async function removeLogo() {
    if (disabled || uploading) return;
    setError("");
    setPreviewFromFile(null);
    onPendingFile?.(null);
    if (inputRef.current) inputRef.current.value = "";

    if (!eventId) {
      setLocalLogoUrl(null);
      onLogoChange?.(null);
      return;
    }

    setUploading(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/logo`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        const msg = data.error || t("admin.events.logoRemoveFailed");
        setError(msg);
        toastError(msg);
        return;
      }
      setLocalLogoUrl(null);
      onLogoChange?.(null);
      toastSuccess(t("admin.events.logoRemoved"));
    } catch {
      const msg = t("admin.events.logoRemoveFailed");
      setError(msg);
      toastError(msg);
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    void handleFile(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    void handleFile(file ?? null);
  }

  return (
    <div className="space-y-2">
      {label && (
        <span className="text-sm font-medium text-gold-dark">{label}</span>
      )}

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOver(false);
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          "relative flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-5 transition sm:flex-row sm:items-start",
          dragOver
            ? "border-gold bg-[#f5f0e8]"
            : "border-border bg-[#faf8f5]",
          (disabled || uploading) && "pointer-events-none opacity-60"
        )}
      >
        <div className="relative shrink-0">
          <div className="size-24 overflow-hidden rounded-full border-2 border-border bg-card shadow-sm ring-2 ring-gold/10">
            <Image
              src={displaySrc}
              alt=""
              width={96}
              height={96}
              className="size-full object-cover"
              unoptimized={
                displaySrc.startsWith("blob:") || displaySrc.startsWith("http")
              }
            />
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
              <CircleNotch
                size={28}
                className="animate-spin text-white"
                aria-hidden
              />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3 text-center sm:text-start">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gold-dark">
              {dragOver
                ? t("admin.events.logoDropHere")
                : t("admin.events.logoDropzone")}
            </p>
            <p className="text-xs text-bronze">{t("admin.events.logoConstraints")}</p>
            {pendingFile && (
              <p className="truncate text-xs text-bronze" dir="ltr">
                {pendingFile.name}
                <span className="mx-1 text-gold-dark">
                  · {formatFileSize(pendingFile.size)}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gold-dark px-3 py-2 text-sm font-medium text-white transition hover:bg-bronze"
            >
              <UploadSimple size={18} weight="bold" aria-hidden />
              {t("admin.events.logoChoose")}
            </button>
            {hasCustomLogo && (
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => void removeLogo()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-error/40 px-3 py-2 text-sm font-medium text-error transition hover:bg-red-50"
              >
                <Trash size={18} aria-hidden />
                {t("admin.events.logoRemove")}
              </button>
            )}
          </div>

          {!eventId && (
            <p className="inline-flex items-center gap-1 text-xs text-bronze">
              <ImageIcon size={14} aria-hidden />
              {t("admin.events.logoUploadOnSave")}
            </p>
          )}
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={EVENT_LOGO_ACCEPT}
          className="sr-only"
          disabled={disabled || uploading}
          onChange={onInputChange}
        />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
