import path from "node:path";
import { DATA_FOLDER } from "../constants.js";
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';

const dbFile = path.join(DATA_FOLDER, "database.sqlite");
const sqlite = new Database(dbFile);

const db = drizzle(sqlite);

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") })

export default db