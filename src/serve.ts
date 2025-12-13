import { serve } from "bun"
import config from "./config"
import { router } from "./router"
import { initDB } from "./db"

await initDB()

const server = serve({
    port: config.server.port,
    hostname: config.server.hostname,
    fetch: router.fetch,
})

console.log(`Listening on ${server.url}`)
