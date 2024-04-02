import db from "./index.js";

export default function findProcess(id) {
    const process = db.prepare("SELECT * FROM process WHERE id = ?").get(id);
    const trailers = db.prepare("SELECT * FROM trailers WHERE process_id = ?").all(id);

    return { ...process, is_completed: process?.is_completed === 1, trailers };
}