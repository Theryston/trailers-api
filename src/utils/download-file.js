import axios from 'axios';
import axiosRetry from 'axios-retry';
import fs from 'node:fs';
import axiosRetryConfig from '../clients/axios-retry-config.js';

axiosRetry(axios, axiosRetryConfig)

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
