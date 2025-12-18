import { serve } from "bun"
import config from "./config.js"
import { router } from "./router.js"

const server = serve({
    port: config.server.port,
    hostname: config.server.hostname,
    fetch: router.fetch,
})

console.log(`Listening on ${server.url}`)
