export function log({ type, message, level }) {
    if (!level) {
        level = 'normal';
    }

    const formattedMessage = `[${type}] ${message}`;

    if (level === 'normal') {
        console.log(formattedMessage);
    }

    if (level === 'important') {
        console.log(`>>> ${formattedMessage} <<<`);
    }
}

const percents = {};
export function logPercent({ total, loaded, id, showParts = false }) {
    const currentPercent = Math.round((loaded / total) * 100);
    const oldPercent = percents[id];

    if (currentPercent !== oldPercent || showParts) {
        log({
            type: 'INFO',
            message: `| ${id} | ${showParts ? `${loaded}/${total} (${currentPercent}%)` : `${currentPercent}%`}`,
            level: 'normal',
        });
    }

    percents[id] = currentPercent;
}

export function clearPercent(id) {
    delete percents[id];
}
