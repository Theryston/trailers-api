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
    responseType: 'arraybuffer'
  });

  const data = Buffer.from(response.data, 'binary');

  if (append) {
    fs.appendFileSync(path, data);
  } else {
    fs.writeFileSync(path, data);
  }

  return path;
}
