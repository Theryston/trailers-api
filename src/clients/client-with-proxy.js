import axios from 'axios';
import axiosRetry from 'axios-retry';

const clientWithProxy = axios.create({
    proxy: {
        host: process.env.PROXY_HOST,
        port: process.env.PROXY_PORT,
        auth: {
            username: process.env.PROXY_USERNAME,
            password: process.env.PROXY_PASSWORD
        },
        protocol: process.env.PROXY_PROTOCOL,
    },
});

axiosRetry(clientWithProxy, {
    retries: 10,
    retryCondition: () => true,
    onRetry: (retryCount, error) => {
        console.log(`Retrying ${retryCount} time(s) after ${error.message}`);
    },
});

export default clientWithProxy;
