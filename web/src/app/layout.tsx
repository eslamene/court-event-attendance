import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_Arabic({
  variable: "--font-noto",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "تسجيل حضور الفعاليات | محكمة النقض",
  description: "نظام تسجيل حضور القضاة والنيابة لفعاليات محكمة النقض",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${noto.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
