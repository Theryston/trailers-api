import fs from "node:fs";
import { v4 as uuid } from "uuid";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";

const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

export async function tempUpload(filePath) {
    const fileName = path.basename(filePath);
    const key = `${uuid()}-${fileName}`;
    const mimeType = mime.lookup(fileName);

    const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: fs.createReadStream(filePath),
        ACL: "public-read",
        ContentType: mimeType || undefined
    });

    await client.send(command);

    const url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    return url;
}