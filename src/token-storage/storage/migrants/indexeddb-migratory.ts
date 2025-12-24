import { Migration } from "../../../utils/migration.js";
import type {
  OAuthClient,
  OAuthClientInput,
  Connection,
  ConnectionInput,
  Credential,
  CredentialInput,
} from "../dtos/storage-instance.dto.js";
import type { IndexedDBStorageOptions } from "../indexeddb-storage.js";

const DEFAULT_DB_NAME = "TokenStorageDB";
const DEFAULT_OAUTH_CLIENTS_STORE = "oauth_clients";
const DEFAULT_CONNECTIONS_STORE = "connections";
const DEFAULT_CREDENTIALS_STORE = "credentials";
const MIGRATIONS_STORE = "migrations";

interface IDBConnection {
  db: IDBDatabase;
  dbName: string;
  stores: {
    oauth_clients: string;
    connections: string;
    credentials: string;
  };
}

export class IndexedDBMigratory {
  constructor(
    readonly options: IndexedDBStorageOptions = {},
    readonly migrated = Promise.resolve().then(async () => {
      const dbName = options?.db?.name ?? DEFAULT_DB_NAME;
      const stores = {
        oauth_clients:
          options?.collections?.oauth_clients ?? DEFAULT_OAUTH_CLIENTS_STORE,
        connections:
          options?.collections?.connections ?? DEFAULT_CONNECTIONS_STORE,
        credentials:
          options?.collections?.credentials ?? DEFAULT_CREDENTIALS_STORE,
      };

      // Initialize migrations store
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(MIGRATIONS_STORE)) {
            db.createObjectStore(MIGRATIONS_STORE, {
              keyPath: "id",
              autoIncrement: true,
            });
          }
        };
      });

      const connection: IDBConnection = { db, dbName, stores };

      // Check current version and upgrade if needed
      const currentVersion = await new Promise<number>((resolve, reject) => {
        const transaction = db.transaction([MIGRATIONS_STORE], "readonly");
        const store = transaction.objectStore(MIGRATIONS_STORE);
        const request = store.openCursor(null, "prev");

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const cursor = request.result;
          resolve(cursor?.value?.version ?? 0);
        };
      });

      // If we need to upgrade, close and reopen with new version
      if (currentVersion < 1) {
        db.close();
        const upgradedDb = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open(dbName, 2);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(stores.oauth_clients)) {
              db.createObjectStore(stores.oauth_clients, {
                keyPath: "oauth_client_id",
              });
            }

            if (!db.objectStoreNames.contains(stores.connections)) {
              db.createObjectStore(stores.connections, {
                keyPath: "connection_id",
              });
            }

            if (!db.objectStoreNames.contains(stores.credentials)) {
              db.createObjectStore(stores.credentials, {
                keyPath: "credential_id",
              });
            }
          };
        });

        // Update connection reference
        connection.db = upgradedDb;

        // Record migration
        await new Promise<void>((resolve, reject) => {
          const transaction = upgradedDb.transaction(
            [MIGRATIONS_STORE],
            "readwrite",
          );
          const store = transaction.objectStore(MIGRATIONS_STORE);
          const request = store.add({
            version: 1,
            name: "create stores",
            created_at: new Date().toISOString(),
          });

          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
      }

      return new Migration({
        connection,
        getVersion: async () => {
          return new Promise((resolve, reject) => {
            const transaction = connection.db.transaction(
              [MIGRATIONS_STORE],
              "readonly",
            );
            const store = transaction.objectStore(MIGRATIONS_STORE);
            const request = store.openCursor(null, "prev");

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const cursor = request.result;
              resolve(cursor?.value?.version ?? 0);
            };
          });
        },
        putVersion: async (version: number, name?: string) => {
          return new Promise((resolve, reject) => {
            const transaction = connection.db.transaction(
              [MIGRATIONS_STORE],
              "readwrite",
            );
            const store = transaction.objectStore(MIGRATIONS_STORE);
            const request = store.add({
              version,
              name: name ?? null,
              created_at: new Date().toISOString(),
            });

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
          });
        },
      }).next({
        version: 1,
        name: "create stores",
        up: (connection) => {
          return {
            async run() {
              // Migration already applied above
            },
            utils: {
              async getOAuthClients(): Promise<OAuthClient[]> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.oauth_clients],
                    "readonly",
                  );
                  const store = transaction.objectStore(
                    connection.stores.oauth_clients,
                  );
                  const request = store.getAll();

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve(request.result);
                });
              },
              async putOAuthClient(
                oauth_client_id: string,
                data: OAuthClientInput,
              ): Promise<void> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.oauth_clients],
                    "readwrite",
                  );
                  const store = transaction.objectStore(
                    connection.stores.oauth_clients,
                  );
                  const request = store.put({ ...data, oauth_client_id });

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve();
                });
              },
              async getOAuthClient(
                oauth_client_id: string,
              ): Promise<OAuthClient | null> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.oauth_clients],
                    "readonly",
                  );
                  const store = transaction.objectStore(
                    connection.stores.oauth_clients,
                  );
                  const request = store.get(oauth_client_id);

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve(request.result ?? null);
                });
              },
              async deleteOAuthClient(oauth_client_id: string): Promise<void> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.oauth_clients],
                    "readwrite",
                  );
                  const store = transaction.objectStore(
                    connection.stores.oauth_clients,
                  );
                  const request = store.delete(oauth_client_id);

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve();
                });
              },
              async countDocumentsOAuthClients(): Promise<number> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.oauth_clients],
                    "readonly",
                  );
                  const store = transaction.objectStore(
                    connection.stores.oauth_clients,
                  );
                  const request = store.count();

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve(request.result);
                });
              },
              async getConnections(): Promise<Connection[]> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.connections],
                    "readonly",
                  );
                  const store = transaction.objectStore(
                    connection.stores.connections,
                  );
                  const request = store.getAll();

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve(request.result);
                });
              },
              async putConnection(
                connection_id: string,
                data: ConnectionInput,
              ): Promise<void> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.connections],
                    "readwrite",
                  );
                  const store = transaction.objectStore(
                    connection.stores.connections,
                  );
                  const request = store.put({ ...data, connection_id });

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve();
                });
              },
              async getConnection(
                connection_id: string,
              ): Promise<Connection | null> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.connections],
                    "readonly",
                  );
                  const store = transaction.objectStore(
                    connection.stores.connections,
                  );
                  const request = store.get(connection_id);

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve(request.result ?? null);
                });
              },
              async deleteConnection(connection_id: string): Promise<void> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.connections],
                    "readwrite",
                  );
                  const store = transaction.objectStore(
                    connection.stores.connections,
                  );
                  const request = store.delete(connection_id);

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve();
                });
              },
              async countDocumentsConnections(): Promise<number> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.connections],
                    "readonly",
                  );
                  const store = transaction.objectStore(
                    connection.stores.connections,
                  );
                  const request = store.count();

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve(request.result);
                });
              },
              async getCredentials(): Promise<Credential[]> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.credentials],
                    "readonly",
                  );
                  const store = transaction.objectStore(
                    connection.stores.credentials,
                  );
                  const request = store.getAll();

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve(request.result);
                });
              },
              async putCredential(
                credential_id: string,
                data: CredentialInput,
              ): Promise<void> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.credentials],
                    "readwrite",
                  );
                  const store = transaction.objectStore(
                    connection.stores.credentials,
                  );
                  const request = store.put({ ...data, credential_id });

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve();
                });
              },
              async getCredential(
                credential_id: string,
              ): Promise<Credential | null> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.credentials],
                    "readonly",
                  );
                  const store = transaction.objectStore(
                    connection.stores.credentials,
                  );
                  const request = store.get(credential_id);

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve(request.result ?? null);
                });
              },
              async deleteCredential(credential_id: string): Promise<void> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.credentials],
                    "readwrite",
                  );
                  const store = transaction.objectStore(
                    connection.stores.credentials,
                  );
                  const request = store.delete(credential_id);

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve();
                });
              },
              async countDocumentsCredentials(): Promise<number> {
                return new Promise((resolve, reject) => {
                  const transaction = connection.db.transaction(
                    [connection.stores.credentials],
                    "readonly",
                  );
                  const store = transaction.objectStore(
                    connection.stores.credentials,
                  );
                  const request = store.count();

                  request.onerror = () => reject(request.error);
                  request.onsuccess = () => resolve(request.result);
                });
              },
            },
          };
        },
      }).migrated;
    }),
  ) {}
}
