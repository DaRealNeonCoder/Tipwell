import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";

const handlers = toNextJsHandler(auth);

export async function GET(request: Request) {
  getServerEnv();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  getServerEnv();
  return handlers.POST(request);
}
