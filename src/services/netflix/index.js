import downloadFile from '../../utils/downloadFile.js';
import fs from 'node:fs';
import path from 'node:path';
import slug from 'slug';
import { log, logPercent } from '../../utils/log.js';
import ffmpeg from '../../utils/ffmpeg.js';
import { GLOBAL_TEMP_FOLDER } from '../../constants.js';
import normalizeText from '../../utils/normalizeText.js';
import google from '../../google.js';
import compareLang from '../../utils/compre-lang.js';
import { load as loadCheerio } from 'cheerio';
import axios from 'axios';

export default async function netflix({ name, year, outPath, trailerPage, onTrailerFound, lang }) {
  log({
    type: 'INFO',
    message: `Netflix | Starting...`,
  });

  try {
    if (!trailerPage) {
      log({
        type: 'INFO',
        message: `Netflix | Searching for netflix page on Google`,
      });

      const term = `${name} ${year} site:https://www.netflix.com`
      const googleResults = await google(term);

      const program = googleResults.find((result) => {
        const titleWords = result.title.split("|")[0].split(' ');
        const title = titleWords.slice(1, titleWords.length).join(' ').trim();

        const normalizedText = normalizeText(title);
        const normalizedName = normalizeText(name);

        return normalizedText === normalizedName && result.link.startsWith("https://www.netflix.com");
      });

      trailerPage = program?.link;

      if (!trailerPage) {
        log({
          type: 'ERROR',
          message: `Netflix | Trailer not found.`,
        });
        return false;
      }
    }

    if (onTrailerFound) {
      onTrailerFound(trailerPage);
    }

    const { data: netflixPage, headers: netflixHeaders } = await axios.get(trailerPage);
    const netflixIdCookie = netflixHeaders['set-cookie'].find(c => c.startsWith('NetflixId'));

    const $ = loadCheerio(netflixPage);
    const dataScript = $('script').toArray().find((script) => script.children[0]?.data.includes('window.netflix')).children[0]?.data;
    const [_, dataStrRaw] = dataScript.split('reactContext =');
    const dataStr = dataStrRaw.trim().slice(0, -1)
    const data = JSON.parse(fixEscapeHex(dataStr));
    const trailers = data.models.nmTitleUI.data.sectionData.find(s => s.type === 'additionalVideos')?.data.supplementalVideos || [];

    if (!trailers.length) {
      log({
        type: 'ERROR',
        message: `Netflix | Trailer not found.`,
      });
      return false;
    }

    const downloadedVideos = [];
    for (let i = 0; i < trailers.length; i++) {
      log({
        type: 'INFO',
        message: `Netflix | Processing trailer ${i + 1}`,
      })

      const trailer = trailers[i];
      const videoTitle = trailer.title;

      const locate = new Intl.Locale(lang);
      const langStr = `${locate.language}-${locate.region || 'US'}`;

      const trailerRequestData = {
        version: 2,
        url: 'manifest',
        languages: [langStr],
        params: {
          viewableId: trailer.id,
          profiles: ['heaac-2-dash', 'playready-h264mpl40-dash'],
        }
      }

      const { data: trailerInfos } = await axios.post(`https://www.netflix.com/playapi/cadmium/manifest/1`, trailerRequestData, {
        headers: {
          Cookie: netflixIdCookie,
        }
      });

      if (!trailerInfos.result) {
        log({
          type: 'ERROR',
          message: `Netflix | Trailer not found.`,
        });
        return false;
      }

      let audioTrack = trailerInfos.result.audio_tracks.find(
        (at) => compareLang(at.language, lang) && at.streams && at.streams.length
      );

      if (!audioTrack) {
        audioTrack = trailerInfos.result.audio_tracks.find(
          (at) => at.streams && at.streams.length
        );
      }

      const audioUrl = audioTrack.streams[0].urls[0].url;
      const biggestVideo = trailerInfos.result.video_tracks[0].streams.reduce(
        (prev, current) => {
          if (current.bitrate > prev.bitrate) {
            return current;
          }
          return prev;
        }
      );
      const videoUrl = biggestVideo.urls[0].url;

      const tempDir = fs.mkdtempSync(path.join(GLOBAL_TEMP_FOLDER, 'netflix-'));

      const videoTempPath = path.join(tempDir, `${Date.now()}-video.mp4`);
      const audioTempPath = path.join(tempDir, `${Date.now()}-audio.mp4`);

      log({
        type: 'INFO',
        message: `Netflix | Downloading video of trailer ${i + 1}`,
      });
      await downloadFile(videoUrl, videoTempPath);

      log({
        type: 'INFO',
        message: `Netflix | Downloading audio of trailer ${i + 1}`,
      });
      await downloadFile(audioUrl, audioTempPath);

      log({
        type: 'INFO',
        message: `Netflix | Merging audio and video of trailer ${i + 1
          }`,
      });

      const resultVideoPath = path.join(outPath, `${slug(videoTitle)}.mp4`);

      try {
        await new Promise((resolve, reject) => {
          ffmpeg()
            .input(videoTempPath)
            .input(audioTempPath)
            .videoCodec('copy')
            .audioCodec('aac')
            .on('progress', (progress) => {
              logPercent({
                total: 100,
                loaded: progress.percent || 0,
                id: `Netflix | Merging audio and video of trailer ${i + 1}`,
              });
            })
            .on('end', () => {
              resolve();
            })
            .on('error', (error) => {
              reject(error);
            })
            .save(resultVideoPath);
        })

        downloadedVideos.push({
          title: videoTitle,
          path: resultVideoPath,
        });
      } catch (error) {
        log({
          type: 'ERROR',
          message: `Netflix | Something went wrong with trailer ${i + 1}`,
        });
      }

      log({
        type: 'INFO',
        message: `Netflix | Deleting temp files of trailer ${i + 1}`,
      });
      fs.unlinkSync(videoTempPath);
      fs.unlinkSync(audioTempPath);
    }

    log({
      type: 'INFO',
      message: `Netflix | All trailers downloaded`,
    });
    return downloadedVideos;
  } catch (error) {
    log({
      type: 'ERROR',
      message: `Netflix | Something went wrong`,
      level: 'important',
    });
    console.log(error);
    return false;
  }
}

function fixEscapeHex(jsonString) {
  return jsonString.replace(/\\x([0-9A-Fa-f]{2})/g, function (match, hex) {
    return String.fromCharCode(parseInt(hex, 16));
  });
}
