import 'dotenv/config.js';
import './check-process.js';
import express from "express";
import { promise as fastq } from 'fastq';
import cors from 'cors';
import getServices from './services/index.js';
import worker from './worker.js';
import { CONCURRENCY, PROCESS_STATUS } from './constants.js';
import { log } from './utils/log.js';
import findProcess from './db/find-process.js';
import swaggerUi from 'swagger-ui-express';
import specs from './swagger.js';
import db from './db/index.js';
import { processSchema } from './db/schema.js';
import continueProcess from './continue-process.js';

const app = express();
app.use(express.json());
app.use(cors('*'));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));

const queue = fastq(worker, CONCURRENCY);

continueProcess(queue);

/**
 * @swagger
 * /process:
 *   post:
 *     summary: Request the download of a trailer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               serviceName:
 *                 type: string
 *                 description: The name of the service (You can get it from the list of services)
 *                 example: APPLE_TV
 *               name:
 *                 type: string
 *                 description: The name of the movie or tv show
 *                 example: The Batman
 *               year:
 *                 type: number
 *                 description: The release year of the movie or tv show
 *                 example: 2022
 *               callbackUrl:
 *                 type: string
 *                 description: If you provide this url, every time the process status changes, the callback url will receive a POST request with all the process information
 *                 example: http://example.com
 *                 required: false
 *     responses:
 *       201:
 *         description: The process was added to the queue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 processId:
 *                   type: string
 *       400:
 *         description: Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: serviceName not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 availableServices:
 *                   type: array
 *                   items:
 *                     type: string
 */
app.post('/process', async (req, res) => {
    const { serviceName, name, year, callbackUrl } = req.body;

    try {
        if (!name || !year) {
            return res.status(400).json({
                message: `Missing parameters: name=${name}, year=${year}`
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

        const processes = await db
            .insert(processSchema)
            .values({
                status: PROCESS_STATUS.PENDING,
                serviceName,
                statusDetails: 'Process was created and is in queue',
                services: services.map((service) => service.name).join('|'),
                callbackUrl,
                name,
                year,
                isCompleted: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            .returning()
        const process = processes[0];

        queue.push({
            name,
            year: String(year),
            processId: process.id,
            services,
            callbackUrl
        });

        res.status(201).json({
            processId: process.id
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

/**
 * @swagger
 * /process/{processId}:
 *   get:
 *     summary: Get the status of a process
 *     parameters:
 *       - name: processId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The process was found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 status:
 *                   type: string
 *                 statusDetails:
 *                   type: string
 *                 isCompleted:
 *                   type: number
 *                 serviceName:
 *                   type: string
 *                 services:
 *                   type: string
 *                 name:
 *                   type: string
 *                 year:
 *                   type: number
 *                 trailerPage:
 *                   type: string
 *                 callbackUrl:
 *                   type: string
 *                 callbackError:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                 updatedAt:
 *                   type: string
 *                 trailers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       url:
 *                         type: string
 *                       title:
 *                         type: string
 *                       processId:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *       404:
 *         description: The process was not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
app.get('/process/:processId', async (req, res) => {
    const { processId } = req.params;
    const process = await findProcess(processId);

    if (!process?.id) {
        return res.status(404).json({
            message: 'Process not found'
        });
    }

    res.json(process);
})

/**
 * @swagger
 * /services:
 *   get:
 *     summary: Get the list of services
 *     responses:
 *       200:
 *         description: The list of services
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 */
app.get('/services', async (req, res) => {
    res.json([{ name: "ALL" }, ...getServices().map((service) => ({ name: service.name }))]);
})

/**
 * @swagger
 * /all-status:
 *   get:
 *     summary: Get all the status that a process can have
 *     responses:
 *       200:
 *         description: The list of status
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: string
 */
app.get('/all-status', async (req, res) => {
    return res.json(Object.values(PROCESS_STATUS));
})

app.get('/', async (req, res) => {
    res.send('Welcome to Trailers API');
})

const PORT = Number(process.env.PORT || '3000');
app.listen(PORT, () => {
    log({
        type: 'INFO',
        message: `Server started on port ${PORT}`,
        level: 'important'
    });
})