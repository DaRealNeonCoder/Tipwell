import { config } from "dotenv";
import { z } from "zod";

// Next.js preserves empty inherited environment variables, which can mask a
// value provisioned into .env.local by Neon. Keep real deployment variables
// authoritative while treating an empty inherited value as unset locally.
const localEnv = config({ path: ".env.local", processEnv: {}, quiet: true }).parsed ?? {};

export function getEnvValue(key: string): string | undefined {
  return process.env[key] || localEnv[key];
}

const serverEnvSchema = z
  .object({
    DATABASE_URL: z.url("DATABASE_URL must be a valid URL."),
    BETTER_AUTH_SECRET: z.string().trim().min(32, "BETTER_AUTH_SECRET must be at least 32 characters."),
    BETTER_AUTH_URL: z.url("BETTER_AUTH_URL must be a valid URL."),
    GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().trim().min(1).optional(),
    STRIPE_SECRET_KEY: z.string().trim().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().trim().min(1).optional(),
    STRIPE_PRO_PRICE_ID: z.string().trim().min(1).optional(),
  })
  .refine(
    ({ GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET }) => Boolean(GOOGLE_CLIENT_ID) === Boolean(GOOGLE_CLIENT_SECRET),
    { message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be provided together.", path: ["GOOGLE_CLIENT_ID"] },
  );

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function readServerEnv(): Record<string, string | undefined> {
  return {
    // Neon provides a pooled URL for app traffic and an unpooled fallback for
    // environments where pooling is not enabled.
    DATABASE_URL: getEnvValue("DATABASE_URL") || getEnvValue("DATABASE_URL_UNPOOLED"),
    BETTER_AUTH_SECRET: getEnvValue("BETTER_AUTH_SECRET"),
    BETTER_AUTH_URL: getEnvValue("BETTER_AUTH_URL") ?? "http://localhost:3000",
    GOOGLE_CLIENT_ID: getEnvValue("GOOGLE_CLIENT_ID"),
    GOOGLE_CLIENT_SECRET: getEnvValue("GOOGLE_CLIENT_SECRET"),
    STRIPE_SECRET_KEY: getEnvValue("STRIPE_SECRET_KEY"),
    STRIPE_WEBHOOK_SECRET: getEnvValue("STRIPE_WEBHOOK_SECRET"),
    STRIPE_PRO_PRICE_ID: getEnvValue("STRIPE_PRO_PRICE_ID"),
  };
}

/** Validate server configuration without ever including secret values in errors. */
export function getServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse(readServerEnv());
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".") || "environment").join(", ");
    throw new Error(`Invalid server configuration. Check: ${fields}.`);
  }
  return result.data;
}
