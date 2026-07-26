import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  // Production / remote: use Turso via libSQL driver adapter.
  // Only activate when both a libsql URL and an auth token are present.
  if (tursoUrl && tursoUrl.startsWith("libsql") && tursoToken) {
    // Lazy require so local SQLite builds work without adapter packages at import time
    // when env is not set. Packages are still installed for deploy.
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

  // Local development: file SQLite via DATABASE_URL
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
