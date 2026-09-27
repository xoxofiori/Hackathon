import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";

/** Absolute base URL of the current deployment (for invite links and QR codes). */
export async function baseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return env.siteUrl;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
