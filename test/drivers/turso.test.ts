import { afterAll, beforeAll, describe } from "vitest";
import { testDriver } from "./utils";
import tursoDriver, {
  dropTursoTableIfExists,
  initTursoTableIfNotExists,
} from "../../src/drivers/turso";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";

const url = process.env.VITE_TURSO_DATABASE_URL;
const token = process.env.VITE_TURSO_AUTH_TOKEN;
const skipEnv = !url || !token;
if (skipEnv) {
  console.warn(
    "Skipping Turso tests: missing VITE_TURSO_DATABASE_URL or VITE_TURSO_AUTH_TOKEN."
  );
}
const baseConfigs = [undefined, "", "namespace1", "user:123", "custom/base"];
async function resetTursoTable(driver: any, tableName: string | undefined) {
  if (typeof driver.getInstance === "function") {
    await dropTursoTableIfExists(driver.getInstance(), tableName);
    await initTursoTableIfNotExists(driver.getInstance(), tableName);
  }
}
for (const base of baseConfigs) {
  const tableNames = [undefined, "kv", "test_db"];

  for (const tableName of tableNames) {
    describe.skipIf(skipEnv)("drivers: turso with options", () => {
      const driver = tursoDriver({
        url,
        authToken: token,
        table: tableName,
        base,
        version: "1",
      });
      beforeAll(async () => {
        await resetTursoTable(driver, tableName);
      });
      testDriver({
        driver: driver,
      });
    });
    describe.skipIf(skipEnv)("drivers: turso with ENV", () => {
      let oldUrl: string | undefined;
      let oldToken: string | undefined;
      beforeAll(async () => {
        oldUrl = process.env.TURSO_DATABASE_URL;
        oldToken = process.env.TURSO_AUTH_TOKEN;
        process.env.TURSO_DATABASE_URL = url;
        process.env.TURSO_AUTH_TOKEN = token;
        await resetTursoTable(driver, tableName);
      });
      afterAll(() => {
        process.env.TURSO_DATABASE_URL = oldUrl;
        process.env.TURSO_AUTH_TOKEN = oldToken;
      });
      const driver = tursoDriver({
        table: tableName,
        base,
        version: "1",
      });
      testDriver({
        driver: driver,
      });
    });
    describe("drivers: turso in memory", () => {
      const driver = tursoDriver({
        url: ":memory:",
        table: tableName,
        base,
        version: "1",
      });
      beforeAll(async () => {
        await resetTursoTable(driver, tableName);
      });
      testDriver({
        driver: driver,
      });
    });
    describe("drivers: turso with file", () => {
      const dir = resolve(__dirname, "tmp/unstorage-turso");
      mkdirSync(dir, { recursive: true }); // Ensure directory exists
      const driver = tursoDriver({
        url: `file:${dir}/db-file.db`,
        table: tableName,
        base,
        version: "1",
      });
      beforeAll(async () => {
        await resetTursoTable(driver, tableName);
      });
      testDriver({
        driver: driver,
      });
    });
  }
}
