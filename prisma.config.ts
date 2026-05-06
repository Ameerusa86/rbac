import path from "node:path";
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({
  path: [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), ".env"),
  ],
});

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
