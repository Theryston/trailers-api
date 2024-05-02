import path from "node:path";
import fs from "node:fs";

export const PROCESS_FOLDER = path.join(process.cwd(), "process");
export const DATA_FOLDER = path.join(PROCESS_FOLDER, "data");
export const GLOBAL_TEMP_FOLDER = path.join(PROCESS_FOLDER, "temp");
export const FILES_FOLDER = path.join(DATA_FOLDER, "files");
export const CONCURRENCY = 5;
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

if (!fs.existsSync(PROCESS_FOLDER)) {
    fs.mkdirSync(PROCESS_FOLDER);
}

if (!fs.existsSync(DATA_FOLDER)) {
    fs.mkdirSync(DATA_FOLDER);
}

if (!fs.existsSync(GLOBAL_TEMP_FOLDER)) {
    fs.mkdirSync(GLOBAL_TEMP_FOLDER);
}

if (!fs.existsSync(FILES_FOLDER)) {
    fs.mkdirSync(FILES_FOLDER);
}