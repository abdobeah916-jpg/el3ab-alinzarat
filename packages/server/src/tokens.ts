import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
function secret() { return process.env.TOKEN_SECRET ?? "dev-secret"; }
export function createToken(): string { return randomBytes(32).toString("base64url"); }
export function hashToken(token: string): string { return createHmac("sha256", secret()).update(token).digest("hex"); }
export function verifyToken(token: string, hash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex"); const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
export function createRecoveryCode(): string {
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return code;
}
