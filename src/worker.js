import path from "path";
import slug from "slug";
import fs from "node:fs";
import { GLOBAL_TEMP_FOLDER, PROCESS_STATUS } from "./constants.js";
import processLog from "./utils/process-log.js";
import { log } from "./utils/log.js";
import { tempUpload } from "./temp-upload.js";
import createTrailer from "./db/create-trailer.js";

export default async function worker({ name, year, processId, services, callbackUrl }) {
  try {
    processLog({ id: processId, status: PROCESS_STATUS.PROCESSING, description: 'Process was started', callbackUrl });

    const trailersPath = path.join(GLOBAL_TEMP_FOLDER, processId);

    if (!fs.existsSync(trailersPath)) {
      fs.mkdirSync(trailersPath);
    }

    const outPath = path.join(trailersPath, slug(`${name} ${year}`));

    if (fs.existsSync(outPath)) {
      fs.rmSync(outPath, { recursive: true, force: true });
    }

    fs.mkdirSync(outPath);

    let foundTrailers = null;

    processLog({ id: processId, status: PROCESS_STATUS.TRYING_TO_DOWNLOAD, description: `Trying to download the videos from the services: ${services.map((service) => service.name).join(', ')}`, callbackUrl });

    for (const service of services) {
      try {
        foundTrailers = await service.func({ name, year, outPath });

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
      if (fs.existsSync(outPath)) {
        fs.rmSync(outPath, { recursive: true });
      }

      processLog({ id: processId, status: PROCESS_STATUS.NO_TRAILERS, description: 'Trailers not found. Try again with another title variation', callbackUrl });
      return;
    }

    processLog({ id: processId, status: PROCESS_STATUS.SAVING, description: `Saving videos: ${foundTrailers.map((trailer) => trailer.title).join(', ')}`, callbackUrl });

    for (const trailer of foundTrailers) {
      const url = await tempUpload(trailer.path);
      createTrailer(processId, url, trailer.title);
    }

    processLog({ id: processId, status: PROCESS_STATUS.DONE, description: 'Process completed', callbackUrl });
  } catch (error) {
    log({
      type: 'ERROR',
      message: `Failed to process: ${error.message}`,
      level: 'normal'
    });
    processLog({ id: processId, status: PROCESS_STATUS.ERROR, description: `Failed to process: ${error.message}`, callbackUrl });
  }
}
