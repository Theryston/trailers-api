import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import { v4 as uuid } from "uuid";

const API_BASE_URL = 'https://filebin.net';

export async function tempUpload(filePath) {
    const file = fs.createReadStream(filePath);
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const bin = uuid();

    const fileUrl = `${API_BASE_URL}/${bin}/${fileName}`;
    await axios.post(fileUrl, file, {
        headers: {
            'Content-Length': stats.size
        },
    })

    return fileUrl
}