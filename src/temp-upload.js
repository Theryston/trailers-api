import fs from "node:fs";
import path from "node:path";
import { v4 as uuid } from "uuid";
import { FILES_FOLDER } from "./constants.js";


export async function tempUpload(filePath) {
    const fileName = path.basename(filePath);
    const id = uuid();
    const newPathFolder = path.join(FILES_FOLDER, id);

    if (!fs.existsSync(newPathFolder)) {
        fs.mkdirSync(newPathFolder);
    }

    const newPath = path.join(newPathFolder, fileName);
    fs.renameSync(filePath, newPath);

    const key = path.join(id, fileName);
    const url = `${process.env.BASE_URL}/files/${key}`;
    return url;
}