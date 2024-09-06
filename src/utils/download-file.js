import axios from "axios";
import axiosRetry from "axios-retry";
import fs from "node:fs";
import axiosRetryConfig from "../clients/axios-retry-config.js";
import { log } from "./log.js";

axiosRetry(axios, axiosRetryConfig);

export default async function downloadFile({
  url,
  path,
  append = false,
  timeout,
}) {
  log({
    type: "INFO",
    message: `Downloading ${url} to ${path}`,
  });
  const client = axios;
  const response = await client.get(url, {
    responseType: "arraybuffer",
    timeout,
  });

  const data = Buffer.from(response.data, "binary");

  if (append) {
    fs.appendFileSync(path, data);
  } else {
    fs.writeFileSync(path, data);
  }

  return path;
}
