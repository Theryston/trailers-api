import downloadFromPlaylist from './downloadFromPlaylist.js';
import path from 'node:path';
import { log } from '../../utils/log.js';
import normalizeText from '../../utils/normalizeText.js';
import google from '../../google.js';
import axios from 'axios';
import { load as loadCheerio } from 'cheerio';

export default async function appleTv({ name, year, outPath, trailerPage, onTrailerFound, lang }) {
	log({
		type: 'INFO',
		message: `Apple TV | Starting...`,
	});

	try {
		if (!trailerPage) {
			log({
				type: 'INFO',
				message: `Apple TV | Searching for Apple TV page on Google`,
			});

			const term = `${name} ${year} site:https://tv.apple.com`;
			const googleResults = await google(term);

			const program = googleResults.find((result) => {
				const hrefParts = result.link.split('/');
				const title = hrefParts[hrefParts.length - 2];

				const normalizedText = normalizeText(title);
				const normalizedName = normalizeText(name);

				return normalizedText === normalizedName && result.link.startsWith('https://tv.apple.com');
			});

			trailerPage = program?.link;

			if (!trailerPage) {
				log({
					type: 'ERROR',
					message: `Apple TV | Trailer not found.`,
				});
				return false;
			}
		}

		if (onTrailerFound) {
			onTrailerFound(trailerPage);
		}

		const { data: appleTvPage } = await axios.get(trailerPage);
		const $ = loadCheerio(appleTvPage);
		const dataStr = $('script#shoebox-uts-api').text();
		const allData = JSON.parse(dataStr);
		const data = Object.values(allData)[0];
		const trailers = data.canvas.shelves.find((s) => s.id === 'uts.col.Trailers')?.items?.map(t => ({ title: t.title, hlsUrl: t.playables[0].assets.hlsUrl }));

		if (!trailers) {
			log({
				type: 'ERROR',
				message: `Apple TV | Trailer not found.`,
			});
			return false;
		}

		const downloadedVideos = [];
		for (let i = 0; i < trailers.length; i++) {
			const trailer = trailers[i];

			const resultVideoPath = path.join(outPath, `trailer-${i + 1}.mp4`);
			await downloadFromPlaylist({
				playlist: trailer.hlsUrl,
				resultVideoPath,
				lang,
				videoNumber: i + 1,
			});

			downloadedVideos.push({
				title: trailer.title,
				path: resultVideoPath,
			});
		}

		return downloadedVideos;
	} catch (error) {
		log({
			type: 'ERROR',
			message: `Apple TV | Something went wrong`,
			level: 'important',
		});
		console.log(error);
		return false;
	}
}
