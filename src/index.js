import 'dotenv/config.js';
import './check-process.js';
import express from "express";
import { promise as fastq } from 'fastq';
import createProcess from './db/create-process.js';
import cors from 'cors';
import getServices from './services/index.js';
import worker from './worker.js';
import { CONCURRENCY, PROCESS_STATUS } from './constants.js';
import { log } from './utils/log.js';
import findProcess from './db/find-process.js';
import cancelProcess from './db/cancel-process.js';

cancelProcess();

const app = express();
app.use(express.json());
app.use(cors('*'));

const queue = fastq(worker, CONCURRENCY);

app.post('/process', async (req, res) => {
    const { serviceName, name, year, callbackUrl } = req.body;

    try {
        if (!name || !year) {
            return res.status(400).json({
                message: `Missing parameters: serviceName=${serviceName}, name=${name}, year=${year}`
            });
        }

        if (!serviceName) {
            serviceName = "ALL";
        }

        let services = getServices();

        if (serviceName !== "ALL") {
            services = services.filter((service) => service.name === serviceName);
        }

        if (!services.length) {
            return res.status(404).json({
                message: `Service not found: ${serviceName}`,
                availableServices: getServices().map((service) => service.name)
            })
        }

        const processId = createProcess({
            status: PROCESS_STATUS.PENDING,
            description: 'Process was created and is in queue',
            callbackUrl,
        });

        queue.push({
            name: String(name),
            year: String(year),
            processId: String(processId),
            services,
            callbackUrl
        });

        res.status(201).json({
            processId
        })
    } catch (error) {
        log({
            type: 'ERROR',
            message: `Failed to add to queue: ${error.message}`,
            level: 'normal'
        });
        return res.status(500).json({
            message: 'Failed to add to queue'
        });
    }
})

app.get('/process/:processId', async (req, res) => {
    const { processId } = req.params;
    const process = findProcess(processId);

    if (!process.id) {
        return res.status(404).json({
            message: 'Process not found'
        });
    }

    res.json(process);
})

app.get('/services', async (req, res) => {
    res.json(getServices());
})

app.get('/all-status', async (req, res) => {
    return res.json(PROCESS_STATUS);
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    log({
        type: 'INFO',
        message: `Server started on port ${PORT}`,
        level: 'important'
    });
})