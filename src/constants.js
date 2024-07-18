import path from "node:path";
import fs from "node:fs";
import os from "node:os";

export const DATA_FOLDER = process.env.DATA_FOLDER;
export const GLOBAL_TEMP_FOLDER = fs.mkdtempSync(path.join(os.tmpdir(), "temp-upload-"));
export const CONCURRENCY = 1;
export const PROCESS_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    FINDING_TRAILER_PAGE: 'finding_trailer_page',
    TRYING_TO_DOWNLOAD: 'trying_to_download',
    FOUND_TRAILER: 'found_trailer',
    NO_TRAILERS: 'no_trailers',
    SAVING: 'saving',
    DONE: 'done',
    ERROR: 'error',
    CANCELLED: 'cancelled'
}

if (!fs.existsSync(DATA_FOLDER)) {
    fs.mkdirSync(DATA_FOLDER, { recursive: true });
}