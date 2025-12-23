import { describe, test, expect } from "bun:test";
import { DuckDBMigratory } from "./duckdb-migratory";
import { DuckDBInstance } from "@duckdb/node-api";

describe("MigrationDuckDB", () => {
  test("should create a MigrationDuckDB instance correctly", async () => {
    const instance = await DuckDBInstance.create();
    const conn = await instance.connect();
    await new DuckDBMigratory(conn).migrated;
  });
  test("should save and retrieve an OAuth client correctly", async () => {
    const instance = await DuckDBInstance.create();
    const conn = await instance.connect();
    const migrated = await new DuckDBMigratory(conn).migrated;

    await migrated.putOAuthClient("aaa", {
      client_id: "aaa",
      project_id: "aaa",
      auth_uri: "aaa",
      token_uri: "aaa",
      auth_provider_x509_cert_url: "aaa",
      client_secret: "aaa",
    });

    const oauth_clients = await migrated.getOAuthClients();

    expect(oauth_clients).toHaveLength(1);
    expect(oauth_clients).toEqual([
      {
        oauth_client_id: "aaa",
        client_id: "aaa",
        project_id: "aaa",
        auth_uri: "aaa",
        token_uri: "aaa",
        auth_provider_x509_cert_url: "aaa",
        client_secret: "aaa",
      },
    ]);
  });
  test("should save and retrieve a connection correctly", async () => {
    const instance = await DuckDBInstance.create();
    const conn = await instance.connect();
    const migrated = await new DuckDBMigratory(conn).migrated;

    await migrated.putConnection("aaa", {
      client_id: "aaa",
      scope: ["aaa", "bbb", "ccc"],
      created_at: new Date(Date.UTC(2025, 11, 12)),
    });

    const oauth_clients = await migrated.getConnections();

    expect(oauth_clients).toHaveLength(1);
    expect(oauth_clients).toEqual([
      {
        connection_id: "aaa",
        client_id: "aaa",
        scope: ["aaa", "bbb", "ccc"],
        created_at: new Date(Date.UTC(2025, 11, 12)),
      },
    ]);
  });
});
