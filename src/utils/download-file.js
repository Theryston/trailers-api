import axios from 'axios';
import axiosRetry from 'axios-retry';
import fs from 'node:fs';

axiosRetry(axios, {
  retries: 10,
  retryCondition: () => true,
  onRetry: (retryCount, error) => {
    console.log(`Retrying ${retryCount} time(s) after ${error.message}`);
  }
})

export default async function downloadFile({ url, path, append = false }) {
  const response = await axios.get(url, {
    responseType: 'stream',
  });

  const writer = fs.createWriteStream(path, { flags: append ? 'a' : 'w' });

  return new Promise((resolve, reject) => {
    response.
      data
      .pipe(writer)
      .on('finish', () => {
        resolve();
      }).on('error', (err) => {
        reject(err);
      });
  })
}
