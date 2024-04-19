const axiosRetryConfig = {
    retries: 10,
    retryCondition: () => true,
    onRetry: (retryCount, error) => {
        console.log(`${error.config.url ? `[${error.config.url}] ` : ''}Retrying ${retryCount} time(s) after ${error.message}`);
    },
    retryDelay: (retryCount) => {
        return 1000 * retryCount;
    }
}

export default axiosRetryConfig;