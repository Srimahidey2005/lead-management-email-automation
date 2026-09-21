import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { isDemoMode } from "@/lib/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { Providers } from "@/components/layout/Providers";

export const metadata: Metadata = {
  title: "Lead Management & Export",
  description: "Internship Assignment",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read env at request time so demo mode always reflects the current configuration.
  await connection();
  const demoMode = isDemoMode();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex text-slate-900 bg-slate-50">
        <Providers demoMode={demoMode}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
