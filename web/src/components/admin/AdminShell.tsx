"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { USER_ROLE_LABELS } from "@/lib/constants";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between border-b border-border bg-card px-6 py-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Image src="/logo.jpeg" alt="" width={48} height={48} className="rounded-full" />
          <div>
            <p className="font-bold text-gold-dark">لوحة الإدارة</p>
            <p className="text-xs text-bronze">
              {session?.user?.name} —{" "}
              {USER_ROLE_LABELS[session?.user?.role ?? ""] ?? session?.user?.role}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm hover:text-gold-dark">
            التسجيلات
          </Link>
          {session?.user?.role === "ADMIN" && (
            <>
              <Link href="/admin/events" className="text-sm hover:text-gold-dark">
                الفعاليات
              </Link>
              <Link href="/admin/users" className="text-sm hover:text-gold-dark">
                المستخدمون
              </Link>
              <Link href="/admin/settings" className="text-sm hover:text-gold-dark">
                الإشعارات
              </Link>
            </>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-[#f5f0e8]"
          >
            خروج
          </button>
        </div>
      </nav>
      <div className="mx-auto max-w-7xl px-4 py-8">{children}</div>
    </div>
  );
}
