import downloadFile from "../../utils/download-file.js";
import fs from "node:fs";
import path from "node:path";
import slug from "slug";
import { log, logPercent } from "../../utils/log.js";
import ffmpeg from "../../utils/ffmpeg.js";
import { GLOBAL_TEMP_FOLDER } from "../../constants.js";
import normalizeText from "../../utils/normalizeText.js";
import google from "../../google.js";
import compareLang from "../../utils/compre-lang.js";
import { load as loadCheerio } from "cheerio";
import fixEscapeHex from "../../utils/fix-escape-hex.js";
import { all as allLangs } from "locale-codes";
import subtitleXmlToVtt from "../../utils/subtitle-xml-to-vtt.js";
import { v4 as uuid } from "uuid";
import axios from "axios";

export default async function netflix({
  name,
  year,
  outPath,
  trailerPage,
  onTrailerFound,
  lang,
  fullAudioTracks,
}) {
  log({
    type: "INFO",
    message: `Netflix | Starting...`,
  });

  try {
    if (!trailerPage) {
      log({
        type: "INFO",
        message: `Netflix | Searching for netflix page on Google`,
      });

      const term = `${name} ${year} site:https://www.netflix.com`;
      const googleResults = await google(term);

      const program = googleResults.find((result) => {
        const titleWords = result.title.split("|")[0].split(" ");
        const title = titleWords.slice(1, titleWords.length).join(" ").trim();

        const normalizedText = normalizeText(title);
        const normalizedName = normalizeText(name);

        return (
          normalizedText === normalizedName &&
          result.link.startsWith("https://www.netflix.com")
        );
      });

      trailerPage = program?.link;

      if (!trailerPage) {
        log({
          type: "ERROR",
          message: `Netflix | Trailer not found.`,
        });
        return false;
      }
    }

    if (onTrailerFound) {
      onTrailerFound(trailerPage);
    }

    const { data: netflixPage, headers: netflixHeaders } = await axios.get(
      trailerPage
    );
    const netflixCookies = netflixHeaders["set-cookie"].join("; ");

    const $ = loadCheerio(netflixPage);
    const dataScript = $("script")
      .toArray()
      .find((script) => script.children[0]?.data.includes("window.netflix"))
      .children[0]?.data;
    const [_, dataStrRaw] = dataScript.split("reactContext =");
    const dataStr = dataStrRaw.trim().slice(0, -1);
    const data = JSON.parse(fixEscapeHex(dataStr));

    let trailers = [];
    const graphqlData = data.models.graphql.data;
    const graphqlDataKeys = Object.keys(graphqlData);
    const supplementals = graphqlDataKeys.filter((key) =>
      key.includes("Supplemental")
    );

    for (const supplemental of supplementals) {
      trailers.push(graphqlData[supplemental]);
    }

    trailers = trailers.filter((t) => t.videoId);

    if (!trailers.length) {
      log({
        type: "ERROR",
        message: `Netflix | Trailer not found.`,
      });
      return false;
    }

    const downloadedVideos = [];
    const tempDir = fs.mkdtempSync(path.join(GLOBAL_TEMP_FOLDER, "netflix-"));

    for (let i = 0; i < trailers.length; i++) {
      log({
        type: "INFO",
        message: `Netflix | Processing trailer ${i + 1}`,
      });

      const trailer = trailers[i];
      const videoTitle = trailer.title;

      const locate = new Intl.Locale(lang);
      const langStr = `${locate.language}-${locate.region || "US"}`;

      const trailerRequestData = {
        version: 2,
        url: "manifest",
        languages: [langStr],
        params: {
          viewableId: trailer.videoId,
          profiles: [
            "heaac-2-dash",
            "playready-h264mpl40-dash",
            "imsc1.1",
            "dfxp-ls-sdh",
            "simplesdh",
            "nflx-cmisc",
            "BIF240",
            "BIF320",
          ],
        },
      };

      const { data: trailerInfos } = await axios.post(
        `https://www.netflix.com/playapi/cadmium/manifest/1`,
        trailerRequestData,
        {
          headers: {
            Cookie: netflixCookies,
          },
        }
      );

      if (!trailerInfos.result) {
        log({
          type: "ERROR",
          message: `Netflix | Trailer not found.`,
        });
        return false;
      }

      const rawSubtitles = (trailerInfos.result.timedtexttracks || []).filter(
        (st) =>
          st.rawTrackType === "subtitles" &&
          Object.keys(st.ttDownloadables).length
      );

      log({
        type: "INFO",
        message: `Netflix | Raw subtitles found: ${rawSubtitles.length}`,
      });

      const subtitles = await handleSubtitles({ rawSubtitles, tempDir });

      let audioTrack = trailerInfos.result.audio_tracks.find(
        (at) =>
          compareLang(at.language, lang) && at.streams && at.streams.length
      );

      if (!audioTrack) {
        audioTrack = trailerInfos.result.audio_tracks.find(
          (at) => at.streams && at.streams.length
        );
      }

      const audios = [];
      if (fullAudioTracks) {
        audios.push(
          ...trailerInfos.result.audio_tracks.map((a) => ({
            url: a.streams[0].urls[0].url,
            language: a.language,
          }))
        );
      } else {
        audios.push({
          url: audioTrack.streams[0].urls[0].url,
          language: audioTrack.language,
        });
      }

      const biggestVideo = trailerInfos.result.video_tracks[0].streams.reduce(
        (prev, current) => {
          if (current.bitrate > prev.bitrate) {
            return current;
          }
          return prev;
        }
      );
      const videoUrl = biggestVideo.urls[0].url;

      const videoTempPath = path.join(tempDir, `${Date.now()}-video.mp4`);

      log({
        type: "INFO",
        message: `Netflix | Downloading video of trailer ${i + 1}`,
      });
      await downloadFile({
        url: videoUrl,
        path: videoTempPath,
      });

      log({
        type: "INFO",
        message: `Netflix | Downloading audios of trailer ${i + 1}`,
      });

      const downloadedAudios = [];
      for (let j = 0; j < audios.length; j++) {
        const audio = audios[j];
        const audioTempPath = path.join(
          tempDir,
          `${Date.now()}-audio-${j}.m4a`
        );
        await downloadFile({
          url: audio.url,
          path: audioTempPath,
        });
        downloadedAudios.push({
          path: audioTempPath,
          language: audio.language,
        });

        log({
          type: "INFO",
          message: `Netflix | Downloaded audio ${j + 1} of trailer ${i + 1}`,
        });
      }

      log({
        type: "INFO",
        message: `Netflix | Merging audio and video of trailer ${i + 1}`,
      });

      const resultVideoPath = path.join(outPath, `${slug(videoTitle)}.mp4`);

      try {
        await new Promise((resolve, reject) => {
          const command = ffmpeg(videoTempPath);

          for (const downloadedAudio of downloadedAudios) {
            command.addInput(downloadedAudio.path);
          }

          const outputOptionsArray = [
            "-map 0:v",
            ...downloadedAudios.map((audio, index) => `-map ${index + 1}:a`),
            ...downloadedAudios.map((audio, index) => {
              const lang = allLangs.find(
                (l) =>
                  l["iso639-1"] && compareLang(l["iso639-1"], audio.language)
              );

              if (!lang || !lang["iso639-2"]) {
                return "";
              }

              return `-metadata:s:a:${index} language=${lang["iso639-2"]}`;
            }),
          ].filter((option) => option);

          command
            .outputOptions(outputOptionsArray)
            .videoCodec("copy")
            .audioCodec("aac")
            .on("progress", (progress) => {
              logPercent({
                total: 100,
                loaded: progress.percent || 0,
                id: `Netflix | Merging audio and video of trailer ${i + 1}`,
              });
            })
            .on("end", () => {
              resolve();
            })
            .on("error", (error) => {
              reject(error);
            })
            .save(resultVideoPath);
        });

        downloadedVideos.push({
          title: videoTitle,
          path: resultVideoPath,
          subtitles,
        });
      } catch (error) {
        log({
          type: "ERROR",
          message: `Netflix | Something went wrong with trailer ${i + 1}`,
        });
        console.log(error);
      }

      log({
        type: "INFO",
        message: `Netflix | Deleting temp files of trailer ${i + 1}`,
      });

      fs.rmSync(videoTempPath, { recursive: true, force: true });
      for (const downloadedAudio of downloadedAudios) {
        fs.rmSync(downloadedAudio.path, { recursive: true, force: true });
      }
    }

    log({
      type: "INFO",
      message: `Netflix | All trailers downloaded`,
    });
    return downloadedVideos;
  } catch (error) {
    log({
      type: "ERROR",
      message: `Netflix | Something went wrong`,
      level: "important",
    });
    console.log(error);
    return false;
  }
}

async function handleSubtitles({ rawSubtitles, tempDir }) {
  const subtitles = [];

  for (let i = 0; i < rawSubtitles.length; i++) {
    const rawSubtitle = rawSubtitles[i];
    const downloadInfos = Object.values(rawSubtitle.ttDownloadables)[0];
    const downloadUrls = Object.values(downloadInfos.downloadUrls).slice(0, 1);

    const promises = downloadUrls.map((downloadUrl) => {
      console.log(`Downloading subtitle ${i + 1} from ${downloadUrl}`);
      const downloadPath = path.join(tempDir, `${uuid()}.vtt`);

      return downloadFile({
        url: downloadUrl,
        path: downloadPath,
        timeout: 10000,
      });
    });

    const results = await Promise.allSettled(promises);
    const downloadPath = results.find(
      (result) => result.status === "fulfilled"
    )?.value;

    if (!downloadPath || !fs.existsSync(downloadPath)) {
      continue;
    }

    await subtitleXmlToVtt(downloadPath);
    const locate = new Intl.Locale(rawSubtitle.language);

    subtitles.push({
      path: downloadPath,
      language: `${locate.language}${locate.region ? `-${locate.region}` : ""}`,
    });
  }

  return subtitles;
}
