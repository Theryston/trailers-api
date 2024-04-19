import axios from 'axios';
import axiosRetry from 'axios-retry';
import fs from 'node:fs';
import axiosRetryConfig from '../clients/axios-retry-config.js';
import clientWithProxy from '../clients/client-with-proxy.js';

axiosRetry(axios, axiosRetryConfig)

export default async function downloadFile({ url, path, append = false, useProxy = false, timeout }) {
  const client = useProxy ? clientWithProxy : axios;

  const response = await client.get(url, {
    responseType: 'arraybuffer',
    timeout,
  });

  const data = Buffer.from(response.data, 'binary');

  if (append) {
    fs.appendFileSync(path, data);
  } else {
    fs.writeFileSync(path, data);
  }

  return path;
}
