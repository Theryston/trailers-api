import "dotenv/config.js";
import "./check-process.js";
import express from "express";
import { promise as fastq } from "fastq";
import cors from "cors";
import getServices from "./services/index.js";
import worker from "./worker.js";
import {
  CONCURRENCY,
  PROCESS_STATUS,
  GLOBAL_TEMP_FOLDER,
} from "./constants.js";
import { log } from "./utils/log.js";
import findProcess from "./db/find-process.js";
import swaggerUi from "swagger-ui-express";
import specs from "./swagger.js";
import db from "./db/index.js";
import { processSchema, subtitlesSchema, trailersSchema } from "./db/schema.js";
import continueProcess from "./continue-process.js";
import { and, count, countDistinct, desc, eq, gt } from "drizzle-orm";

const app = express();
app.use(express.json());
app.use(cors("*"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));

const queue = fastq(worker, CONCURRENCY);

continueProcess(queue);

/**
 * @swagger
 * /process:
 *   post:
 *     summary: Request the download of a trailer
 *     tags: [Process]
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
 *                 example: ALL
 *               lang:
 *                 type: string
 *                 description: The language of the trailer
 *                 example: en-US
 *               fullAudioTracks:
 *                 type: boolean
 *                 description: If you want to create a multi-audio video trailer with all the available audio tracks
 *                 example: true
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
app.post("/process", async (req, res) => {
  let { serviceName, name, year, lang, callbackUrl, fullAudioTracks } =
    req.body;

  try {
    if (!name || !year) {
      return res.status(400).json({
        message: `Missing parameters: name=${name}, year=${year}`,
      });
    }

    if (!lang) {
      lang = "en-US";
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
        availableServices: getServices().map((service) => service.name),
      });
    }

    const processes = await db
      .insert(processSchema)
      .values({
        status: PROCESS_STATUS.PENDING,
        serviceName,
        statusDetails: "Process was created and is in queue",
        services: services.map((service) => service.name).join("|"),
        callbackUrl,
        name,
        year,
        lang,
        isCompleted: 0,
        fullAudioTracks: fullAudioTracks ? 1 : 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    const process = processes[0];

    queue.push({
      name,
      year: String(year),
      processId: process.id,
      services,
      lang,
      fullAudioTracks: fullAudioTracks ? 1 : 0,
    });

    res.status(201).json({
      processId: process.id,
    });
  } catch (error) {
    log({
      type: "ERROR",
      message: `Failed to add to queue: ${error.message}`,
      level: "normal",
    });
    return res.status(500).json({
      message: "Failed to add to queue",
    });
  }
});

/**
 * @swagger
 * /process/by-trailer-page:
 *   post:
 *     summary: Request the download of a trailer using the trailer page
 *     tags: [Process]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trailerPage:
 *                 type: string
 *                 description: The trailer page
 *                 example: https://www.netflix.com/title/81223025
 *                 required: true
 *               lang:
 *                 type: string
 *                 description: The language of the trailer
 *                 example: en-US
 *               fullAudioTracks:
 *                 type: boolean
 *                 description: If you want to create a multi-audio video trailer with all the available audio tracks
 *                 example: true
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
 *         description: Can't find the service for the trailer page
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 availableDomains:
 *                   type: array
 *                   items:
 *                     type: string
 */
app.post("/process/by-trailer-page", async (req, res) => {
  let { trailerPage, lang, callbackUrl, fullAudioTracks } = req.body;

  if (!lang) {
    lang = "en-US";
  }

  if (!trailerPage) {
    return res.status(400).json({
      message: "Missing parameters: trailerPage",
    });
  }

  if (!trailerPage.startsWith("https://")) {
    return res.status(400).json({
      message: "Invalid parameters: trailerPage",
    });
  }

  const service = getServices().find((service) =>
    new URL(trailerPage).hostname.includes(service.domain)
  );

  if (!service) {
    return res.status(404).json({
      message: `Can't find the service for the trailer page: ${trailerPage}`,
      availableDomains: getServices().map((service) => service.domain),
    });
  }

  const processes = await db
    .insert(processSchema)
    .values({
      status: PROCESS_STATUS.PENDING,
      serviceName: service.name,
      statusDetails: "Process was created and is in queue",
      services: service.name,
      callbackUrl,
      lang,
      name: null,
      year: null,
      isCompleted: 0,
      trailerPage,
      fullAudioTracks: fullAudioTracks ? 1 : 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  const process = processes[0];

  queue.push({
    name: null,
    year: null,
    processId: process.id,
    services: [service],
    trailerPage,
    lang,
    fullAudioTracks: fullAudioTracks ? 1 : 0,
  });

  res.status(201).json({
    processId: process.id,
  });
});

/**
 * @swagger
 * /process/{processId}:
 *   get:
 *     summary: Get the status of a process
 *     tags: [Process]
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
 *                 lang:
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
 *                       thumbnailUrl:
 *                         type: string
 *                       title:
 *                         type: string
 *                       processId:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *                       subtitles:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             language:
 *                               type: string
 *                             trailerId:
 *                               type: string
 *                             url:
 *                               type: string
 *                             createdAt:
 *                               type: string
 *                             updatedAt:
 *                               type: string
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
app.get("/process/:processId", async (req, res) => {
  const { processId } = req.params;
  const process = await findProcess(processId);

  if (!process?.id) {
    return res.status(404).json({
      message: "Process not found",
    });
  }

  res.json(process);
});

/**
 * @swagger
 * /trailers/feed:
 *   get:
 *     summary: Get some trailers from the database
 *     tags: [Trailers]
 *     parameters:
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: number
 *           default: 10
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: number
 *           default: 1
 *     responses:
 *       200:
 *         description: The list of trailers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   url:
 *                     type: string
 *                   thumbnailUrl:
 *                     type: string
 *                   title:
 *                     type: string
 *                   processId:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                   updatedAt:
 *                     type: string
 *                   process:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       status:
 *                         type: string
 *                       statusDetails:
 *                         type: string
 *                       isCompleted:
 *                         type: number
 *                       serviceName:
 *                         type: string
 *                       services:
 *                         type: string
 *                       name:
 *                         type: string
 *                       lang:
 *                         type: string
 *                       year:
 *                         type: number
 *                       trailerPage:
 *                         type: string
 *                       callbackUrl:
 *                         type: string
 *                       callbackError:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                       updatedAt:
 *                         type: string
 *                   subtitles:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         language:
 *                           type: string
 *                         trailerId:
 *                           type: string
 *                         url:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                         updatedAt:
 *                           type: string
 */
app.get("/trailers/feed", async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const page = Number(req.query.page) || 1;

  const trailers = await db
    .select()
    .from(trailersSchema)
    .innerJoin(processSchema, eq(trailersSchema.processId, processSchema.id))
    .where(eq(processSchema.isCompleted, 1))
    .where(eq(processSchema.status, PROCESS_STATUS.DONE))
    .groupBy(processSchema.trailerPage)
    .orderBy(desc(trailersSchema.createdAt))
    .limit(limit)
    .offset(limit * (page - 1));

  const items = trailers.map(({ trailers, process }) => ({
    ...trailers,
    process,
  }));

  const total = await db
    .select({ count: countDistinct(processSchema.trailerPage) })
    .from(trailersSchema)
    .innerJoin(processSchema, eq(trailersSchema.processId, processSchema.id))
    .where(eq(processSchema.isCompleted, 1))
    .where(eq(processSchema.status, PROCESS_STATUS.DONE));

  const totalCount = total[0].count;
  const hasNextPage = totalCount > page * limit;

  res.json({
    items,
    nextPageCursor: hasNextPage ? page + 1 : null,
    total: totalCount,
  });
});

/**
 * @swagger
 * /services:
 *   get:
 *     summary: Get the list of services
 *     tags: [Services]
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
 *                   friendlyName:
 *                     type: string
 *                   domain:
 *                     type: string
 */
app.get("/services", async (req, res) => {
  let allServices = getServices();
  allServices = allServices.map((service) => {
    delete service.func;

    return service;
  });

  res.json(allServices);
});

/**
 * @swagger
 * /all-status:
 *   get:
 *     summary: Get all the status that a process can have
 *     tags: [Extra]
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
app.get("/all-status", async (req, res) => {
  return res.json(Object.values(PROCESS_STATUS));
});

app.get("/", (req, res) => {
  res.redirect("/docs");
});

const PORT = Number(process.env.PORT || "3000");
app.listen(PORT, () => {
  log({
    type: "INFO",
    message: `Server started on port ${PORT} | Temp Folder: ${GLOBAL_TEMP_FOLDER}`,
    level: "important",
  });
});
