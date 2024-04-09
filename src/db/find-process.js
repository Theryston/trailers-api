import { eq } from 'drizzle-orm';
import db from './index.js';
import { processSchema, subtitlesSchema, trailersSchema } from './schema.js';

export default async function findProcess(id) {
    const [currentProcess] = await db
        .select()
        .from(processSchema)
        .where(eq(processSchema.id, id))

    if (!currentProcess) {
        return null
    }

    const trailers = await db
        .select()
        .from(trailersSchema)
        .where(eq(trailersSchema.processId, id))

    for (let i = 0; i < trailers.length; i++) {
        const trailer = trailers[i];

        const subtitles = await db
            .select()
            .from(subtitlesSchema)
            .where(eq(subtitlesSchema.trailerId, trailer.id))

        trailers[i] = { ...trailer, subtitles };
    }

    return { ...currentProcess, trailers };
}