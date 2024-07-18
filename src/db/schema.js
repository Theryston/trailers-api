import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { v4 as uuid } from 'uuid';
import { PROCESS_STATUS } from '../constants.js';
import { sql } from 'drizzle-orm';

export const processSchema = sqliteTable('process', {
    id: text('id').primaryKey().$defaultFn(() => uuid()).notNull(),
    status: text('status').$type(...Object.values(PROCESS_STATUS)).notNull(),
    statusDetails: text('status_details').notNull(),
    isCompleted: integer('is_completed').default(0).notNull(),
    serviceName: text('service_name').notNull(),
    services: text('services').notNull(),
    name: text('name'),
    year: integer('year'),
    lang: text('lang'),
    fullAudioTracks: integer('full_audio_tracks').notNull().default(0),
    trailerPage: text('trailer_page'),
    callbackUrl: text('callback_url'),
    callbackError: text('callback_error'),
    createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull(),
})

export const trailersSchema = sqliteTable('trailers', {
    id: text('id').primaryKey().$defaultFn(() => uuid()).notNull(),
    url: text('url').notNull(),
    thumbnailUrl: text('thumbnail_url').notNull(),
    title: text('title'),
    processId: text('process_id').notNull().references(() => processSchema.id),
    createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull(),
})

export const subtitlesSchema = sqliteTable('subtitles', {
    id: text('id').primaryKey().$defaultFn(() => uuid()).notNull(),
    language: text('language').notNull(),
    trailerId: text('trailer_id').notNull().references(() => trailersSchema.id),
    url: text('url').notNull(),
    createdAt: integer("created_at", { mode: 'timestamp' }).notNull().$default(sql`CURRENT_TIMESTAMP`),
    updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull(),
})
