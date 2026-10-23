import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", override: true, quiet: true });
config({ path: ".env", override: false, quiet: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/*.ts",
  out: "./drizzle",
  dbCredentials: {
    // Drizzle migrations need a direct Neon connection; the pooled URL is for app traffic.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});
