import { serve } from "bun"
import config from "./config"
import { router } from "./router"

const server = serve({
    port: config.server.port,
    hostname: config.server.hostname,
    fetch: router.fetch,
})

console.log(`Listening on ${server.url}`)
