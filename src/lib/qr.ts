import "server-only";
import QRCode from "qrcode";

/** Inline SVG QR code for a URL (generated server-side; safe to inline). */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#111827", light: "#ffffff" } });
}
