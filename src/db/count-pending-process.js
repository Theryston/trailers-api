import db from "./index.js";

export default function countPendingProcess() {
    return db.prepare("SELECT COUNT(*) AS pending FROM process WHERE is_completed = 0").get().pending;
}