import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { SiteHeader } from "@/components/app/site-header";
import { DemoProvider } from "@/components/demo/demo-provider";
import { isDemoMode } from "@/lib/mode";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Newsreader({ variable: "--font-serif-display", subsets: ["latin"], style: ["normal", "italic"] });

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
      <body className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} min-h-dvh font-sans`}>
        {isDemoMode() ? (
          <DemoProvider>{children}</DemoProvider>
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
