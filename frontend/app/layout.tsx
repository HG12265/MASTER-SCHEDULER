import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "MASTER SCHEDULER | Smart Scheduling. Zero Conflicts.",
  description: "Automated academic timetable management system for university departments.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 text-slate-800 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
