import { eq } from "drizzle-orm";
import { PROCESS_STATUS } from "../constants.js";
import findProcess from "../db/find-process.js";
import db from "../db/index.js";
import { processSchema } from "../db/schema.js";
import { log } from "./log.js";

const endedStatuses = [PROCESS_STATUS.DONE, PROCESS_STATUS.ERROR, PROCESS_STATUS.NO_TRAILERS, PROCESS_STATUS.CANCELLED];

export default async function processLog({ id, status, description, callbackUrl, trailerPage }) {
    const oldProcess = await findProcess(id);

    if (!oldProcess) {
        log({
            type: 'ERROR',
            message: `Failed to find the process: ${id}`,
            level: 'normal'
        });
        return
    }

    const isCompleted = endedStatuses.includes(status) ? 1 : 0;

    log({
        type: 'INFO',
        message: `| ${id} | ${status} | ${description} | completed: ${isCompleted ? 'true' : 'false'}`,
        level: 'normal'
    });

    await db
        .update(processSchema)
        .set({
            callbackUrl: callbackUrl || oldProcess.callback_url,
            isCompleted,
            status,
            statusDetails: description || oldProcess.statusDetails,
            trailerPage: trailerPage || oldProcess.trailerPage,
            updatedAt: new Date()
        })
        .where(eq(processSchema.id, id));

    const updatedProcess = await findProcess(id);

    if (updatedProcess.callback_url && oldProcess.status !== updatedProcess.status) {
        fetch(updatedProcess.callback_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProcess)
        })
            .then(async (response) => {
                if (!response.ok) {
                    log({
                        type: 'ERROR',
                        message: `Failed to send callback: ${response.statusText}`,
                        level: 'normal'
                    });
                    await db
                        .update(processSchema)
                        .set({
                            callbackError: response.statusText,
                            updatedAt: new Date()
                        })
                } else {
                    log({
                        type: 'INFO',
                        message: `Callback sent`,
                        level: 'normal'
                    });

                    if (oldProcess.callbackError) {
                        await db
                            .update(processSchema)
                            .set({
                                callbackError: null,
                                updatedAt: new Date()
                            })
                    }
                }
            })
            .catch(async (error) => {
                log({
                    type: 'ERROR',
                    message: `Failed to send callback: ${error.message}`,
                    level: 'normal'
                })

                await db
                    .update(processSchema)
                    .set({
                        callbackError: error.message,
                        updatedAt: new Date()
                    })
            })
    }
}