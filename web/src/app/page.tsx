import Link from "next/link";
import { LogoHeader } from "@/components/LogoHeader";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <LogoHeader subtitle="اليوبيل الذهبي للنيابة العامة لدى محكمة النقض" />
      <section className="mx-auto max-w-lg px-6 py-16 text-center">
        <p className="mb-8 text-bronze leading-relaxed">
          مرحباً بكم في نظام تسجيل حضور الفعاليات. يرجى استخدام رابط التسجيل
          المخصص للفعالية المرسل إليكم.
        </p>
        <Link
          href="/register/golden-jubilee-2026"
          className="inline-block rounded-xl bg-gold-dark px-8 py-3 font-semibold text-white shadow transition hover:bg-bronze"
        >
          نموذج تسجيل تجريبي
        </Link>
        <p className="mt-6 text-sm text-bronze">
          <Link href="/admin/login" className="underline hover:text-gold-dark">
            دخول الإدارة
          </Link>
        </p>
      </section>
    </main>
  );
}
