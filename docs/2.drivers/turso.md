---
icon: simple-icons:turso
---

# Turso

> Store data in a Turso database powered by libSQL.

## Usage

**Driver name:** `turso`

::read-more{to="https://turso.tech/"}
Learn more about Turso.
::

::note
Unstorage uses [`@libsql/client`](https://github.com/tursodatabase/libsql-client-ts) internally to connect to Turso databases.
::

This driver stores key-value data in a Turso (libSQL) database using the REST API.

To use, you will need to install `@libsql/client` in your project:

:pm-install{name="@libsql/client"}

You can then configure the driver like this:

```ts
import { createStorage } from "unstorage";
import tursoDriver from "unstorage/drivers/turso";

const storage = createStorage({
  driver: tursoDriver({
    // The Turso database URL
    url: "your-database-url", // or set TURSO_DATABASE_URL env
    // The authentication token for your Turso database
    authToken: "your-auth-token", // or set TURSO_AUTH_TOKEN env
    // Optional: prefix for all keys (namespacing)
    // base: "unstorage",
    version: "1", // Version of the driver, used for compatibility checks.
  }),
});
```


**Table Initialization**

The Turso driver provides a helper function to create the required table if it does not exist:

```ts
import { initTursoTableIfNotExists } from "unstorage/drivers/turso";

await initTursoTableIfNotExists(client, "kv"); // Creates the 'kv' table if missing
```

By default, the table name is `kv`. You can specify a custom table name if needed. The table will have columns for `key` (TEXT, primary key) and `value` (TEXT).
