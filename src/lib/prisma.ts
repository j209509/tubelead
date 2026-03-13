import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Set a PostgreSQL connection string in your local .env and in Vercel Environment Variables.",
    );
  }

  if (process.env.VERCEL && databaseUrl.startsWith("file:")) {
    throw new Error("Vercel does not support SQLite file databases for this app. Set DATABASE_URL to PostgreSQL.");
  }

  return databaseUrl;
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
