import { eq } from 'drizzle-orm';
import db from './index.js';
import { processSchema, trailersSchema } from './schema.js';

export default async function findProcess(id) {
    const [currentProcess] = await db
        .select()
        .from(processSchema)
        .where(eq(processSchema.id, id))
        .leftJoin(trailersSchema, eq(processSchema.id, trailersSchema.processId))

    if (!currentProcess.process) {
        return null
    }

    return { ...currentProcess.process, trailers: currentProcess.trailers || [] };
}