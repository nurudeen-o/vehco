import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const useRemote = process.env.USE_REMOTE_TURSO === "true";
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  // Only connect directly to Turso if explicitly enabled (e.g. for cloud web deploy)
  if (useRemote && tursoUrl && tursoUrl.startsWith("libsql") && tursoToken) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaLibSQL } = require("@prisma/adapter-libsql") as typeof import("@prisma/adapter-libsql");

    const adapter = new PrismaLibSQL({
      url: tursoUrl,
      authToken: tursoToken,
    });

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  // Local-first SQLite: default for desktop app and local offline use
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const existing = globalForPrisma.prisma;
// Invalidate stale Prisma instance in dev mode if schema has added new models
const isStale =
  existing &&
  (!(existing as any).contactMessage || !(existing as any).syncConflict);

export const prisma = existing && !isStale ? existing : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
