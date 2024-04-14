import path from "path";
import fs from "node:fs";
import { GLOBAL_TEMP_FOLDER, PROCESS_STATUS } from "./constants.js";
import processLog from "./utils/process-log.js";
import { log } from "./utils/log.js";
import { tempUpload } from "./temp-upload.js";
import db from "./db/index.js";
import { subtitlesSchema, trailersSchema } from "./db/schema.js";
import ffmpeg from "./utils/ffmpeg.js";
import compareLang from "./utils/compre-lang.js";

export default async function worker({ name, year, processId, services, trailerPage, lang, fullAudioTracks }) {
  try {
    await processLog({ id: processId, status: PROCESS_STATUS.PROCESSING, description: 'Process was started' });

    const outPath = path.join(GLOBAL_TEMP_FOLDER, processId);
    fs.mkdirSync(outPath, { recursive: true });

    await processLog({ id: processId, status: PROCESS_STATUS.FINDING_TRAILER_PAGE, description: `Looking for trailer on: ${services.map((service) => service.name).join(', ')}` });

    const servicesResults = [];
    const promises = [];
    for (const service of services) {
      promises.push((async () => {
        const index = servicesResults.push({ name: service.name, serviceResult: [], trailerPage: null }) - 1;
        const serviceTrailers = await service.func({
          name,
          year,
          outPath,
          trailerPage,
          lang,
          fullAudioTracks,
          onTrailerFound: async (foundTrailerPage) => {
            processLog({ id: processId, status: PROCESS_STATUS.TRYING_TO_DOWNLOAD, description: `Trying to download the trailers from: ${service.name}` });
            servicesResults[index].trailerPage = foundTrailerPage;
          }
        });

        for (let i = 0; i < serviceTrailers.length; i++) {
          const trailer = serviceTrailers[i];
          const langs = await getVideoLangs(trailer.path);
          serviceTrailers[i].langs = langs;
        }

        servicesResults[index].serviceResult = serviceTrailers;
      })());
    }

    const promiseResults = await Promise.allSettled(promises);
    const errors = promiseResults.filter((result) => result.status === 'rejected').map((result) => result.reason);

    for (const error of errors) {
      log({
        type: 'ERROR',
        message: `Failed to find the trailer on some service: ${error.message}`,
        level: 'normal'
      });
    }

    const servicesResultsWithTrailers = servicesResults.filter((serviceResult) => serviceResult.trailerPage && serviceResult.serviceResult.length && serviceResult.serviceResult.every((t) => t.langs.length));

    if (!servicesResultsWithTrailers.length) {
      await processLog({ id: processId, status: PROCESS_STATUS.NO_TRAILERS, description: 'Trailers not found. Try again with another title variation' });
      return;
    }

    const sortedServicesResults = servicesResultsWithTrailers.sort((a, b) => b.serviceResult.length - a.serviceResult.length);
    const bestServiceResult = getBestServiceResult(sortedServicesResults, lang, processId);

    const trailers = bestServiceResult.serviceResult;

    if (!trailers || !trailers.length) {
      await processLog({ id: processId, status: PROCESS_STATUS.NO_TRAILERS, description: 'Trailers not found. Try again with another title variation' });
      return;
    }

    await processLog({ id: processId, status: PROCESS_STATUS.FOUND_TRAILER, description: `Found the best trailer on ${bestServiceResult.serviceResult.name}`, trailerPage: bestServiceResult.trailerPage });

    await processLog({ id: processId, status: PROCESS_STATUS.SAVING, description: `Saving videos: ${trailers.map((trailer) => trailer.title).join(', ')}` });

    for (const trailer of trailers) {
      log({
        type: 'INFO',
        message: `| ${processId} | uploading: ${trailer.title}`,
      })

      const url = await tempUpload(trailer.path);
      const [createdTrailer] = await db
        .insert(trailersSchema)
        .values({
          processId,
          url,
          title: trailer.title,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      log({
        type: 'INFO',
        message: `| ${processId} | uploaded: ${trailer.title}`,
      })

      log({
        type: 'INFO',
        message: `| ${processId} | uploading: ${trailer.subtitles.length} subtitles`,
      })

      for (const subtitle of trailer.subtitles) {
        const subtitleUrl = await tempUpload(subtitle.path);

        await db
          .insert(subtitlesSchema)
          .values({
            language: subtitle.language,
            trailerId: createdTrailer.id,
            url: subtitleUrl,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
      }

      log({
        type: 'INFO',
        message: `| ${processId} | uploaded: ${trailer.subtitles.length} subtitles`,
      })
    }

    await processLog({ id: processId, status: PROCESS_STATUS.DONE, description: 'Process completed' });
  } catch (error) {
    console.log(error);
    log({
      type: 'ERROR',
      message: `Failed to process: ${error.message || 'unknown error'}`,
      level: 'normal'
    });
    await processLog({ id: processId, status: PROCESS_STATUS.ERROR, description: `Failed to process: ${error.message}` });
  }
}

async function getVideoLangs(videoPath) {
  return await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        const audios = data.streams.filter((stream) => stream.codec_type === 'audio');
        resolve(audios.map((stream) => stream.tags?.language).filter(l => l));
      }
    });
  })
}

function getBestServiceResult(servicesResults, lang, processId) {
  let best = servicesResults.find((serviceResult) => serviceResult.serviceResult.every((t) => t.subtitles.find((sub) => compareLang(sub.language, lang)) && t.langs.find((l) => compareLang(l, lang))));

  if (!best) {
    best = servicesResults.find((serviceResult) => serviceResult.serviceResult.every((t) => t.langs.find((l) => compareLang(l, lang))));
  }

  if (!best) {
    best = servicesResults.find((serviceResult) => serviceResult.serviceResult.every((t) => t.subtitles.find((sub) => compareLang(sub.language, lang))));
  }

  if (!best) {
    best = servicesResults.find((serviceResult) => serviceResult.serviceResult.find((t) => t.langs.find((l) => compareLang(l, lang))));
  }

  if (!best) {
    best = servicesResults.find((serviceResult) => serviceResult.serviceResult.find((t) => t.subtitles.find((sub) => compareLang(sub.language, lang))));
  }

  if (!best) {
    best = servicesResults[0];
  }

  log({
    type: 'INFO',
    message: `| ${processId} | best service: ${best.name}`,
  })

  return best;
}