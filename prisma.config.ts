import { defineConfig } from "prisma/config";
import { configDotenv } from "dotenv";
import path from "path";

// Prisma CLI não carrega .env.local automaticamente
configDotenv({ path: path.resolve(process.cwd(), ".env.local") });
configDotenv({ path: path.resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL!,
  },
});
