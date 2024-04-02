import cron from "node-cron";
import countPendingProcess from "./db/count-pending-process.js";
import { log } from "./utils/log.js";

cron.schedule("*/5 * * * *", async () => {
    const count = countPendingProcess();

    if (count > 0) {
        return
    }

    log({
        type: 'INFO',
        message: 'All processes are completed! Exiting...',
        level: 'important'
    })
    process.exit(0)
})