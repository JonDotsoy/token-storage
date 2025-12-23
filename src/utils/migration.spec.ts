import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  beforeEach,
  spyOn,
  mock,
} from "bun:test";
import { Migration } from "./migration";

describe("Migration", () => {
  let dbInstance: DuckDBInstance;
  let connection: DuckDBConnection;
  let getVersion: () => Promise<number>;
  let putVersion: (version: number) => Promise<void>;

  beforeEach(async () => {
    dbInstance = await DuckDBInstance.create();
    connection = await dbInstance.connect();

    // table id(incremental): number, version: number, name?: string, created_at(format epoch_ms): number
    const createTableIfNotExistsMigrations = async () =>
      await connection.run(`
            CREATE SEQUENCE IF NOT EXISTS migrations_id_sequence START 1;
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY DEFAULT nextval('migrations_id_sequence'),
                version INTEGER NOT NULL,
                name VARCHAR,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

    getVersion = async () => {
      await createTableIfNotExistsMigrations();
      const result = await connection.runAndReadAll(
        "SELECT version FROM migrations ORDER BY id DESC LIMIT 1",
      );
      const [obj] = result.getRowObjectsJS();
      return Number(obj?.version ?? 0);
    };
    putVersion = async (version: number, name?: string) => {
      await createTableIfNotExistsMigrations();
      await connection.run(
        "INSERT INTO migrations (version, name) VALUES (?, ?)",
        [version, name ?? null],
      );
    };
  });

  afterEach(async () => {
    connection.closeSync();
  });

  test("should return version 0 when no migrations have been applied", async () => {
    const migration = new Migration({ getVersion, putVersion, connection });

    const version = await migration.currentVersion();

    expect(version).toBe(0);
  });

  test("should apply a single migration and provide utility functions", async () => {
    const migration = new Migration({
      getVersion,
      putVersion,
      connection,
    }).next({
      version: 1,
      name: "mgiration_1",
      up(connection) {
        return {
          async run() {
            // Table Users (uid, name, email)
            await connection.run(
              "CREATE TABLE users (uid INTEGER PRIMARY KEY, name VARCHAR, email VARCHAR)",
            );
          },
          utils: {
            async getUsers() {
              const result = await connection.runAndReadAll(
                "SELECT * FROM users",
              );
              return result.getRowObjectsJS() as {
                uid: number;
                name: string;
                email: string;
              }[];
            },
            async createUser(user: {
              uid: number;
              name: string;
              email: string;
            }) {
              await connection.run(
                "INSERT INTO users (uid, name, email) VALUES (?, ?, ?)",
                [user.uid, user.name, user.email],
              );
            },
          },
        };
      },
    });

    const utils = await migration.migrated;

    await utils.createUser({ uid: 1, name: "John", email: "john@example.com" });

    const version = await migration.currentVersion();
    const users = await utils.getUsers();
    expect(version).toBe(1);
    expect(users).toEqual([
      { uid: 1, name: "John", email: "john@example.com" },
    ]);
  });

  test("should apply multiple migrations in sequence and merge utility functions", async () => {
    const migration = new Migration({ getVersion, putVersion, connection })
      .next({
        version: 1,
        name: "mgiration_1",
        up(connection) {
          return {
            run: async () => {
              // Table Users (uid, name, email)
              await connection.run(
                "CREATE TABLE users (uid INTEGER PRIMARY KEY, name VARCHAR, email VARCHAR)",
              );
            },
            utils: {
              async getUsers() {
                const result = await connection.runAndReadAll(
                  "SELECT * FROM users",
                );
                return result.getRowObjectsJS() as {
                  uid: number;
                  name: string;
                  email: string;
                }[];
              },
              async createUser(user: {
                uid: number;
                name: string;
                email: string;
              }) {
                await connection.run(
                  "INSERT INTO users (uid, name, email) VALUES (?, ?, ?)",
                  [user.uid, user.name, user.email],
                );
              },
            },
          };
        },
      })
      .next({
        version: 2,
        name: "mgiration_2",
        up(connection) {
          return {
            run: async () => {
              // Table Products (uid, name, price, user_id)
              await connection.run(
                "CREATE TABLE products (uid INTEGER PRIMARY KEY, name VARCHAR, price INTEGER, user_id INTEGER)",
              );
            },
            utils: {
              async getProducts() {
                const result = await connection.runAndReadAll(
                  "SELECT * FROM products",
                );
                return result.getRowObjectsJS() as {
                  uid: number;
                  name: string;
                  price: number;
                  user_id: number;
                }[];
              },
              async createProduct(product: {
                uid: number;
                name: string;
                price: number;
                user_id: number;
              }) {
                await connection.run(
                  "INSERT INTO products (uid, name, price, user_id) VALUES (?, ?, ?, ?)",
                  [product.uid, product.name, product.price, product.user_id],
                );
              },
            },
          };
        },
      });

    const utils = await migration.migrated;

    await utils.createUser({ uid: 1, name: "John", email: "john@example.com" });
    await utils.createProduct({
      uid: 1,
      name: "Product 1",
      price: 100,
      user_id: 1,
    });
    await utils.createProduct({
      uid: 2,
      name: "Product 2",
      price: 200,
      user_id: 1,
    });

    const version = await migration.currentVersion();
    const users = await utils.getUsers();
    const products = await utils.getProducts();
    expect(version).toBe(2);
    expect(users).toEqual([
      { uid: 1, name: "John", email: "john@example.com" },
    ]);
    expect(products).toEqual([
      { uid: 1, name: "Product 1", price: 100, user_id: 1 },
      { uid: 2, name: "Product 2", price: 200, user_id: 1 },
    ]);
  });

  test("should skip already applied migrations and only run pending ones", async () => {
    const callMigration1 = mock();
    const callMigration2 = mock();

    await putVersion(1);

    const migration = new Migration({ getVersion, putVersion, connection })
      .next({
        version: 1,
        name: "mgiration_1",
        up(connection) {
          return {
            run: async () => {
              callMigration1();

              // Table Users (uid, name, email)
              await connection.run(
                "CREATE TABLE users (uid INTEGER PRIMARY KEY, name VARCHAR, email VARCHAR)",
              );
            },
            utils: {
              async getUsers() {
                const result = await connection.runAndReadAll(
                  "SELECT * FROM users",
                );
                return result.getRowObjectsJS() as {
                  uid: number;
                  name: string;
                  email: string;
                }[];
              },
              async createUser(user: {
                uid: number;
                name: string;
                email: string;
              }) {
                await connection.run(
                  "INSERT INTO users (uid, name, email) VALUES (?, ?, ?)",
                  [user.uid, user.name, user.email],
                );
              },
            },
          };
        },
      })
      .next({
        version: 2,
        name: "mgiration_2",
        up(connection) {
          return {
            run: async () => {
              callMigration2();

              // Table Products (uid, name, price, user_id)
              await connection.run(
                "CREATE TABLE products (uid INTEGER PRIMARY KEY, name VARCHAR, price INTEGER, user_id INTEGER)",
              );
            },
            utils: {
              async getProducts() {
                const result = await connection.runAndReadAll(
                  "SELECT * FROM products",
                );
                return result.getRowObjectsJS() as {
                  uid: number;
                  name: string;
                  price: number;
                  user_id: number;
                }[];
              },
              async createProduct(product: {
                uid: number;
                name: string;
                price: number;
                user_id: number;
              }) {
                await connection.run(
                  "INSERT INTO products (uid, name, price, user_id) VALUES (?, ?, ?, ?)",
                  [product.uid, product.name, product.price, product.user_id],
                );
              },
            },
          };
        },
      });

    const utils = await migration.migrated;

    expect(callMigration1).toHaveBeenCalledTimes(0);
    expect(callMigration2).toHaveBeenCalledTimes(1);
  });
});
