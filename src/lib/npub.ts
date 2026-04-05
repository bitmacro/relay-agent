import { bech32 } from "bech32";

const HEX64 = /^[0-9a-f]{64}$/;

/** Encode lowercase hex pubkey (64 chars) to bech32 npub. */
export function hexToNpub(hex: string): string {
  const pk = hex.trim().toLowerCase();
  if (!HEX64.test(pk)) throw new Error("invalid pubkey");
  const buf = Buffer.from(pk, "hex");
  const words = bech32.toWords(buf);
  return bech32.encode("npub", words);
}

/** Safe single-line comment prefix for whitelist.txt (no newlines / leading #). */
export function sanitizeWhitelistLabel(raw: string): string {
  return raw
    .replace(/[\r\n#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}
