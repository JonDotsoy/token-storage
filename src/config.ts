import { pick } from "@jondotsoy/utils-js/pick";

const env = {
    number: (name: string) => pick(process.env).property(name)?.numeric()?.pipe(v => Number(v)).value ?? null,
    string: (name: string) => pick(process.env).property(name)?.pipe(v => String(v)).value ?? null,
}

export default {
    port: env.number("PORT") ?? 3000,
    hostname: env.string("HOST") ?? "localhost",
}
