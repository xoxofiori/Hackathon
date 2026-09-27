import type { DemoVersion } from "./types";

/** Two 32-bit FNV-1a passes → 16 hex chars. Deterministic and synchronous (fine for tamper-evidence in a demo). */
function fnv1a(text: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** Hash of a version's signable content (item, version number, wording, owner, date, strength, amount). */
export function hashVersion(
  itemId: string,
  v: Pick<DemoVersion, "version" | "wording" | "ownerSide" | "due" | "strength" | "amount" | "currency">,
): string {
  const text = JSON.stringify([itemId, v.version, v.wording, v.ownerSide, v.due, v.strength, v.amount, v.currency]);
  return fnv1a(text, 0x811c9dc5) + fnv1a(text, 0x01234567);
}
