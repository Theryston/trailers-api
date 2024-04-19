import axios from 'axios';
import axiosRetry from 'axios-retry';
import axiosRetryConfig from './axios-retry-config.js';

const proxy = {
    host: process.env.PROXY_HOST,
    port: process.env.PROXY_PORT,
    auth: {
        username: process.env.PROXY_USERNAME,
        password: process.env.PROXY_PASSWORD
    },
    protocol: process.env.PROXY_PROTOCOL,
}

const clientWithProxy = axios.create({
    proxy: process.env.IGNORE_PROXY === 'true' ? undefined : proxy,
});

axiosRetry(clientWithProxy, axiosRetryConfig);

export default clientWithProxy;
