import fs from "node:fs";
import { v4 as uuid } from "uuid";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

export async function uploadFile(filePath) {
  const fileName = path.basename(filePath);
  const key = `${uuid()}-${fileName}`;
  const mimeType = mime.lookup(fileName);

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: fs.createReadStream(filePath),
    ACL: "public-read",
    ContentType: mimeType || undefined,
  });

  await client.send(command);

  const url = `${process.env.BASE_FILES_URL}/${key}`;

  return url;
}
