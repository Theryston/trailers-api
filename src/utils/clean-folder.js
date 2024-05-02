import fs from "node:fs";
import path from "node:path";
import { log } from "./log.js";

export default async function cleanFolder(folder) {
    const entries = fs.readdirSync(folder);

    for (const entry of entries) {
        const entryPath = path.join(folder, entry);
        log({
            type: 'INFO',
            message: `Clean folder is deleting: ${entryPath}`,
            level: 'normal'
        })

        try {
            await fs.promises.rm(entryPath, { recursive: true, force: true });
        } catch (error) {
            log({
                type: 'ERROR',
                message: `Failed to clean ${entryPath}: ${error.message}`,
                level: 'normal'
            })

            continue;
        }
    }
}