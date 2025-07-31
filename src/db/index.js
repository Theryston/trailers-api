import path from "node:path";
import { DATA_FOLDER } from "../constants.js";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import Database from "bun:sqlite";

const dbFile = path.join(DATA_FOLDER, "database.sqlite");
const sqlite = new Database(dbFile);

const db = drizzle(sqlite);

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

export default db;
