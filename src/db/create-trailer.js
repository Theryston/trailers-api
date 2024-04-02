import db from "./index.js";

export default function createTrailer(processId, url, title) {
    const trailer = db.prepare("INSERT INTO trailers (process_id, url, title) VALUES (?, ?, ?)").run(processId, url, title);

    return Number(trailer.lastInsertRowid);
}