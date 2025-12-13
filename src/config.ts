import { pick } from "@jondotsoy/utils-js/pick";

interface ServerConfig {
    port: number;
    hostname: string;
}

interface ConfigOptions {
    server?: Partial<ServerConfig>;
}

export class Config {
    public server: ServerConfig;

    constructor(options?: ConfigOptions) {
        const defaults = Config.defaultValues();
        this.server = {
            port: options?.server?.port ?? defaults.server.port,
            hostname: options?.server?.hostname ?? defaults.server.hostname,
        };
    }

    static defaultValues(): { server: ServerConfig } {
        return {
            server: {
                port: 3000,
                hostname: "localhost",
            },
        };
    }

    static fromEnvironment(options?: ConfigOptions): Config {
        const port = pick(process.env).property("PORT")?.numeric()?.pipe(v => Number(v)).value ?? null;
        const hostname = pick(process.env).property("HOST")?.pipe(v => String(v)).value ?? null;
        const defaultValues = Config.defaultValues();

        return new Config({
            server: {
                port: options?.server?.port ?? port ?? defaultValues.server.port,
                hostname: options?.server?.hostname ?? hostname ?? defaultValues.server.hostname,
            },
        });
    }
}

export default Config.fromEnvironment();
