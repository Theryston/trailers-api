import db from "./index.js";

export default function updateProcess({ id, status, description, callbackUrl, isCompleted }) {
    db.prepare("UPDATE process SET status = ?, description = ?, callback_url = ?, is_completed = ? WHERE id = ?").run(status, description, callbackUrl, isCompleted ? 1 : 0, id);
}