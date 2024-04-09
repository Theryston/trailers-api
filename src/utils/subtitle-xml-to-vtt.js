import fs from 'node:fs';
import { load as loadCheerio } from 'cheerio';

export default function subtitleXmlToVtt(originalPath) {
    const xmlContent = fs.readFileSync(originalPath, 'utf-8');
    const $ = loadCheerio(xmlContent, { xmlMode: true });
    let list = $('p').toArray();

    if (!list.length) {
        list = $('tt\\:p').toArray();
    }

    if (!list.length) {
        throw new Error('No subtitles found');
    }

    let vttContent = 'WEBVTT\n\n';

    for (const element of list) {
        const begin = $(element).attr('begin');
        const end = $(element).attr('end');
        const text = $(element).text().trim();
        vttContent += `${formatTime(begin)} --> ${formatTime(end)}\n${text}\n\n`;
    }

    fs.writeFileSync(originalPath, vttContent);
}

function formatTime(time) {
    if (!time.endsWith('t')) {
        return time;
    }

    const milliseconds = parseInt(time) / 10000000;
    const hours = Math.floor(milliseconds / 3600);
    const minutes = Math.floor((milliseconds % 3600) / 60);
    const seconds = Math.floor(milliseconds % 60);
    const millisecondsRemainder = Math.floor((milliseconds % 1) * 1000);
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(millisecondsRemainder, 3)}`;
}

function pad(number, size = 2) {
    let padded = number.toString();
    while (padded.length < size) padded = "0" + padded;
    return padded;
}