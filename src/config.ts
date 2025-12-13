import { pick } from "@jondotsoy/utils-js/pick";

interface ServerConfig {
    port: number;
    hostname: string;
}

interface CorsConfig {
    origin: string | string[];
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
}

interface DatabaseConfig {
    path: string;
}

interface ConfigOptions {
    server?: Partial<ServerConfig>;
    cors?: Partial<CorsConfig>;
    database?: Partial<DatabaseConfig>;
}

export class Config {
    public server: ServerConfig;
    public cors: CorsConfig;
    public database: DatabaseConfig;

    constructor(options?: ConfigOptions) {
        const defaults = Config.defaultValues();
        this.server = {
            port: options?.server?.port ?? defaults.server.port,
            hostname: options?.server?.hostname ?? defaults.server.hostname,
        };
        this.cors = {
            origin: options?.cors?.origin ?? defaults.cors.origin,
            methods: options?.cors?.methods ?? defaults.cors.methods,
            allowedHeaders: options?.cors?.allowedHeaders ?? defaults.cors.allowedHeaders,
            credentials: options?.cors?.credentials ?? defaults.cors.credentials,
        };
        this.database = {
            path: options?.database?.path ?? defaults.database.path,
        };
    }

    static defaultValues(): { server: ServerConfig; cors: CorsConfig; database: DatabaseConfig } {
        return {
            server: {
                port: 3000,
                hostname: "localhost",
            },
            cors: {
                origin: "*",
                methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                allowedHeaders: ["Content-Type", "Authorization"],
                credentials: true,
            },
            database: {
                path: "./db",
            },
        };
    }

    static fromEnvironment(options?: ConfigOptions): Config {
        const port = pick(process.env).property("PORT")?.numeric()?.pipe(v => Number(v)).value ?? null;
        const hostname = pick(process.env).property("HOST")?.pipe(v => String(v)).value ?? null;
        const corsOrigin = pick(process.env).property("CORS_ORIGIN")?.pipe(v => String(v)).value ?? null;
        const dbPath = pick(process.env).property("DB_PATH")?.pipe(v => String(v)).value ?? null;
        const defaultValues = Config.defaultValues();

        return new Config({
            server: {
                port: options?.server?.port ?? port ?? defaultValues.server.port,
                hostname: options?.server?.hostname ?? hostname ?? defaultValues.server.hostname,
            },
            cors: {
                origin: options?.cors?.origin ?? (corsOrigin ? corsOrigin.split(",") : defaultValues.cors.origin),
                methods: options?.cors?.methods ?? defaultValues.cors.methods,
                allowedHeaders: options?.cors?.allowedHeaders ?? defaultValues.cors.allowedHeaders,
                credentials: options?.cors?.credentials ?? defaultValues.cors.credentials,
            },
            database: {
                path: options?.database?.path ?? dbPath ?? defaultValues.database.path,
            },
        });
    }
}

export default Config.fromEnvironment();
