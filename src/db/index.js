import betterSqlite3 from "better-sqlite3";
import path from "node:path";
import { DATA_FOLDER } from "../constants.js";

const dbFile = path.join(DATA_FOLDER, "database.sqlite");

const db = betterSqlite3(dbFile);

db.exec(`CREATE TABLE IF NOT EXISTS process (id INTEGER PRIMARY KEY AUTOINCREMENT, status TEXT, callback_url TEXT, description TEXT, is_completed INTEGER)`);
db.exec(`CREATE TABLE IF NOT EXISTS trailers (id INTEGER PRIMARY KEY AUTOINCREMENT, process_id INTEGER, url TEXT, title TEXT, FOREIGN KEY(process_id) REFERENCES process(id))`);

export default db