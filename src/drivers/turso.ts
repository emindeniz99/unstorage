import { createRequiredError, defineDriver } from "./utils";
import { createClient } from "@libsql/client";
import type { Client, Config } from "@libsql/client";

export interface TursoOptions extends Partial<Config> {
  /**
   * Optional prefix to use for all keys. Can be used for namespacing.
   */
  base?: string;

  /**
   * Table name to use for storage (default: 'kv')
   */
  table?: string;

  /**
   * Version of the driver, used for compatibility checks.
   * @default "1"
   */
  version: "1";
}

const DRIVER_NAME = "turso";

export async function initTursoTableIfNotExists(client: Client, table = "kv") {
  if (!/^\w+$/.test(table)) {
    throw new Error("Invalid table name");
  }
  await client.execute(
    `CREATE TABLE IF NOT EXISTS ${table} (key TEXT PRIMARY KEY, value TEXT)`
  );
}

export async function dropTursoTableIfExists(client: Client, table = "kv") {
  if (!/^\w+$/.test(table)) {
    throw new Error("Invalid table name");
  }
  await client.execute(`DROP TABLE IF EXISTS ${table}`);
}

function getFullKey(base: string | undefined, key: string) {
  return base ? `${base}:${key}` : key;
}

export default defineDriver<TursoOptions, Client>((options: TursoOptions) => {
  const table = options.table || "kv";
  if (!/^\w+$/.test(table)) {
    throw new Error("Invalid table name");
  }

  let tursoClient: Client | null;
  const getClient = () => {
    if (tursoClient) {
      return tursoClient;
    }
    const { url, authToken, ...rest } = options;
    const clientUrl = url || globalThis.process?.env?.TURSO_DATABASE_URL;
    const clientToken = authToken || globalThis.process?.env?.TURSO_AUTH_TOKEN;
    if (!clientUrl) {
      throw createRequiredError(DRIVER_NAME, "url");
    }
    tursoClient = createClient({
      url: clientUrl,
      authToken: clientToken,
      ...rest,
    });
    return tursoClient;
  };

  return {
    name: DRIVER_NAME,
    options,
    flags: {
      ttl: false,
      maxDepth: false,
    },
    getInstance: getClient,
    async hasItem(key: string) {
      const client = getClient();
      const fullKey = getFullKey(options.base, key);
      const result = await client.execute({
        sql: `SELECT EXISTS (SELECT 1 FROM ${table} WHERE key = :key) AS value`,
        args: { key: fullKey },
      });
      return result.rows?.[0]?.value == "1";
    },
    async getItem(key: string) {
      const client = getClient();
      const fullKey = getFullKey(options.base, key);
      const result = await client.execute({
        sql: `SELECT value FROM ${table} WHERE key = :key`,
        args: { key: fullKey },
      });
      return result.rows?.[0]?.value ?? null;
    },
    async setItem(key: string, value: string, _tOptions?: { ttl?: number }) {
      const client = getClient();
      const fullKey = getFullKey(options.base, key);
      await client.execute({
        sql: `INSERT INTO ${table} (key, value) VALUES (:key, :value) ON CONFLICT(key) DO UPDATE SET value = :value`,
        args: { key: fullKey, value },
      });
    },
    async removeItem(key: string) {
      const client = getClient();
      const fullKey = getFullKey(options.base, key);
      await client.execute({
        sql: `DELETE FROM ${table} WHERE key = :key`,
        args: { key: fullKey },
      });
    },
    async getKeys(base = "") {
      const client = getClient();
      const prefix = options.base ? `${options.base}:` : "";
      const result = await client.execute({
        sql: `SELECT key FROM ${table} WHERE key LIKE :base`,
        args: { base: prefix + base + "%" },
      });
      const keys = result.rows?.map((r: any) => r.key) ?? [];
      const baseLength = options.base ? options.base.length : 0;
      return baseLength ? keys.map((key) => key.slice(baseLength + 1)) : keys;
    },
    async clear(base = "") {
      const client = getClient();
      const prefix = options.base ? `${options.base}:` : "";
      await client.execute({
        sql: `DELETE FROM ${table} WHERE key LIKE :base`,
        args: { base: prefix + base + "%" },
      });
    },
    dispose() {
      const client = getClient();
      tursoClient = null;
      client.close();
    },
  };
});
