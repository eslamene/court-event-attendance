"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { TextField } from "@/components/ui/Field";
import { format } from "date-fns";

type EventRow = {
  id: string;
  name: string;
  date: string;
  slug: string;
  logoPath: string | null;
  isActive: boolean;
  registrationCount: number;
  registrationUrl: string;
};

export function EventsPanel() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [clearing, setClearing] = useState<EventRow | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/events");
    setEvents(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const date = form.get("date") as string;
    const logoFile = form.get("logo") as File | null;

    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, date }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "فشل الإنشاء");
      return;
    }

    if (logoFile && logoFile.size > 0) {
      const fd = new FormData();
      fd.append("logo", logoFile);
      await fetch(`/api/admin/events/${data.id}/logo`, {
        method: "POST",
        body: fd,
      });
    }

    setMessage(`تم إنشاء الفعالية. رابط التسجيل: ${data.registrationUrl}`);
    (e.target as HTMLFormElement).reset();
    load();
  }

  async function onUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    const form = new FormData(e.currentTarget);

    const res = await fetch(`/api/admin/events/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        date: form.get("date"),
        isActive: form.get("isActive") === "true",
        logoUrl: form.get("logoUrl") || "",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "فشل التحديث");
      return;
    }

    const logoFile = form.get("logo") as File | null;
    if (logoFile && logoFile.size > 0) {
      const fd = new FormData();
      fd.append("logo", logoFile);
      await fetch(`/api/admin/events/${editing.id}/logo`, {
        method: "POST",
        body: fd,
      });
    }

    setMessage("تم تحديث الفعالية");
    setEditing(null);
    load();
  }

  async function onClearData(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clearing) return;
    setError("");
    const form = new FormData(e.currentTarget);

    const res = await fetch(`/api/admin/events/${clearing.id}/clear-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminPassword: form.get("adminPassword"),
        confirmPhrase: form.get("confirmPhrase"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "فشل مسح البيانات");
      return;
    }

    setMessage(data.message || "تم مسح بيانات الفعالية");
    setClearing(null);
    load();
  }

  return (
    <div className="space-y-8">
      {message && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-success">{message}</p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-error">{error}</p>
      )}

      <form
        onSubmit={onCreate}
        className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <h2 className="font-bold text-gold-dark">إنشاء فعالية جديدة</h2>
        <TextField name="name" label="اسم الفعالية" required />
        <TextField name="date" label="تاريخ الفعالية" type="date" required />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-gold-dark">
            شعار / صورة الفعالية (اختياري)
          </span>
          <input
            type="file"
            name="logo"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="w-full text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-gold-dark px-6 py-2.5 text-white hover:bg-bronze"
        >
          إنشاء
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-[#f5f0e8] text-gold-dark">
            <tr>
              <th className="px-4 py-3 text-right">الشعار</th>
              <th className="px-4 py-3 text-right">الفعالية</th>
              <th className="px-4 py-3 text-right">التاريخ</th>
              <th className="px-4 py-3 text-right">التسجيلات</th>
              <th className="px-4 py-3 text-right">الحالة</th>
              <th className="px-4 py-3 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  جاري التحميل...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-bronze">
                  لا توجد فعاليات
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <EventLogoThumb path={ev.logoPath} name={ev.name} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{ev.name}</div>
                    <a
                      href={ev.registrationUrl}
                      className="text-xs text-gold-dark underline"
                      target="_blank"
                      rel="noreferrer"
                      dir="ltr"
                    >
                      /register/{ev.slug}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {format(new Date(ev.date), "yyyy-MM-dd")}
                  </td>
                  <td className="px-4 py-3">{ev.registrationCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${ev.isActive ? "bg-green-100 text-green-900" : "bg-gray-100 text-gray-700"}`}
                    >
                      {ev.isActive ? "نشطة" : "متوقفة"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(ev);
                          setClearing(null);
                          setError("");
                        }}
                        className="rounded border border-border px-2 py-1 text-xs hover:bg-[#f5f0e8]"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setClearing(ev);
                          setEditing(null);
                          setError("");
                        }}
                        className="rounded border border-error/40 px-2 py-1 text-xs text-error hover:bg-red-50"
                      >
                        مسح البيانات
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={`تعديل: ${editing.name}`} onClose={() => setEditing(null)}>
          <form onSubmit={onUpdate} className="space-y-4">
            <TextField
              name="name"
              label="اسم الفعالية"
              defaultValue={editing.name}
              required
            />
            <TextField
              name="date"
              label="تاريخ الفعالية"
              type="date"
              defaultValue={format(new Date(editing.date), "yyyy-MM-dd")}
              required
            />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gold-dark">الحالة</span>
              <select
                name="isActive"
                defaultValue={editing.isActive ? "true" : "false"}
                className="w-full rounded-lg border border-border px-4 py-2.5"
              >
                <option value="true">نشطة — التسجيل مفتوح</option>
                <option value="false">متوقفة — إخفاء نموذج التسجيل</option>
              </select>
            </label>
            <TextField
              name="logoUrl"
              label="رابط شعار (اختياري — URL)"
              defaultValue={
                editing.logoPath?.startsWith("http") ? editing.logoPath : ""
              }
              dir="ltr"
              className="text-left"
            />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-gold-dark">
                أو رفع صورة جديدة
              </span>
              <input
                type="file"
                name="logo"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="w-full text-sm"
              />
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-xl bg-gold-dark px-6 py-2.5 text-white"
              >
                حفظ
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-xl border border-border px-6 py-2.5"
              >
                إلغاء
              </button>
            </div>
          </form>
        </Modal>
      )}

      {clearing && (
        <Modal
          title={`مسح بيانات: ${clearing.name}`}
          onClose={() => setClearing(null)}
        >
          <p className="mb-4 text-sm text-error">
            سيتم حذف جميع التسجيلات وسجلات المسح لهذه الفعالية ({clearing.registrationCount}{" "}
            تسجيل). لا يمكن التراجع. يلزم كلمة مرور <strong>مدير النظام</strong>.
          </p>
          <form onSubmit={onClearData} className="space-y-4">
            <TextField
              name="adminPassword"
              label="كلمة مرور المدير"
              type="password"
              required
              dir="ltr"
              className="text-left"
            />
            <TextField
              name="confirmPhrase"
              label='اكتب "مسح البيانات" للتأكيد'
              required
              placeholder="مسح البيانات"
            />
            <button
              type="submit"
              className="rounded-xl bg-error px-6 py-2.5 text-white"
            >
              مسح كل البيانات
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function EventLogoThumb({
  path,
  name,
}: {
  path: string | null;
  name: string;
}) {
  const src = path || "/logo.jpeg";
  return (
    <Image
      src={src}
      alt={name}
      width={48}
      height={48}
      className="rounded-full object-cover"
      unoptimized={src.startsWith("http")}
    />
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-gold-dark">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-bronze hover:text-foreground"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
