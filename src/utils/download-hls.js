import fs from "node:fs";
import path from "node:path";
import { GLOBAL_TEMP_FOLDER } from "../constants.js";
import downloadFile from "./download-file.js";
import m3u8Parser from 'm3u8-parser';
import compareLang from "./compre-lang.js";
import ffmpeg from "./ffmpeg.js";
import { logPercent, log } from "./log.js";
import { all as allLangs } from 'locale-codes';

export default async function downloadHls({ url, outPath, lang }) {
    const tempDir = fs.mkdtempSync(path.join(GLOBAL_TEMP_FOLDER, 'download-hls-'));

    const masterPlaylistPath = path.join(tempDir, 'playlist.m3u8');
    await downloadFile({
        url,
        path: masterPlaylistPath
    });
    const masterPlaylist = fs.readFileSync(masterPlaylistPath, 'utf-8');

    const masterPlaylistParser = new m3u8Parser.Parser();
    masterPlaylistParser.push(masterPlaylist);
    masterPlaylistParser.end();

    const playlists = masterPlaylistParser.manifest.playlists.filter(playlist => playlist.attributes['VIDEO-RANGE'] === 'SDR' && /avc1\.[\dA-Fa-f]+/.test(playlist.attributes['CODECS']));

    if (!playlists.length) {
        throw new Error('No playlists found');
    }

    const bestPlaylist = playlists.sort((a, b) => b.attributes.RESOLUTION.width - a.attributes.RESOLUTION.width)[0];
    const allAudios = Object.values(masterPlaylistParser.manifest.mediaGroups.AUDIO);
    const audios = Object.values(allAudios[0])
    const allSubtitles = Object.values(masterPlaylistParser.manifest.mediaGroups.SUBTITLES);
    const subtitles = Object.values(allSubtitles[0] || {});

    return await handleMasterPlaylist({ playlist: bestPlaylist, outPath, lang, audios, subtitles });
}

async function handleMasterPlaylist({ playlist, outPath, lang, audios, subtitles }) {
    if (!playlist) {
        throw new Error('No playlist found');
    }

    if (!subtitles) {
        subtitles = []
    }

    if (lang) {
        audios = [audios.filter(audio => compareLang(lang, audio.language))[0]];
    }

    const downloadedSubtitles = [];
    for (let i = 0; i < subtitles.length; i++) {
        const subtitle = subtitles[i];

        if (subtitle.characteristics && subtitle.characteristics.includes('accessibility')) {
            log({
                type: 'INFO',
                message: `Ignoring subtitle because it accessibility: ${subtitle.language}`,
            })
            continue;
        }

        if (subtitle.forced) {
            log({
                type: 'INFO',
                message: `Ignoring subtitle because it forced: ${subtitle.language}`,
            })
            continue;
        }

        const tempSubtitleFolder = fs.mkdtempSync(path.join(GLOBAL_TEMP_FOLDER, 'download-hls-subtitle-'));
        const subtitlePath = await handlePlaylist({ playlist: subtitle, folderPath: tempSubtitleFolder });
        await handleSubtitle({ subtitlePath });
        const locate = new Intl.Locale(subtitle.language);
        downloadedSubtitles.push({
            path: subtitlePath,
            language: `${locate.language}${locate.region ? `-${locate.region}` : ''}`,
        })
    }

    const downloadedAudios = [];
    for (let i = 0; i < audios.length; i++) {
        const audio = audios[i];

        if (audio.characteristics && audio.characteristics.includes('describes-video')) {
            log({
                type: 'INFO',
                message: `Ignoring audio because it describes a video: ${audio.language}`,
            })
            continue;
        }

        const tempAudioFolder = fs.mkdtempSync(path.join(GLOBAL_TEMP_FOLDER, 'download-hls-audio-'));
        const audioPath = await handlePlaylist({ playlist: audio, folderPath: tempAudioFolder });

        downloadedAudios.push({
            path: audioPath,
            language: audio.language
        });
    }

    const tempVideoFolder = fs.mkdtempSync(path.join(GLOBAL_TEMP_FOLDER, 'download-hls-video-'));
    const videoPath = await handlePlaylist({ playlist, folderPath: tempVideoFolder });

    await new Promise((resolve, reject) => {
        const command = ffmpeg(videoPath);

        for (const downloadedAudio of downloadedAudios) {
            command.addInput(downloadedAudio.path);
        }

        const outputOptionsArray = [
            '-map 0:v',
            ...downloadedAudios.map((audio, index) => `-map ${index + 1}:a`),
            ...downloadedAudios.map((audio, index) => {
                const lang = allLangs.find(l => l['iso639-1'] && compareLang(l['iso639-1'], audio.language));

                if (!lang || !lang['iso639-2']) {
                    return '';
                }

                return `-metadata:s:a:${index} language=${lang['iso639-2']}`;
            }),
        ]
            .filter(option => option);

        command
            .outputOptions(outputOptionsArray)
            .videoCodec('copy')
            .audioCodec('aac')
            .on('progress', (progress) => {
                logPercent({
                    total: 100,
                    loaded: progress.percent || 0,
                    id: `Merging audios and video of ${path.basename(playlist.uri)}`,
                });
            })
            .on('end', () => {
                log({
                    type: 'INFO',
                    message: `${path.basename(playlist.uri)} was merged!`,
                });
                resolve();
            })
            .on('error', (error) => {
                console.log(error)
                log({
                    type: 'ERROR',
                    message: `Error while merging audios and videos of ${path.basename(playlist.uri)}: ${JSON.stringify(error)}`,
                });
                reject(error);
            })
            .save(outPath);
    })

    log({
        type: 'INFO',
        message: `Playlist was downloaded: ${outPath}`,
    })

    return {
        path: outPath,
        subtitles: downloadedSubtitles
    };
}

async function handleSubtitle({ subtitlePath }) {
    const subtitle = fs.readFileSync(subtitlePath, 'utf-8');
    const parts = subtitle.split('WEBVTT');

    const resultParts = {};
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const lines = part.split('\n');
        const subtitleParts = splitArrayIntoParts(lines);

        for (const subtitlePart of subtitleParts) {
            if (isNaN(subtitlePart[0])) {
                continue;
            }

            const [id, ...text] = subtitlePart;
            resultParts[id] = `${text.map(t => t.trim()).join('\n')}\n`;
        }
    }

    const result = Object.entries(resultParts)
        .sort((a, b) => a[0] - b[0])
        .map(([id, text]) => `${id}\n${text}`);

    const vttHeader = 'WEBVTT\n\n';
    const vtt = `${vttHeader}${result.join('\n')}`;
    fs.writeFileSync(subtitlePath, vtt);
}

function splitArrayIntoParts(array) {
    const parts = [];
    let currentPart = [];

    for (let i = 0; i < array.length; i++) {
        const element = array[i];
        if (element.trim() === '') {
            if (currentPart.length > 0) {
                parts.push(currentPart);
                currentPart = [];
            }
        } else {
            currentPart.push(element);
        }
    }

    if (currentPart.length > 0) {
        parts.push(currentPart);
    }

    return parts;
}

async function handlePlaylist({ playlist, folderPath }) {
    if (!playlist) {
        throw new Error('No playlist found');
    }

    const baseUrl = path.dirname(playlist.uri);
    const contentPath = path.join(folderPath, 'playlist.m3u8');
    await downloadFile({
        url: playlist.uri,
        path: contentPath
    });
    const content = fs.readFileSync(contentPath, 'utf-8');

    const parser = new m3u8Parser.Parser();
    parser.push(content);
    parser.end();

    const rawSegments = parser.manifest.segments;
    const inicialSegment = rawSegments[0].map?.uri || rawSegments[0].uri;
    const segments = [
        inicialSegment,
        ...rawSegments.map(segment => segment.uri),
    ]

    const ext = inicialSegment.split('.').pop();
    const allSegmentsPath = path.join(folderPath, `all_segments.${ext}`);
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const uri = path.join(baseUrl, segment);
        await downloadFile({
            url: uri,
            path: allSegmentsPath,
            append: i > 0
        });

        logPercent({
            total: segments.length,
            loaded: i,
            id: `downloading HLS segments of ${path.basename(playlist.uri)}`,
        })
    }

    return allSegmentsPath;
}