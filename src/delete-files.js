import cron from "node-cron";
import { log } from "./utils/log.js";
import cleanFolder from "./utils/clean-folder.js";
import { FILES_FOLDER } from "./constants.js";

const EVERY_DAY_AT_MIDNIGHT = "0 0 0 * * *";

cron.schedule(EVERY_DAY_AT_MIDNIGHT, async () => {
    try {
        log({
            type: 'INFO',
            message: 'Cleaning all hosted files...',
            level: 'important'
        })

        await cleanFolder(FILES_FOLDER);

        log({
            type: 'INFO',
            message: 'All hosted files cleaned!',
            level: 'important'
        })
    } catch (error) {
        log({
            type: 'ERROR',
            message: `Failed to clean hosted files: ${error.message}`,
            level: 'normal'
        });
    }
})