import { PROCESS_STATUS } from "../constants.js";
import processLog from "../utils/process-log.js";
import db from "./index.js";

export default function cancelProcess() {
    const notCompletedProcesses = db.prepare("SELECT * FROM process WHERE is_completed = 0").all();

    for (const process of notCompletedProcesses) {
        processLog({
            id: process.id,
            status: PROCESS_STATUS.CANCELLED,
            description: 'Process was cancelled',
        });
    }
}