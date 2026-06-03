"use client";

import Link from "next/link";
import { SignIn } from "@phosphor-icons/react";

export function AdminLoginLink({ label }: { label: string }) {
  return (
    <Link
      href="/admin/login"
      className="inline-flex items-center justify-center gap-1.5 underline hover:text-gold-dark"
    >
      <SignIn size={18} aria-hidden />
      {label}
    </Link>
  );
}
