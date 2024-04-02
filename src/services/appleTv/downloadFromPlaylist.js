import m3u8Parser from 'm3u8-parser';
import path from 'node:path';
import fs from 'node:fs';
import saveBlobFile from '../../utils/saveBlobFile.js';
import { log, logPercent } from '../../utils/log.js';
import ffmpeg from '../../utils/ffmpeg.js';
import { GLOBAL_TEMP_FOLDER } from '../../constants.js';

export default async function downloadFromPlaylist({
	playlist,
	resultVideoPath,
	videoNumber,
	name,
}) {
	try {
		log({
			type: 'INFO',
			message: `Apple TV | ${name} | Getting playlist m3u8 data of trailer ${videoNumber}`,
		});

		const playlistResponse = await fetch(playlist);
		let playlistText = await playlistResponse.text();

		playlistText = playlistText.split('\n').slice(0, -1).join('\n');

		const parser = new m3u8Parser.Parser();

		parser.push(playlistText);

		parser.end();

		let playlistJson = parser.manifest.playlists;
		playlistJson = playlistJson.filter((playlist) => {
			return (
				playlist.attributes['VIDEO-RANGE'] === 'SDR' &&
				/avc1\.[\dA-Fa-f]+/.test(playlist.attributes['CODECS'])
			);
		});

		let eligiblePlaylists = playlistJson.filter((playlist) => {
			return playlist.attributes.RESOLUTION.width >= 1900;
		});

		eligiblePlaylists.sort((a, b) => {
			return b.attributes.BANDWIDTH - a.attributes.BANDWIDTH;
		});

		let videoPlaylistM3u8 = eligiblePlaylists[0];

		if (!videoPlaylistM3u8) {
			videoPlaylistM3u8 = playlistJson.reduce((acc, playlist) => {
				if (
					playlist.attributes.RESOLUTION.width > acc.attributes.RESOLUTION.width
				) {
					return playlist;
				}
				return acc;
			});
		}

		const audioPlaylistM3u8Language =
			parser.manifest.mediaGroups.AUDIO[
			Object.keys(parser.manifest.mediaGroups.AUDIO)[0]
			];

		let audioPlaylistM3u8 = Object.values(audioPlaylistM3u8Language).find(
			(al) => al.language === 'pt-BR'
		);

		if (!audioPlaylistM3u8) {
			audioPlaylistM3u8 =
				audioPlaylistM3u8Language[Object.keys(audioPlaylistM3u8Language)[0]];
		}

		log({
			type: 'INFO',
			message: `Apple TV | ${name} | Getting audio and video m3u8 data of trailer ${videoNumber}`,
		});
		const videoPlaylistResponse = await fetch(videoPlaylistM3u8.uri);
		const audioPlaylistResponse = await fetch(audioPlaylistM3u8.uri);

		const videoPlaylistText = await videoPlaylistResponse.text();
		const audioPlaylistText = await audioPlaylistResponse.text();

		const videoPlaylistParser = new m3u8Parser.Parser();
		const audioPlaylistParser = new m3u8Parser.Parser();

		videoPlaylistParser.push(videoPlaylistText);
		audioPlaylistParser.push(audioPlaylistText);

		videoPlaylistParser.end();
		audioPlaylistParser.end();

		const videoSegments = videoPlaylistParser.manifest.segments;
		const audioSegments = audioPlaylistParser.manifest.segments;

		const videoPartInicialPath = videoSegments[0].map.uri;
		const audioPartInicialPath = audioSegments[0].map.uri;

		const videoPartsPath = [
			videoPartInicialPath,
			...videoSegments.map((segment) => segment.uri),
		];
		const audioPartsPath = [
			audioPartInicialPath,
			...audioSegments.map((segment) => segment.uri),
		];

		const videoPlaylistM3BaseUrl = videoPlaylistM3u8.uri
			.split('/')
			.slice(0, -1)
			.join('/');
		const audioPlaylistM3BaseUrl = audioPlaylistM3u8.uri
			.split('/')
			.slice(0, -1)
			.join('/');

		const videoPartsUrl = videoPartsPath.map(
			(partPath) => `${videoPlaylistM3BaseUrl}/${partPath}`
		);
		const audioPartsUrl = audioPartsPath.map(
			(partPath) => `${audioPlaylistM3BaseUrl}/${partPath}`
		);

		const tempDir = fs.mkdtempSync(path.join(GLOBAL_TEMP_FOLDER, 'apple-tv-'));

		log({
			type: 'INFO',
			message: `Apple TV | ${name} | Downloading audio and video of trailer ${videoNumber}`,
		});
		const videoTempPath = path.join(tempDir, `${Date.now()}-video.mp4`);
		for (let i = 0; i < videoPartsUrl.length; i++) {
			logPercent({
				total: videoPartsUrl.length,
				loaded: i + 1,
				id: `Apple TV | ${name} | Downloading video of trailer ${videoNumber}`,
			});

			const videoPartUrl = videoPartsUrl[i];
			const response = await fetch(videoPartUrl);
			const partBlob = await response.arrayBuffer();
			const partBuffer = Buffer.from(partBlob);
			fs.appendFileSync(videoTempPath, partBuffer);
		}

		log({
			type: 'INFO',
			message: `Apple TV | ${name} | Downloading audio of trailer ${videoNumber}`,
		});
		let audioBlob = new Blob();
		for (let i = 0; i < audioPartsUrl.length; i++) {
			logPercent({
				total: audioPartsUrl.length,
				loaded: i + 1,
				id: `Apple TV | ${name} | Downloading audio of trailer ${videoNumber}`,
			});

			const audioPartUrl = audioPartsUrl[i];
			const response = await fetch(audioPartUrl);
			const partBlob = await response.arrayBuffer();
			audioBlob = new Blob([audioBlob, partBlob], {
				type: 'audio/mpeg',
			});
		}
		const audioTempPath = path.join(tempDir, `${Date.now()}-audio.mp3`);
		await saveBlobFile(audioBlob, audioTempPath);

		log({
			type: 'INFO',
			message: `Apple TV | ${name} | Merging audio and video of trailer ${videoNumber}`,
		});

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
						id: `Apple TV | ${name} | Merging audio and video of trailer ${videoNumber}`,
					});
				})
				.on('end', () => {
					log({
						type: 'INFO',
						message: `Apple TV | ${name} | Trailer ${videoNumber} was downloaded!`,
					});
					resolve();
				})
				.on('error', (error) => {
					log({
						type: 'ERROR',
						message: `Apple TV | ${name} | Error while merging audio and video of trailer ${videoNumber}: ${JSON.stringify(
							error
						)}`,
					});
					reject(error);
				})
				.save(resultVideoPath);
		})

		log({
			type: 'INFO',
			message: `Apple TV | ${name} | Removing temp files of trailer ${videoNumber}`,
		});
		fs.unlinkSync(videoTempPath);
		fs.unlinkSync(audioTempPath);
	} catch (error) {
		throw error;
	}
}
