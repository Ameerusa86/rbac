import "server-only";
import path from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";

if (!process.env.DATABASE_URL) {
  config({
    path: [
      path.join(process.cwd(), ".env.local"),
      path.join(process.cwd(), ".env"),
    ],
  });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

const adapter = new PrismaMssql(process.env.DATABASE_URL);

declare global {
  var __prisma: PrismaClient | undefined;
}

export const db =
  globalThis.__prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = db;
}
