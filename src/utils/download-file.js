import axios from 'axios';
import fs from 'node:fs';

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
