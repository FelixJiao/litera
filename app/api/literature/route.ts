import { NextRequest, NextResponse } from 'next/server';
import { getLiteratureStore, normalizeTitle } from '../../../db/literature';

const allowedTypes = ['期刊论文', '学位论文', '会议论文', '综述论文', '预印本', '其他'];
const allowedBoldFields = ['title', 'abstract', 'innovation'];

type LiteratureRow = {
  id: string;
  title: string;
  year: number;
  abstract: string;
  type: string;
  source: string;
  url: string;
  innovation: string;
  tags: string;
  boldFields: string;
  recordedDate: string;
  createdAt: string;
};

export async function GET() {
  try {
    const database = await getLiteratureStore();
    const result = await database.prepare(`SELECT
      id, title, year, abstract, type, source, url, innovation, tags,
      bold_fields AS boldFields, recorded_date AS recordedDate, created_at AS createdAt
      FROM literature
      ORDER BY recorded_date DESC, created_at DESC`).all<LiteratureRow>();

    const entries = (result.results ?? []).map((row) => ({
      ...row,
      tags: safeArray(row.tags),
      boldFields: safeArray(row.boldFields),
    }));
    return NextResponse.json({ entries });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: '文献数据暂时无法读取，请稍后重试。' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const title = String(body.title ?? '').trim().replace(/\s+/g, ' ');
    const normalizedTitle = normalizeTitle(title);
    const year = Number(body.year);
    const type = String(body.type ?? '期刊论文');
    const source = String(body.source ?? '').trim();
    const url = String(body.url ?? '').trim();
    const abstract = String(body.abstract ?? '').trim();
    const innovation = String(body.innovation ?? '').trim();
    const recordedDate = String(body.recordedDate ?? '');
    const tags = Array.isArray(body.tags)
      ? body.tags.map(String).map((tag) => tag.trim()).filter(Boolean).slice(0, 12)
      : [];
    const boldFields = Array.isArray(body.boldFields)
      ? body.boldFields.map(String).filter((field) => allowedBoldFields.includes(field))
      : [];

    if (!title) {
      return NextResponse.json({ field: 'title', message: '请输入文献标题。' }, { status: 400 });
    }
    if (!Number.isInteger(year) || year < 1000 || year > new Date().getFullYear() + 1) {
      return NextResponse.json({ field: 'year', message: '请输入有效的文献年份。' }, { status: 400 });
    }
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ field: 'type', message: '请选择有效的文献类型。' }, { status: 400 });
    }
    if (!source) {
      return NextResponse.json({ field: 'source', message: '请填写文献来源。' }, { status: 400 });
    }
    if (url && !isValidHttpUrl(url)) {
      return NextResponse.json({ field: 'url', message: '请输入以 http:// 或 https:// 开头的有效链接。' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(recordedDate)) {
      return NextResponse.json({ field: 'recordedDate', message: '请选择阅读日期。' }, { status: 400 });
    }

    const database = await getLiteratureStore();
    const duplicate = await database.prepare(
      'SELECT id FROM literature WHERE normalized_title = ? LIMIT 1',
    ).bind(normalizedTitle).first();
    if (duplicate) {
      return NextResponse.json({ field: 'title', message: '该标题已存在，请勿重复添加。' }, { status: 409 });
    }

    const entry = {
      id: crypto.randomUUID(),
      title,
      year,
      abstract,
      type,
      source,
      url,
      innovation,
      tags,
      boldFields,
      recordedDate,
      createdAt: new Date().toISOString(),
    };

    await database.prepare(`INSERT INTO literature
      (id, title, normalized_title, year, abstract, type, source, url, innovation, tags, bold_fields, recorded_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(entry.id, entry.title, normalizedTitle, entry.year, entry.abstract, entry.type,
        entry.source, entry.url, entry.innovation, JSON.stringify(entry.tags), JSON.stringify(entry.boldFields),
        entry.recordedDate, entry.createdAt)
      .run();

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error(error);
    if (String(error).toLowerCase().includes('unique')) {
      return NextResponse.json({ field: 'title', message: '该标题已存在，请勿重复添加。' }, { status: 409 });
    }
    return NextResponse.json({ message: '保存失败，请稍后重试。' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = String(body.id ?? '');
    const title = String(body.title ?? '').trim().replace(/\s+/g, ' ');
    const normalizedTitle = normalizeTitle(title);
    const year = Number(body.year);
    const type = String(body.type ?? '期刊论文');
    const source = String(body.source ?? '').trim();
    const url = String(body.url ?? '').trim();
    const abstract = String(body.abstract ?? '').trim();
    const innovation = String(body.innovation ?? '').trim();
    const recordedDate = String(body.recordedDate ?? '');
    const tags = Array.isArray(body.tags)
      ? body.tags.map(String).map((tag) => tag.trim()).filter(Boolean).slice(0, 12)
      : [];
    const boldFields = Array.isArray(body.boldFields)
      ? body.boldFields.map(String).filter((field) => allowedBoldFields.includes(field))
      : [];

    if (!id) {
      return NextResponse.json({ message: '缺少要修改的文献编号。' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ field: 'title', message: '请输入文献标题。' }, { status: 400 });
    }
    if (!Number.isInteger(year) || year < 1000 || year > new Date().getFullYear() + 1) {
      return NextResponse.json({ field: 'year', message: '请输入有效的文献年份。' }, { status: 400 });
    }
    if (!allowedTypes.includes(type)) {
      return NextResponse.json({ field: 'type', message: '请选择有效的文献类型。' }, { status: 400 });
    }
    if (!source) {
      return NextResponse.json({ field: 'source', message: '请填写文献来源。' }, { status: 400 });
    }
    if (url && !isValidHttpUrl(url)) {
      return NextResponse.json({ field: 'url', message: '请输入以 http:// 或 https:// 开头的有效链接。' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(recordedDate)) {
      return NextResponse.json({ field: 'recordedDate', message: '请选择阅读日期。' }, { status: 400 });
    }

    const database = await getLiteratureStore();
    const existing = await database.prepare(
      'SELECT created_at AS createdAt FROM literature WHERE id = ? LIMIT 1',
    ).bind(id).first<{ createdAt: string }>();
    if (!existing) {
      return NextResponse.json({ message: '未找到这条文献，它可能已被移除。' }, { status: 404 });
    }

    const duplicate = await database.prepare(
      'SELECT id FROM literature WHERE normalized_title = ? AND id <> ? LIMIT 1',
    ).bind(normalizedTitle, id).first();
    if (duplicate) {
      return NextResponse.json({ field: 'title', message: '该标题已被另一条文献使用。' }, { status: 409 });
    }

    await database.prepare(`UPDATE literature SET
      title = ?, normalized_title = ?, year = ?, abstract = ?, type = ?, source = ?, url = ?, innovation = ?,
      tags = ?, bold_fields = ?, recorded_date = ?
      WHERE id = ?`)
      .bind(title, normalizedTitle, year, abstract, type, source, url, innovation,
        JSON.stringify(tags), JSON.stringify(boldFields), recordedDate, id)
      .run();

    return NextResponse.json({
      entry: {
        id,
        title,
        year,
        abstract,
        type,
        source,
        url,
        innovation,
        tags,
        boldFields,
        recordedDate,
        createdAt: existing.createdAt,
      },
    });
  } catch (error) {
    console.error(error);
    if (String(error).toLowerCase().includes('unique')) {
      return NextResponse.json({ field: 'title', message: '该标题已被另一条文献使用。' }, { status: 409 });
    }
    return NextResponse.json({ message: '修改失败，请稍后重试。' }, { status: 500 });
  }
}

function safeArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
