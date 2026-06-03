"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  CheckCircle,
  Info,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useI18n } from "@/components/I18nProvider";
import { TextField } from "@/components/ui/Field";
import {
  CancelFormButton,
  DangerFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PromptOptions = {
  title: string;
  message?: string;
  label: string;
  confirmLabel?: string;
  type?: "text" | "password";
  minLength?: number;
  invalidMessage?: string;
};

type FeedbackContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
  toastSuccess: (message: string) => void;
  toastError: (message: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const TOAST_DURATION_MS = 5000;

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const uid = useId();
  const toastCounter = useRef(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null);
  const [promptState, setPromptState] = useState<
    (PromptOptions & { resolve: (value: string | null) => void }) | null
  >(null);
  const [promptValue, setPromptValue] = useState("");
  const [promptError, setPromptError] = useState("");

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = `${uid}-toast-${++toastCounter.current}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    },
    [dismissToast, uid]
  );

  const toastSuccess = useCallback(
    (message: string) => toast(message, "success"),
    [toast]
  );
  const toastError = useCallback(
    (message: string) => toast(message, "error"),
    [toast]
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...options, resolve });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptValue("");
      setPromptError("");
      setPromptState({ ...options, resolve });
    });
  }, []);

  useEffect(() => {
    if (!confirmState && !promptState) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [confirmState, promptState]);

  function closeConfirm(result: boolean) {
    confirmState?.resolve(result);
    setConfirmState(null);
  }

  function closePrompt(result: string | null) {
    promptState?.resolve(result);
    setPromptState(null);
    setPromptValue("");
    setPromptError("");
  }

  function submitPrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!promptState) return;
    const value = promptValue.trim();
    const min = promptState.minLength ?? 0;
    if (value.length < min) {
      setPromptError(
        promptState.invalidMessage ??
          t("validation.passwordMin")
      );
      return;
    }
    closePrompt(value);
  }

  return (
    <FeedbackContext.Provider
      value={{ toast, toastSuccess, toastError, confirm, prompt }}
    >
      {children}

      <div
        className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:start-4 sm:items-start"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((item) => (
          <ToastCard
            key={item.id}
            item={item}
            onDismiss={() => dismissToast(item.id)}
          />
        ))}
      </div>

      {confirmState && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          onClick={() => closeConfirm(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gold-dark">{confirmState.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              {confirmState.message}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <CancelFormButton
                type="button"
                onClick={() => closeConfirm(false)}
              >
                {confirmState.cancelLabel ?? t("admin.common.cancel")}
              </CancelFormButton>
              {confirmState.destructive ? (
                <DangerFormButton
                  type="button"
                  onClick={() => closeConfirm(true)}
                >
                  {confirmState.confirmLabel ?? t("admin.common.confirm")}
                </DangerFormButton>
              ) : (
                <PrimaryFormButton
                  type="button"
                  onClick={() => closeConfirm(true)}
                >
                  {confirmState.confirmLabel ?? t("admin.common.confirm")}
                </PrimaryFormButton>
              )}
            </div>
          </div>
        </div>
      )}

      {promptState && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => closePrompt(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-gold-dark">{promptState.title}</h3>
            {promptState.message && (
              <p className="mt-2 text-sm text-bronze">{promptState.message}</p>
            )}
            <form onSubmit={submitPrompt} className="mt-4 space-y-4">
              <TextField
                label={promptState.label}
                name="promptValue"
                type={promptState.type ?? "text"}
                value={promptValue}
                onChange={(e) => {
                  setPromptValue(e.target.value);
                  setPromptError("");
                }}
                dir="ltr"
                className="text-left"
                autoFocus
                required
                minLength={promptState.minLength}
              />
              {promptError && (
                <p className="text-sm text-error">{promptError}</p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <CancelFormButton
                  type="button"
                  onClick={() => closePrompt(null)}
                >
                  {t("admin.common.cancel")}
                </CancelFormButton>
                <PrimaryFormButton type="submit">
                  {promptState.confirmLabel ?? t("admin.common.confirm")}
                </PrimaryFormButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const styles: Record<ToastVariant, string> = {
    success: "border-success/30 bg-green-50 text-green-900",
    error: "border-error/30 bg-red-50 text-red-900",
    info: "border-border bg-card text-foreground",
  };

  const icons: Record<ToastVariant, typeof CheckCircle> = {
    success: CheckCircle,
    error: WarningCircle,
    info: Info,
  };

  const Icon = icons[item.variant];

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${styles[item.variant]}`}
    >
      <Icon
        size={22}
        weight="duotone"
        className="mt-0.5 shrink-0"
        aria-hidden
      />
      <p className="flex-1 text-sm leading-relaxed">{item.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-1 opacity-70 hover:opacity-100"
        aria-label="Close"
      >
        <X size={18} aria-hidden />
      </button>
    </div>
  );
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useFeedback must be used within FeedbackProvider");
  }
  return ctx;
}
