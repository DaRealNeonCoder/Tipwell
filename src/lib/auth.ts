import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import * as authSchema from "@/db/auth-schema";
import { db } from "@/db";

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  user: {
    additionalFields: {
      stripeCustomerId: {
        type: "string",
        required: false,
        unique: true,
        input: false,
        returned: false,
      },
    },
  },
  // Server entry points validate the real secret before handling requests.
  // A per-process fallback only prevents Next.js build-time route collection
  // from initializing Better Auth with its own insecure default.
  secret: process.env.BETTER_AUTH_SECRET ?? `${crypto.randomUUID()}${crypto.randomUUID()}`,
  emailAndPassword: {
    enabled: true,
  },
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),
  plugins: [nextCookies()],
});
