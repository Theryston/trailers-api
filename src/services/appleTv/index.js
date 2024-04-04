import puppeteer from 'puppeteer';
import downloadFromPlaylist from './downloadFromPlaylist.js';
import slug from 'slug';
import path from 'node:path';
import fs from 'node:fs';
import locateChrome from 'locate-chrome';
import { log } from '../../utils/log.js';
import normalizeText from '../../utils/normalizeText.js';
import google from '../../google.js';

export default async function appleTv({ name, year, outPath, trailerPage, onTrailerFound, lang }) {
	log({
		type: 'INFO',
		message: `Apple TV | Opening browser`,
	});

	const executablePath = await locateChrome();
	const browser = await puppeteer.launch({
		executablePath,
		headless: 'new',
		args: ['--no-sandbox'],
	});
	const page = await browser.newPage();

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
				browser.close();
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

		log({
			type: 'INFO',
			message: `Apple TV | Opening the Apple TV page`,
		});
		await page.goto(trailerPage);

		log({
			type: 'INFO',
			message: `Apple TV | Verifying if has trailers`,
		});

		await new Promise((resolve) => setTimeout(resolve, 5000));

		try {
			await page.waitForSelector('#uts-col-Trailers', {
				timeout: 10000,
			});
		} catch (error) {
			browser.close();
			log({
				type: 'ERROR',
				message: `Apple TV | Trailer not found.`,
			});
			return false;
		}

		let trailersSection = await page.$('#uts-col-Trailers');

		if (!trailersSection) {
			browser.close();
			log({
				type: 'ERROR',
				message: `Apple TV | Trailer not found.`,
			});
			return false;
		}

		let ul = await trailersSection.$('ul');
		let arrayLi = await ul.$$('li');

		if (!arrayLi.length) {
			browser.close();
			log({
				type: 'ERROR',
				message: `Apple TV | Trailer not found.`,
			});
			return false;
		}

		log({
			type: 'INFO',
			message: `Apple TV | ${arrayLi.length} trailers found`,
		});

		const downloadedVideos = [];
		for (let i = 0; i < arrayLi.length; i++) {
			log({
				type: 'INFO',
				message: `Apple TV | Opening trailer ${i + 1}`,
			});
			await new Promise((resolve) => setTimeout(resolve, 5000));
			await page.waitForSelector('#uts-col-Trailers');
			trailersSection = await page.$('#uts-col-Trailers');

			ul = await trailersSection.$('ul');
			arrayLi = await ul.$$('li');

			await page.evaluate(() => {
				const trailersSection = document.querySelector('#uts-col-Trailers');
				trailersSection.scrollIntoView();
			});

			const button = await arrayLi[i].$('button');
			await button.click();

			log({
				type: 'INFO',
				message: `Apple TV | Getting the videos url of trailer ${i + 1
					}`,
			});

			let timeoutResolve = 10000;
			const playlist = await new Promise((resolve) => {
				const interval = setInterval(() => {
					timeoutResolve -= 1000;

					if (timeoutResolve === 0) {
						clearInterval(interval);
						resolve(false);
					}
				}, 1000);

				page.on('response', async (response) => {
					const url = response.url();

					if (url.includes('playlist.m3u8') && timeoutResolve > 0) {
						resolve(url);
					}
				});
			});

			if (!playlist) {
				browser.close();
				log({
					type: 'ERROR',
					message: `Apple TV | None video found`,
				});
				return false;
			}

			const videoTitleElement = await arrayLi[i].$('.typography-title-3.text-truncate');
			const videoTitle = await videoTitleElement.evaluate((el) => el.textContent);

			let resultVideoPath = path.join(
				outPath,
				`${slug(videoTitle) || `trailer-${i + 1}`}.mp4`
			);

			if (fs.existsSync(resultVideoPath)) {
				resultVideoPath = path.join(
					outPath,
					`${slug(videoTitle) + `-${i + 1}` || `trailer-${i + 1}`}.mp4`
				);
			}

			await downloadFromPlaylist({
				playlist,
				resultVideoPath,
				lang,
				videoNumber: i + 1,
			});

			downloadedVideos.push({
				title: videoTitle?.replaceAll('\n', ' ').trim() || `Trailer ${i + 1}`,
				path: resultVideoPath,
			});

			await page.reload();
		}

		await browser.close();
		return downloadedVideos;
	} catch (error) {
		browser.close();
		log({
			type: 'ERROR',
			message: `Apple TV | Something went wrong`,
			level: 'important',
		});
		console.log(error);
		return false;
	}
}
