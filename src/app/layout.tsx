import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/app/site-header";
import { DemoHeader } from "@/components/demo/demo-header";
import { DemoProvider } from "@/components/demo/demo-provider";
import { isDemoMode } from "@/lib/mode";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Accord — partnership meeting intelligence", template: "%s · Accord" },
  description:
    "Listen to partnership meetings, catch ambiguity before it's agreed, turn agreements into signed commitments, and track what each side owes.",
  applicationName: "Accord",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1c22" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh font-sans`}>
        {isDemoMode() ? (
          <DemoProvider>
            <DemoHeader />
            {children}
          </DemoProvider>
        ) : (
          <>
            <SiteHeader />
            {children}
          </>
        )}
      </body>
    </html>
  );
}
