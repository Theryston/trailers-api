import path from "node:path";
import ffmpeg from "./utils/ffmpeg.js";
import { GLOBAL_TEMP_FOLDER } from "./constants.js";
import { v4 as uuid } from "uuid";
import { uploadFile } from "./upload-file.js";

export default async function extractThumbnail(videoPath) {
  const fileName = `${uuid()}-thumbnail.jpg`;
  const tempThumbnailPath = path.join(GLOBAL_TEMP_FOLDER, fileName);

  await new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .on("error", reject)
      .on("end", resolve)
      .screenshots({
        timestamps: ["00:00:05"],
        filename: fileName,
        folder: GLOBAL_TEMP_FOLDER,
        size: "1920x1080",
      });
  });

  const url = await uploadFile(tempThumbnailPath);
  return url;
}
