import db from "./index.js";

export default function createProcess({ status, description, callbackUrl = null }) {
    const process = db.prepare("INSERT INTO process (status, description, callback_url) VALUES (?, ?, ?)").run(status, description, callbackUrl);

    return Number(process.lastInsertRowid);
}