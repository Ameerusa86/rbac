import "server-only";
import path from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  config({ path: path.join(process.cwd(), ".env.local") });
}

declare global {
  var __prisma: PrismaClient | undefined;
}

export const db =
  globalThis.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db;
}
