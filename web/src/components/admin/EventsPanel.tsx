"use client";

import { FormEvent, useEffect, useState } from "react";
import { TextField } from "@/components/ui/Field";
import { format } from "date-fns";

type EventRow = {
  id: string;
  name: string;
  date: string;
  slug: string;
  isActive: boolean;
  registrationCount: number;
};

export function EventsPanel() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createdUrl, setCreatedUrl] = useState("");

  async function load() {
    const res = await fetch("/api/admin/events");
    setEvents(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        date: form.get("date"),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setCreatedUrl(data.registrationUrl);
      (e.target as HTMLFormElement).reset();
      load();
    }
  }

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <div className="space-y-8">
      <form
        onSubmit={onCreate}
        className="max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <h2 className="font-bold text-gold-dark">إنشاء فعالية جديدة</h2>
        <TextField name="name" label="اسم الفعالية" required />
        <TextField name="date" label="تاريخ الفعالية" type="date" required />
        <button
          type="submit"
          className="rounded-xl bg-gold-dark px-6 py-2.5 text-white hover:bg-bronze"
        >
          إنشاء
        </button>
        {createdUrl && (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-success">
            تم الإنشاء. رابط التسجيل:{" "}
            <a href={createdUrl} className="underline" dir="ltr">
              {createdUrl}
            </a>
          </p>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#f5f0e8] text-gold-dark">
            <tr>
              <th className="px-4 py-3 text-right">الفعالية</th>
              <th className="px-4 py-3 text-right">التاريخ</th>
              <th className="px-4 py-3 text-right">التسجيلات</th>
              <th className="px-4 py-3 text-right">رابط التسجيل</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center">
                  جاري التحميل...
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{e.name}</td>
                  <td className="px-4 py-3">
                    {format(new Date(e.date), "yyyy-MM-dd")}
                  </td>
                  <td className="px-4 py-3">{e.registrationCount}</td>
                  <td className="px-4 py-3" dir="ltr">
                    <a
                      href={`${baseUrl}/register/${e.slug}`}
                      className="text-gold-dark underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      /register/{e.slug}
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
