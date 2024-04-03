import fs from "node:fs";
import path from "node:path";
import { v4 as uuid } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
})

export async function tempUpload(filePath) {
    const file = fs.createReadStream(filePath);
    const stats = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const mimeType = mime.lookup(filePath);
    const id = uuid();
    const key = path.join(id, fileName);

    const putCommand = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: file,
        ACL: 'public-read',
        ContentType: mimeType,
        ContentLength: stats.size,
        Metadata: {
            id,
            fileName
        }
    })

    await s3Client.send(putCommand);

    const url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return url;
}