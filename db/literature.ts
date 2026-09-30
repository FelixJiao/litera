import { env } from '../server/sqlite-d1';

let ready: Promise<D1Database> | undefined;

export function normalizeTitle(title: string) {
  return title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-CN');
}

export function getLiteratureStore() {
  if (!ready) ready = initializeStore();
  return ready;
}

async function initializeStore() {
  const database = env.DB;
  if (!database) throw new Error('云端数据库暂不可用');

  await database.batch([
    database.prepare(`CREATE TABLE IF NOT EXISTS literature (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      normalized_title TEXT NOT NULL,
      year INTEGER NOT NULL,
      abstract TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      innovation TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      bold_fields TEXT NOT NULL DEFAULT '[]',
      recorded_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`),
    database.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_literature_normalized_title
      ON literature(normalized_title)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_literature_recorded_date
      ON literature(recorded_date)`),
    database.prepare(`CREATE INDEX IF NOT EXISTS idx_literature_type
      ON literature(type)`),
  ]);

  const tableInfo = await database.prepare('PRAGMA table_info(literature)').all<{ name: string }>();
  const columns = new Set((tableInfo.results ?? []).map((column) => column.name));
  if (!columns.has('source')) {
    await database.prepare("ALTER TABLE literature ADD COLUMN source TEXT NOT NULL DEFAULT ''").run();
  }
  if (!columns.has('url')) {
    await database.prepare("ALTER TABLE literature ADD COLUMN url TEXT NOT NULL DEFAULT ''").run();
  }
  await database.prepare('PRAGMA optimize').run();
  return database;
}
