import { log, logPercent } from '../../utils/log.js';
import normalizeText from '../../utils/normalizeText.js';
import google from '../../google.js';
import path from 'node:path';
import fs from 'node:fs';
import { load as loadCheerio } from 'cheerio';
import axios from 'axios';
import downloadFile from '../../utils/download-file.js';
import { GLOBAL_TEMP_FOLDER } from '../../constants.js';
import ffmpeg from '../../utils/ffmpeg.js';
import compareLang from '../../utils/compre-lang.js';

export default async function primeVideo({ name, year, outPath, trailerPage, onTrailerFound, lang, fullAudioTracks }) {
    log({
        type: 'INFO',
        message: `Prime Video | Starting...`,
    });

    try {
        if (!trailerPage) {
            log({
                type: 'INFO',
                message: `Prime Video | Searching for Prime Video page on Google`,
            });

            const term = `${name} ${year} site:https://www.primevideo.com`
            const googleResults = await google(term);

            const program = googleResults.find((result) => {
                const title = result.title.split('-')[0].trim();
                const normalizedText = normalizeText(title);
                const normalizedName = normalizeText(name);

                return normalizedText === normalizedName && result.link.startsWith("https://www.primevideo.com");
            });

            trailerPage = program?.link;

            if (!trailerPage) {
                log({
                    type: 'ERROR',
                    message: `Prime Video | Trailer not found.`,
                });
                return false;
            }
        }

        if (onTrailerFound) {
            onTrailerFound(trailerPage);
        }

        const { data: primeVideoPage } = await axios.get(trailerPage);
        const $PrimePage = loadCheerio(primeVideoPage);
        const dataStr = $PrimePage('script[type="text/template"]').toArray().find(script => script.children[0]?.data.includes('props')).children[0]?.data;
        const data = JSON.parse(dataStr);
        const titleId = data.props.body[0].args?.titleID

        if (!titleId) {
            log({
                type: 'ERROR',
                message: `Prime Video | Trailer not found.`,
            });
            return false;
        }

        const { data: trailerInfo } = await axios.get(`https://atv-ps.primevideo.com/cdp/catalog/GetPlaybackResources`, {
            params: {
                deviceTypeID: 'AOAGZA014O5RE',
                firmware: 1,
                consumptionType: 'Streaming',
                desiredResources: 'PlaybackUrls',
                resourceUsage: 'ImmediateConsumption',
                videoMaterialType: 'Trailer',
                titleId,
                audioTrackId: 'ALL',
                deviceStreamingTechnologyOverride: 'DASH',
            },
        });

        if (!trailerInfo) {
            log({
                type: 'ERROR',
                message: `Prime Video | Trailer not found.`,
            });
            return false;
        }

        if (trailerInfo.error) {
            log({
                type: 'ERROR',
                message: `Prime Video | Trailer not found.`,
            });
            return false;
        }

        const playbackUrls = trailerInfo.playbackUrls;

        if (!playbackUrls?.audioTracks?.length) {
            log({
                type: 'ERROR',
                message: `Prime Video | Trailer not found.`,
            });
            return false;
        }

        let audioTrack = playbackUrls.audioTracks.find(aT => compareLang(aT.languageCode, lang));

        if (!audioTrack) {
            audioTrack = playbackUrls.audioTracks[0];
        }

        const urlSet = playbackUrls.urlSets[Object.keys(playbackUrls.urlSets).find((key) => {
            const currentUrlSet = playbackUrls.urlSets[key];
            return (currentUrlSet.urls.manifest.audioTrackId === audioTrack.audioTrackId || currentUrlSet.urls.manifest.audioTrackId === 'ALL' || !currentUrlSet.urls.manifest.audioTrackId) && currentUrlSet.urls.manifest.videoQuality === 'HD';
        })];

        const mpdUrl = urlSet.urls.manifest.url;
        const baseUrl = path.dirname(mpdUrl);

        const { data: mpd } = await axios.get(mpdUrl, {
            responseType: 'text'
        });

        const $ = loadCheerio(mpd);

        const representations = $('Representation').toArray().map((representation) => {
            let baseUrl = null;

            if (representation.children.find((child) => child.name === 'baseurl')) {
                baseUrl = representation.children.find((child) => child.name === 'baseurl').children[0].data;
            } else {
                baseUrl = representation.children[0].children.find((child) => child.name === 'baseurl').children[0].data;
            }

            const adaptationSet = $(representation).parent().parent()[0];

            return {
                ...representation,
                adaptationSet,
                baseUrl
            }
        });
        const videos = representations.filter((representation) => representation.baseUrl?.includes('video'));
        const audios = representations.filter((representation) => representation.baseUrl?.includes('audio'));


        const biggestVideo = videos.sort((a, b) => {
            return Number(b.attribs.width) - Number(a.attribs.width);
        })[0];

        const audiosPath = [];

        if (fullAudioTracks) {
            audiosPath.push(...audios.map(r => r.baseUrl));
        } else {
            audiosPath.push(audios.find(r => r.adaptationSet.attribs.audiotrackid === audioTrack.audioTrackId)?.baseUrl);
        }

        const videoPath = biggestVideo?.baseUrl;

        if (!videoPath || !audiosPath.length) {
            log({
                type: 'ERROR',
                message: `Prime Video | Trailer not found.`,
            });
            return false;
        }

        const videoUrl = path.join(baseUrl, videoPath);
        const tempDir = fs.mkdtempSync(path.join(GLOBAL_TEMP_FOLDER, 'prime-video-'));
        const videoTempPath = path.join(tempDir, `${Date.now()}-video.mp4`);

        log({
            type: 'INFO',
            message: `Prime Video | Downloading video of trailer`,
        })

        await downloadFile({
            url: videoUrl,
            path: videoTempPath
        });

        log({
            type: 'INFO',
            message: `Prime Video | Downloading audios of trailer`,
        })

        const downloadedAudios = [];
        for (const audioPath of audiosPath) {
            const audioTempPath = path.join(tempDir, `${Date.now()}-audio.mp3`);
            const audioUrl = path.join(baseUrl, audioPath);

            await downloadFile({
                url: audioUrl,
                path: audioTempPath
            });
            downloadedAudios.push(audioTempPath);

            log({
                type: 'INFO',
                message: `Prime Video | Downloaded audio ${audioPath}`,
            })
        }

        log({
            type: 'INFO',
            message: `Prime Video | Merging audio and video of trailer`,
        })

        const resultVideoPath = path.join(outPath, `trailer.mp4`);

        await new Promise((resolve, reject) => {
            const command = ffmpeg(videoTempPath);

            for (const downloadedAudio of downloadedAudios) {
                command.addInput(downloadedAudio);
            }

            command
                .outputOptions([
                    '-map 0:v',
                    ...downloadedAudios.map((audio, index) => `-map ${index + 1}:a`),
                ])
                .videoCodec('copy')
                .audioCodec('aac')
                .on('progress', (progress) => {
                    logPercent({
                        total: 100,
                        loaded: progress.percent || 0,
                        id: `Prime Video | Merging audio and video of trailer`,
                    });
                })
                .on('end', () => {
                    resolve();
                })
                .on('error', (error) => {
                    reject(error);
                })
                .save(resultVideoPath)
        })

        log({
            type: 'INFO',
            message: `Prime Video | Done!`,
        })

        return [
            {
                title: 'Trailer',
                path: resultVideoPath,
            }
        ]
    } catch (error) {
        log({
            type: 'ERROR',
            message: `Prime Video | Something went wrong`,
            level: 'important',
        });
        console.log(error);
        return false;
    }
}