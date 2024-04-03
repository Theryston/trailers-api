/** @type { import("drizzle-kit").Config } */
export default {
    schema: "./src/db/schema.js",
    driver: 'better-sqlite',
    out: './drizzle'
};