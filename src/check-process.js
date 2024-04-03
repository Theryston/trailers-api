import cron from "node-cron";
import { log } from "./utils/log.js";
import { eq, sql } from "drizzle-orm";
import db from "./db/index.js";
import { processSchema } from "./db/schema.js";

cron.schedule("*/5 * * * *", async () => {
    try {
        const [{ count }] = await db
            .select({ count: sql`COUNT(*)` })
            .from(processSchema)
            .where(eq(processSchema.isCompleted, 0))

        if (count > 0) {
            return
        }

        log({
            type: 'INFO',
            message: 'All processes are completed! Exiting...',
            level: 'important'
        })
        process.exit(0)
    } catch (error) {
        log({
            type: 'ERROR',
            message: `Failed to check processes: ${error.message}`,
            level: 'normal'
        });
    }
})