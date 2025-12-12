import { serve } from "bun"
import config from "./config"
import { router } from "./router"
import { initDB } from "./db"

await initDB()

const server = serve({
    port: config.port,
    hostname: config.hostname,
    fetch: router.fetch,
})

console.log(`Listening on ${server.url}`)
