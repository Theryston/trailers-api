import path from "path";
import fs from "node:fs";
import { GLOBAL_TEMP_FOLDER, PROCESS_STATUS } from "./constants.js";
import processLog from "./utils/process-log.js";
import { log } from "./utils/log.js";
import { tempUpload } from "./temp-upload.js";
import db from "./db/index.js";
import { trailersSchema } from "./db/schema.js";

export default async function worker({ name, year, processId, services, callbackUrl, trailerPage, lang, fullAudioTracks }) {
  try {
    await processLog({ id: processId, status: PROCESS_STATUS.PROCESSING, description: 'Process was started', callbackUrl });

    const outPath = path.join(GLOBAL_TEMP_FOLDER, processId);
    fs.mkdirSync(outPath, { recursive: true });

    let foundTrailers = null;

    await processLog({ id: processId, status: PROCESS_STATUS.FINDING_TRAILER_PAGE, description: `Looking for trailer on: ${services.map((service) => service.name).join(', ')}`, callbackUrl });

    for (const service of services) {
      try {
        foundTrailers = await service.func({
          name,
          year,
          outPath,
          trailerPage,
          lang,
          fullAudioTracks,
          onTrailerFound: async (foundTrailerPage) => {
            processLog({ id: processId, status: PROCESS_STATUS.TRYING_TO_DOWNLOAD, description: `Trying to download the trailers from: ${service.name}`, trailerPage: foundTrailerPage, callbackUrl });
          }
        });

        if (foundTrailers) {
          break;
        }
      } catch (error) {
        log({
          type: 'ERROR',
          message: `Failed to find the trailer on ${service.name}: ${error.message}`,
          level: 'normal'
        });
        continue;
      }
    }

    if (!foundTrailers) {
      await processLog({ id: processId, status: PROCESS_STATUS.NO_TRAILERS, description: 'Trailers not found. Try again with another title variation', callbackUrl });
      return;
    }

    await processLog({ id: processId, status: PROCESS_STATUS.SAVING, description: `Saving videos: ${foundTrailers.map((trailer) => trailer.title).join(', ')}`, callbackUrl });

    for (const trailer of foundTrailers) {
      log({
        type: 'INFO',
        message: `| ${processId} | uploading: ${trailer.title}`,
      })

      const url = await tempUpload(trailer.path);
      await db
        .insert(trailersSchema)
        .values({
          processId,
          url,
          title: trailer.title,
          createdAt: new Date(),
          updatedAt: new Date(),
        })

      log({
        type: 'INFO',
        message: `| ${processId} | uploaded: ${trailer.title}`,
      })
    }

    await processLog({ id: processId, status: PROCESS_STATUS.DONE, description: 'Process completed', callbackUrl });
  } catch (error) {
    console.log(error);
    log({
      type: 'ERROR',
      message: `Failed to process: ${error.message || 'unknown error'}`,
      level: 'normal'
    });
    await processLog({ id: processId, status: PROCESS_STATUS.ERROR, description: `Failed to process: ${error.message}`, callbackUrl });
  }
}
