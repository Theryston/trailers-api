import cron from "node-cron";
import { log } from "./utils/log.js";
import { eq, sql } from "drizzle-orm";
import db from "./db/index.js";
import { processSchema } from "./db/schema.js";
import { GLOBAL_TEMP_FOLDER } from "./constants.js";
import fs from "node:fs";
import path from "node:path";

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

        cleanTempFolder()
        process.exit(0)
    } catch (error) {
        log({
            type: 'ERROR',
            message: `Failed to check processes: ${error.message}`,
            level: 'normal'
        });
    }
})

function cleanTempFolder() {
    try {
        const folders = fs.readdirSync(GLOBAL_TEMP_FOLDER);
        for (const folder of folders) {
            log({
                type: 'INFO',
                message: `Cleaning temp folder: ${folder}`,
                level: 'normal'
            })

            fs.rmSync(path.join(GLOBAL_TEMP_FOLDER, folder), { recursive: true, force: true });
        }
    } catch (error) {
        log({
            type: 'ERROR',
            message: `Failed to clean temp folder: ${error.message}`,
            level: 'normal'
        });
    }
}