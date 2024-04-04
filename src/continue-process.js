import { eq } from "drizzle-orm";
import db from "./db/index.js";
import { processSchema } from "./db/schema.js";
import getServices from "./services/index.js";
import { log } from "./utils/log.js";

export default async function continueProcess(queue) {
    const allPendingProcesses = await db
        .select()
        .from(processSchema)
        .where(eq(processSchema.isCompleted, 0))

    for (const process of allPendingProcesses) {
        let services = getServices();

        services = services.filter((service) => process.services.includes(service.name));

        queue.push({
            name: process.name,
            year: process.year,
            processId: process.id,
            services,
            callbackUrl: process.callbackUrl,
            trailerPage: process.trailerPage,
            lang: process.lang
        })

        log({
            type: 'INFO',
            message: `Process ${process.id} was added to queue to continue`,
            level: 'normal'
        })
    }
}