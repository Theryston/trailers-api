import { eq } from 'drizzle-orm';
import db from './index.js';
import { processSchema, trailersSchema } from './schema.js';

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

    return { ...currentProcess, trailers };
}