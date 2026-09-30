import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const literature = sqliteTable(
  'literature',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    normalizedTitle: text('normalized_title').notNull(),
    year: integer('year').notNull(),
    abstract: text('abstract').notNull().default(''),
    type: text('type').notNull(),
    source: text('source').notNull().default(''),
    url: text('url').notNull().default(''),
    innovation: text('innovation').notNull().default(''),
    tags: text('tags').notNull().default('[]'),
    boldFields: text('bold_fields').notNull().default('[]'),
    recordedDate: text('recorded_date').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_literature_normalized_title').on(table.normalizedTitle),
    index('idx_literature_recorded_date').on(table.recordedDate),
    index('idx_literature_type').on(table.type),
  ],
);
