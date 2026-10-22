import { z } from "zod";

const serverEnvSchema = z
  .object({
    DATABASE_URL: z.url("DATABASE_URL must be a valid URL."),
    BETTER_AUTH_SECRET: z.string().trim().min(32, "BETTER_AUTH_SECRET must be at least 32 characters."),
    BETTER_AUTH_URL: z.url("BETTER_AUTH_URL must be a valid URL."),
    GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().trim().min(1).optional(),
  })
  .refine(
    ({ GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET }) => Boolean(GOOGLE_CLIENT_ID) === Boolean(GOOGLE_CLIENT_SECRET),
    { message: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be provided together.", path: ["GOOGLE_CLIENT_ID"] },
  );

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function readServerEnv(): Record<string, string | undefined> {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
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
