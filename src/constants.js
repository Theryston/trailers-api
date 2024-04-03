import os from "node:os";
import path from "node:path";
import fs from "node:fs";

export const DATA_FOLDER = path.join(process.cwd(), "data");
export const GLOBAL_TEMP_FOLDER = fs.mkdtempSync(path.join(os.tmpdir(), "trailers-api-"));
export const CONCURRENCY = 5;
export const PROCESS_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    FINDING_TRAILER_PAGE: 'finding_trailer_page',
    TRYING_TO_DOWNLOAD: 'trying_to_download',
    NO_TRAILERS: 'no_trailers',
    SAVING: 'saving',
    DONE: 'done',
    ERROR: 'error',
    CANCELLED: 'cancelled'
}

if (!fs.existsSync(DATA_FOLDER)) {
    fs.mkdirSync(DATA_FOLDER);
}