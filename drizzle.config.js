import path from "node:path";
import { DATA_FOLDER } from "./src/constants.js";

/** @type { import("drizzle-kit").Config } */
export default {
  dialect: "sqlite",
  schema: "./src/db/schema.js",
  out: "./drizzle",
  dbCredentials: {
    url: path.join(DATA_FOLDER, "database.sqlite"),
  },
};
