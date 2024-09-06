import axios from "axios";
import { load as loadCheerio } from "cheerio";
import path from "node:path";
import downloadFile from "../../utils/download-file.js";
import { log } from "../../utils/log.js";

const imdbClient = axios.create({
  headers: {
    "user-agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  },
});

export default async function imdb({
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
    message: `IMDb | Starting...`,
  });

  if (!trailerPage) {
    log({
      type: "ERROR",
      message: `IMDb | Trailer not found.`,
    });

    return false;
  }

  if (onTrailerFound) {
    onTrailerFound(trailerPage);
  }

  const text = await imdbClient.get(trailerPage);
  const $ = loadCheerio(text.data);
  const nextData = $("script#__NEXT_DATA__").text();
  const json = JSON.parse(nextData);
  const videos = json?.props?.pageProps?.contentData?.categories
    ?.find((c) => c.id === "videos")
    ?.section?.items.map((i) => i.video)
    ?.filter((v) => v.contentType.id.includes("trailer"));

  if (!videos || !videos.length) {
    log({
      type: "ERROR",
      message: `IMDb | Trailer not found.`,
    });

    return false;
  }

  const videoUrls = videos.map((v) => `https://www.imdb.com/video/${v.id}/`);

  const downloadedVideos = [];

  for (let i = 0; i < videoUrls.length; i++) {
    log({
      type: "INFO",
      message: `IMDb | Downloading video ${i + 1} of ${videoUrls.length}...`,
    });
    const videoUrl = videoUrls[i];
    const resultVideoPath = path.join(outPath, `trailer-${i + 1}.mp4`);

    const downloaded = await downloadVideoPage({
      url: videoUrl,
      outPath: resultVideoPath,
      i,
    });

    if (!downloaded) continue;

    downloadedVideos.push({
      title: downloaded.title,
      path: downloaded.path,
      subtitles: [],
    });
  }

  if (!downloadedVideos.length) {
    log({
      type: "ERROR",
      message: `IMDb | No videos found.`,
    });

    return false;
  }

  return downloadedVideos;
}

async function downloadVideoPage({ url, outPath, i }) {
  const text = await imdbClient.get(url);
  const $ = loadCheerio(text.data);
  const nextData = $("script#__NEXT_DATA__").text();
  const json = JSON.parse(nextData);
  const video = json.props?.pageProps?.videoPlaybackData?.video;

  if (!video) return false;
  const title = video.name?.value;

  const playbackURLs = video?.playbackURLs
    .filter((url) => url.videoMimeType !== "M3U8")
    .map((url) => ({
      ...url,
      displayName: {
        ...url.displayName,
        value: isNaN(url.displayName.value.replace("p", ""))
          ? undefined
          : Number(url.displayName.value.replace("p", "")),
      },
    }))
    .filter((url) => url.displayName?.value);

  if (!playbackURLs || !playbackURLs.length) return false;

  const bestQuality = playbackURLs.sort(
    (a, b) => b.displayName.value - a.displayName.value
  )[0];

  if (!bestQuality) return false;

  const videoUrl = bestQuality.url;
  if (!videoUrl) return false;

  await downloadFile({
    url: videoUrl,
    path: outPath,
  });

  return { title: title || `Trailer ${i + 1}`, path: outPath };
}
