import cron from "node-cron";
import { log } from "./utils/log.js";
import { eq, sql } from "drizzle-orm";
import db from "./db/index.js";
import { processSchema } from "./db/schema.js";
import { GLOBAL_TEMP_FOLDER } from "./constants.js";
import cleanFolder from "./utils/clean-folder.js";

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
            message: 'All processes are completed! Cleaning temp folder...',
            level: 'important'
        })

        await cleanFolder(GLOBAL_TEMP_FOLDER);

        log({
            type: 'INFO',
            message: 'Temp folder cleaned!',
            level: 'important'
        })
    } catch (error) {
        log({
            type: 'ERROR',
            message: `Failed to check processes: ${error.message}`,
            level: 'normal'
        });
    }
})
