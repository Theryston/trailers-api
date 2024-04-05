import puppeteer from 'puppeteer';
import downloadFile from '../../utils/downloadFile.js';
import fs from 'node:fs';
import path from 'node:path';
import slug from 'slug';
import locateChrome from 'locate-chrome';
import { log, logPercent } from '../../utils/log.js';
import ffmpeg from '../../utils/ffmpeg.js';
import { GLOBAL_TEMP_FOLDER } from '../../constants.js';
import normalizeText from '../../utils/normalizeText.js';
import google from '../../google.js';
import compareLang from '../../utils/compre-lang.js';

export default async function netflix({ name, year, outPath, trailerPage, onTrailerFound, lang }) {
  log({
    type: 'INFO',
    message: `Netflix | Opening browser`,
  });

  const executablePath = await locateChrome();
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.124 Safari/537.36 Edg/102.0.1245.44'
  );

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
        browser.close();
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

    log({
      type: 'INFO',
      message: `Netflix | Opening the Netflix page`,
    });

    await page.goto(trailerPage);

    log({
      type: 'INFO',
      message: `Netflix | Verifying if has trailers`,
    });

    try {
      await page.waitForSelector('.nmtitle-section.section-additional-videos', {
        timeout: 10000,
      });
    } catch (error) {
      browser.close();
      log({
        type: 'ERROR',
        message: `Netflix | Trailer not found.`,
      });
      return false;
    }

    let trailersSection = await page.$(
      '.nmtitle-section.section-additional-videos'
    );

    if (!trailersSection) {
      browser.close();
      log({
        type: 'ERROR',
        message: `Netflix | Trailer not found.`,
      });
      return false;
    }

    let ul = await trailersSection.$('ul');
    let arrayLi = await ul.$$('li');
    const liOrder = [];

    for (let i = 0; i < arrayLi.length; i++) {
      let videoTitle = await arrayLi[i].$('.additional-video-title');
      videoTitle = await videoTitle.evaluate((el) => el.textContent);
      liOrder.push({
        videoTitle,
        index: i,
      });
    }

    if (!arrayLi.length) {
      browser.close();
      log({
        type: 'ERROR',
        message: `Netflix | Trailer not found.`,
      });
      return false;
    }

    log({
      type: 'INFO',
      message: `Netflix | Preparing requests observer`,
    });
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      if (
        request.url().indexOf('https://www.netflix.com/playapi') !== -1 &&
        request.method() === 'POST'
      ) {
        const body = JSON.parse(request.postData());
        const hasProfile = body.params.profiles.some(
          (profile) => profile === 'playready-h264mpl40-dash'
        );
        const locate = new Intl.Locale(lang);
        const langStr = `${locate.language}-${locate.region || 'US'}`;

        if (hasProfile) {
          request.continue({
            postData: JSON.stringify({
              ...body,
              languages: [langStr],
            }),
          });
        } else {
          request.continue({
            postData: JSON.stringify({
              ...body,
              languages: [langStr],
              params: {
                ...body.params,
                profiles: [...body.params.profiles, 'playready-h264mpl40-dash'],
              },
            }),
          });
        }
      } else {
        request.continue();
      }
    });

    const downloadedVideos = [];
    for (let i = 0; i < arrayLi.length; i++) {
      log({
        type: 'INFO',
        message: `Netflix | Opening trailer ${i + 1}`,
      });
      trailersSection = await page.$(
        '.nmtitle-section.section-additional-videos'
      );

      ul = await trailersSection.$('ul');
      arrayLi = await ul.$$('li');

      for (let i = 0; i < arrayLi.length; i++) {
        let videoTitle = await arrayLi[i].$('.additional-video-title');
        videoTitle = await videoTitle.evaluate((el) => el.textContent);

        let correspondingOrder = liOrder.find(
          (order) => order.videoTitle === videoTitle
        );

        if (correspondingOrder) {
          arrayLi[i].orderIndex = correspondingOrder.index;
        }
      }

      arrayLi.sort((a, b) => a.orderIndex - b.orderIndex);

      await page.evaluate(() => {
        const trailersSection = document.querySelector(
          '.nmtitle-section.section-additional-videos'
        );
        trailersSection.scrollIntoView();
      });

      let videoTitle = await arrayLi[i].$('.additional-video-title');
      videoTitle = await videoTitle.evaluate((el) => el.textContent);

      const button = await arrayLi[i].$('button');
      await button.click();

      log({
        type: 'INFO',
        message: `Netflix | Waiting for trailer ${i + 1} to load`,
      });
      const response = await page.waitForResponse(
        (response) =>
          response.url().indexOf('https://www.netflix.com/playapi') !== -1,
        {
          timeout: 10000,
        }
      );

      const body = await response.json();
      let audioTrack = body.result.audio_tracks.find(
        (at) => compareLang(at.language, lang) && at.streams && at.streams.length
      );

      if (!audioTrack) {
        audioTrack = body.result.audio_tracks.find(
          (at) => at.streams && at.streams.length
        );
      }

      const audioUrl = audioTrack.streams[0].urls[0].url;
      const biggestVideo = body.result.video_tracks[0].streams.reduce(
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

      await page.reload();
    }

    browser.close();
    log({
      type: 'INFO',
      message: `Netflix | All trailers downloaded`,
    });
    return downloadedVideos;
  } catch (error) {
    browser.close();
    log({
      type: 'ERROR',
      message: `Netflix | Something went wrong`,
      level: 'important',
    });
    console.log(error);
    return false;
  }
}
