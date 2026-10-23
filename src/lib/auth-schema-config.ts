import { betterAuth } from "better-auth";

// The Better Auth CLI loads this small, database-free config to generate the
// vendor-owned core schema. Runtime configuration lives in ./auth.ts.
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  emailAndPassword: { enabled: true },
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
});
