import { connect, serve, spawn, spawnSync } from "bun"
import { describe, test, expect, afterEach, beforeEach } from "bun:test"
import { Client } from "../src/client";

const open = (...params: string[]) => spawnSync({ cmd: ['open', ...params], stdout: 'inherit', stderr: 'inherit' });

class Service {
    #healthCheck?: string;
    #cmd?: string[];
    #childprocess?: Bun.Subprocess<"ignore", "inherit", "inherit">;

    cmd(args: string[]) {
        this.#cmd = args;
        return this;
    }

    healthCheck(url: string) {
        this.#healthCheck = url;
        return this;
    }

    async close() {
        if (!this.#childprocess) throw new Error("No child process");
        this.#childprocess.kill("SIGQUIT");
        await this.#childprocess.exited;
    }

    async start() {
        if (!this.#cmd) throw new Error("No command provided");
        this.#childprocess = await spawn({
            cmd: this.#cmd,
            stdout: "inherit",
            stderr: "inherit",
        });
        if (this.#healthCheck) {
            while (true) {
                try {
                    const response = await fetch(this.#healthCheck);
                    if (response.status === 200) {
                        break;
                    }
                } catch {
                    await new Promise(resolve => setTimeout(resolve, 90));
                }
            }
        }
    }
}

class DB {
    #path?: string

    path(path: string) {
        this.#path = path;
        return this;
    }

    clean() {
        if (!this.#path) throw new Error("No path provided");
        Bun.spawn(["rm", "-rf", this.#path]);
    }
}

class CallbackServer {
    #port?: number

    port(port: number) {
        this.#port = port;
        return this;
    }

    async wait() {
        if (!this.#port) throw new Error("No port provided");
        const callback = Promise.withResolvers<{ url: string, headers: any, body: any }>();
        const server = serve({
            port: this.#port,
            async fetch(req) {
                callback.resolve({
                    url: req.url,
                    headers: Object.fromEntries(req.headers.entries()),
                    body: await req.text(),
                });
                return new Response("OK");
            }
        });
        const value = await callback.promise;
        server.stop();
        return value;
    }
}

const client_secret = {
    "client_id": "971210345098-54q7la8nl60701hdu6s85keduks7tj08.apps.googleusercontent.com",
    "project_id": "jondotsoy",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "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",
    "redirect_uris": [
        "http://localhost"
    ]
}

class AuthClient {
    #client_id?: string
    #baseUrl?: string = "http://localhost/"

    clientId(client_id: string) {
        this.#client_id = client_id;
        return this;
    }

    baseUrl(baseUrl: string) {
        this.#baseUrl = baseUrl;
        return this;
    }

    async authorize_url(redirect_uri: string) {
        if (!this.#client_id) throw new Error("No client_id provided");
        const u = new URL(`./authorize/${this.#client_id}`, this.#baseUrl);
        u.searchParams.set("redirect_uri", redirect_uri);
        const res = await fetch(u);
        if (res.status !== 200) throw new Error(`Error getting authorize url: ${await res.text()}`);
        return res.json();
    }
}

class AuthServer {
    #port?: number;
    #exchanges = new Map<string, string>();
    server?: Bun.Server<undefined>;

    port(port: number) {
        this.#port = port;
        return this;
    }

    setExchange(code: string, token: string) {
        this.#exchanges.set(code, token);
        return this;
    }

    async close() {
        if (!this.server) throw new Error("No server");
        this.server.stop();
    }

    async start() {
        if (!this.#port) throw new Error("No port provided");
        this.server = serve({
            port: this.#port,
            routes: {
                "/health": () => new Response("ok"),
                "/exchange": (req) => {
                    const url = new URL(req.url);
                    const code = url.searchParams.get("code");
                    if (!code) return new Response("Missing code", { status: 400 });
                    const token = this.#exchanges.get(code);
                    if (!token) return new Response("Invalid code", { status: 400 });
                    return Response.json({ token });
                }
            }
        });
        while (true) {
            try {
                const response = await fetch(new URL(`/health`, this.server.url));
                if (response.status === 200) {
                    break;
                }
            } catch {
                await new Promise(resolve => setTimeout(resolve, 90));
            }
        }
    }
}

describe("test", () => {
    const baseUrl = new URL("http://localhost:3000");

    const server = new Service()
        .cmd(["bun", "src/serve.ts"])
        .healthCheck(new URL("/health", baseUrl).toString());

    const db = new DB().path("./db");

    beforeEach(async () => {
        await db.clean()
        await server.start()
    })

    afterEach(async () => {
        await server.close()
    })

    test("test", async () => {
        const client = new Client().baseUrl(baseUrl.toString());

        await client.putOAuthClient("google", client_secret);
        await client.putConnection("conn", {
            client_id: "google",
            scope: ["profile"],
        })
        const authUrl = await client.getAuthUrl("conn", "http://localhost:4001/callback")

        console.log("authUrl", authUrl.auth_url)
        open(authUrl.auth_url);
        const res = await new CallbackServer().port(4001).wait();
        const code = new URL(res.url).searchParams.get("code");

        const { authorization_id , token} = await client.exchangeCode("conn", code!, 'http://localhost:4001/callback');

        console.log("token", token);

        const token2 = await client.getToken(authorization_id);

        console.log("token2", token2);

    }, { timeout: 30_000 })
})
