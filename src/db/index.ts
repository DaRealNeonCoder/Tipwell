import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { getServerEnv } from "@/lib/env";

export type Database = ReturnType<typeof createDatabase>;

function createDatabase() {
  const sql = neon(getServerEnv().DATABASE_URL);
  return drizzle({ client: sql, schema });
}

let database: Database | undefined;

/** Create the Neon HTTP client only when a server request actually needs it. */
export function getDb(): Database {
  database ??= createDatabase();
  return database;
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const value = Reflect.get(getDb(), property);
    return typeof value === "function" ? value.bind(getDb()) : value;
  },
});
