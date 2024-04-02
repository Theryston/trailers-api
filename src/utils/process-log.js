import { PROCESS_STATUS } from "../constants.js";
import findProcess from "../db/find-process.js";
import updateProcess from "../db/update-process.js";
import { log } from "./log.js";

const endedStatuses = [PROCESS_STATUS.DONE, PROCESS_STATUS.ERROR, PROCESS_STATUS.NO_TRAILERS, PROCESS_STATUS.CANCELLED];

export default function processLog({ id, status, description, callbackUrl }) {
    const isCompleted = endedStatuses.includes(status);

    log({
        type: 'INFO',
        message: `| ${id} | ${status} | ${description} | completed: ${isCompleted ? 'true' : 'false'}`,
        level: 'normal'
    });

    const oldProcess = findProcess(id);

    updateProcess({
        id,
        description: description || oldProcess.description,
        status: status || oldProcess.status,
        callbackUrl: callbackUrl || oldProcess.callback_url,
        isCompleted
    })

    const updatedProcess = findProcess(id);

    if (updatedProcess.callback_url && oldProcess.status !== updatedProcess.status) {
        fetch(updatedProcess.callback_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProcess)
        })
            .then((response) => {
                if (!response.ok) {
                    log({
                        type: 'ERROR',
                        message: `Failed to send callback: ${response.statusText}`,
                        level: 'normal'
                    });
                } else {
                    log({
                        type: 'INFO',
                        message: `Callback sent`,
                        level: 'normal'
                    });
                }
            })
            .catch((error) => {
                log({
                    type: 'ERROR',
                    message: `Failed to send callback: ${error.message}`,
                    level: 'normal'
                })
            })
    }
}