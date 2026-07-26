import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash || !hash.startsWith("scrypt:")) return false;
  const [, salt, storedHex] = hash.split(":");
  if (!salt || !storedHex) return false;

  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  const stored = Buffer.from(storedHex, "hex");
  if (derived.length !== stored.length) return false;
  return timingSafeEqual(derived, stored);
}
