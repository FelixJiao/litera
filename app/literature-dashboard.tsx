'use client';

import { FormEvent, TextareaHTMLAttributes, useEffect, useMemo, useState } from 'react';

type LiteratureEntry = {
  id: string;
  title: string;
  year: number;
  abstract: string;
  type: string;
  source: string;
  url: string;
  innovation: string;
  tags: string[];
  boldFields: string[];
  recordedDate: string;
  createdAt: string;
};

type FormState = {
  title: string;
  year: string;
  abstract: string;
  type: string;
  source: string;
  url: string;
  innovation: string;
  tags: string;
  recordedDate: string;
  boldFields: string[];
};

const literatureTypes = ['期刊论文', '学位论文', '会议论文', '综述论文', '预印本', '其他'];
const typeColors: Record<string, string> = {
  期刊论文: '#4c82ad',
  学位论文: '#d5a75e',
  会议论文: '#789a8d',
  综述论文: '#967ba5',
  预印本: '#d7836c',
  其他: '#9ca3a9',
};
const sourceLabels: Record<string, string> = {
  期刊论文: '期刊名称',
  学位论文: '高校名称',
  会议论文: '会议名称',
  综述论文: '来源期刊',
  预印本: '预印本平台',
  其他: '文献来源',
};

const today = localDateISO(new Date());

function emptyForm(): FormState {
  return {
    title: '',
    year: String(new Date().getFullYear()),
    abstract: '',
    type: '期刊论文',
    source: '',
    url: '',
    innovation: '',
    tags: '',
    recordedDate: today,
    boldFields: [],
  };
}

export default function LiteratureDashboard() {
  const [entries, setEntries] = useState<LiteratureEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('全部类型');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LiteratureEntry | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('litera-theme');
    if (savedTheme === 'light') setTheme('light');
  }, []);

  useEffect(() => {
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('litera-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!showForm && !selectedEntry) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showForm) setShowForm(false);
        else setSelectedEntry(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showForm, selectedEntry]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function loadEntries() {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch('/api/literature', { cache: 'no-store' });
      const data = await response.json() as { entries?: LiteratureEntry[]; message?: string };
      if (!response.ok) throw new Error(data.message);
      setEntries(data.entries ?? []);
    } catch {
      setLoadError('云端数据暂时无法读取，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }

  const selectedEntries = useMemo(
    () => entries.filter((entry) => entry.recordedDate === selectedDate),
    [entries, selectedDate],
  );

  const visibleEntries = useMemo(() => {
    const needle = normalize(search);
    return entries.filter((entry) => {
      const matchesType = typeFilter === '全部类型' || entry.type === typeFilter;
      const haystack = normalize([entry.title, entry.source, entry.url, entry.abstract, entry.innovation, ...entry.tags].join(' '));
      return matchesType && (!needle || haystack.includes(needle));
    });
  }, [entries, search, typeFilter]);

  const sevenDays = useMemo(() => {
    const end = parseISODate(selectedDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(end);
      date.setDate(end.getDate() - (6 - index));
      const iso = localDateISO(date);
      return {
        iso,
        label: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
        count: entries.filter((entry) => entry.recordedDate === iso).length,
      };
    });
  }, [entries, selectedDate]);

  const maxDaily = Math.max(1, ...sevenDays.map((day) => day.count));
  const distribution = literatureTypes
    .map((type) => ({ type, count: selectedEntries.filter((entry) => entry.type === type).length }))
    .filter((item) => item.count > 0);
  const donutStyle = buildDonut(distribution, selectedEntries.length);

  const duplicateTitle = useMemo(() => {
    const value = normalize(form.title);
    return Boolean(value && entries.some((entry) => entry.id !== editingId && normalize(entry.title) === value));
  }, [editingId, entries, form.title]);

  function openForm() {
    setEditingId(null);
    setForm({ ...emptyForm(), recordedDate: selectedDate });
    setFormError('');
    setShowForm(true);
  }

  function openEdit(entry: LiteratureEntry) {
    setEditingId(entry.id);
    setForm({
      title: entry.title,
      year: String(entry.year),
      abstract: entry.abstract,
      type: entry.type,
      source: entry.source,
      url: entry.url,
      innovation: entry.innovation,
      tags: entry.tags.join('，'),
      recordedDate: entry.recordedDate,
      boldFields: [...entry.boldFields],
    });
    setFormError('');
    setSelectedEntry(null);
    setShowForm(true);
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError('');
  }

  function toggleBold(field: string) {
    updateForm(
      'boldFields',
      form.boldFields.includes(field)
        ? form.boldFields.filter((item) => item !== field)
        : [...form.boldFields, field],
    );
  }

  async function submitEntry(event: FormEvent) {
    event.preventDefault();
    if (duplicateTitle) {
      setFormError('该标题已存在，请勿重复添加。');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const response = await fetch('/api/literature', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          id: editingId,
          year: Number(form.year),
          tags: form.tags.split(/[，,]/).map((tag) => tag.trim()).filter(Boolean),
        }),
      });
      const data = await response.json() as { entry?: LiteratureEntry; message?: string };
      if (!response.ok || !data.entry) throw new Error(data.message || '保存失败');
      setEntries((current) => (
        editingId
          ? current.map((entry) => entry.id === editingId ? data.entry! : entry).sort(sortEntries)
          : [data.entry!, ...current].sort(sortEntries)
      ));
      setSelectedDate(data.entry.recordedDate);
      setShowForm(false);
      setEditingId(null);
      setToast(editingId ? '修改已保存到云端' : '文献已保存到云端');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '保存失败，请稍后重试。');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="workspace-shell" data-theme={theme}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">L</div>
          <div><strong>Litera</strong><span>每日文献工作台</span></div>
        </div>
        <nav aria-label="主导航">
          <a className="nav-item active" href="#overview"><span>◫</span> 今日概览</a>
          <a className="nav-item" href="#library"><span>▤</span> 文献库</a>
          <a className="nav-item" href="#statistics"><span>⌁</span> 阅读统计</a>
        </nav>
        <button className="theme-toggle" type="button" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}>
          <span>{theme === 'dark' ? '☀' : '☾'}</span><strong>{theme === 'dark' ? '浅色模式' : '深色模式'}</strong>
        </button>
        <div className="sidebar-foot">
          <span className={loadError ? 'sync-dot offline' : 'sync-dot'} />
          <div><strong>{loadError ? '同步待恢复' : '云端已连接'}</strong><small>{loading ? '正在同步…' : '数据自动保存'}</small></div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p>{formatFullDate(selectedDate)}</p>
            <h1>{selectedDate === today ? '今天读了什么？' : '这一天读了什么？'}</h1>
          </div>
          <button className="primary-button" type="button" onClick={openForm}><span>＋</span> 添加文献</button>
        </header>

        <section className="hero-grid" id="overview">
          <article className="daily-card">
            <div className="card-tools">
              <div className="eyebrow">所选日期阅读</div>
              <label className="date-picker"><span>选择日期</span><input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} /></label>
            </div>
            <div className="daily-number">{selectedEntries.length} <span>篇</span></div>
            <p>{selectedEntries.length ? `已记录 ${new Set(selectedEntries.map((entry) => entry.type)).size} 类文献` : '还没有记录，添加第一篇文献吧'}</p>
            <div className="mini-bars" aria-label="近七日阅读趋势">
              {sevenDays.map((day) => (
                <div key={day.iso} title={`${day.iso}：${day.count} 篇`}>
                  <b>{day.count || ''}</b>
                  <i className={day.iso === selectedDate ? 'current' : ''} style={{ height: `${Math.max(10, (day.count / maxDaily) * 72)}px` }} />
                  <small>{day.label}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="distribution-card" id="statistics">
            <div className="section-heading">
              <div><span>分类分布</span><strong>{formatShortDate(selectedDate)} 阅读构成</strong></div>
              <span className="total-caption">共 {selectedEntries.length} 篇</span>
            </div>
            <div className="distribution-body">
              <div className="donut" style={{ background: donutStyle }}><div><strong>{selectedEntries.length}</strong><span>总计</span></div></div>
              {distribution.length ? (
                <ul>{distribution.map((item) => (
                  <li key={item.type}><i style={{ background: typeColors[item.type] }} /><span>{item.type}</span><strong>{item.count}</strong></li>
                ))}</ul>
              ) : (
                <div className="distribution-empty"><strong>暂无分类数据</strong><span>添加条目后自动汇总</span></div>
              )}
            </div>
          </article>
        </section>

        <section className="library-section" id="library">
          <div className="section-title-row">
            <div><span className="eyebrow">全部记录</span><h2>文献阅读列表 <em>{entries.length}</em></h2></div>
            <div className="list-actions">
              <label className="search-field"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索标题、标签或摘要" aria-label="搜索文献" /></label>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="按类型筛选">
                <option>全部类型</option>{literatureTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>
          </div>

          {loadError ? (
            <div className="state-panel error-state"><strong>暂时无法连接云端</strong><span>{loadError}</span><button onClick={loadEntries}>重新加载</button></div>
          ) : loading ? (
            <div className="state-panel"><span className="loading-mark" /><strong>正在整理你的文献库…</strong></div>
          ) : visibleEntries.length ? (
            <div className="entry-list">
              {visibleEntries.map((entry, index) => (
                <article className="entry" key={entry.id}>
                  <div className="date-column"><strong>{parseISODate(entry.recordedDate).getDate()}</strong><span>{parseISODate(entry.recordedDate).getMonth() + 1}月</span></div>
                  <div className="entry-main">
                    <div className="entry-top">
                      <div className="entry-kicker"><p><i style={{ background: typeColors[entry.type] }} />{entry.year} · {entry.type}</p>{entry.source && <span>{sourceLabels[entry.type] ?? '来源'} · {entry.source}</span>}</div>
                      <div className="entry-actions"><time>{entry.recordedDate}</time><button type="button" onClick={() => setSelectedEntry(entry)}>查看详情 <span>→</span></button></div>
                    </div>
                    <h3 className={entry.boldFields.includes('title') ? 'is-bold' : ''}>{entry.title}</h3>
                    {entry.abstract && <p className={entry.boldFields.includes('abstract') ? 'abstract-text is-bold' : 'abstract-text'}><span>摘要</span>{entry.abstract}</p>}
                    {entry.innovation && <p className={entry.boldFields.includes('innovation') ? 'innovation is-bold' : 'innovation'}><span>创新点</span>{entry.innovation}</p>}
                    {entry.tags.length > 0 && <div className="tags">{entry.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
                  </div>
                  <div className="entry-index">{String(index + 1).padStart(2, '0')}</div>
                </article>
              ))}
            </div>
          ) : (
            <div className="state-panel empty-state"><span className="empty-icon">＋</span><strong>{entries.length ? '没有符合条件的文献' : '从今天的第一篇开始'}</strong><span>{entries.length ? '试试更换搜索词或类型筛选' : '记录摘要与创新点，日后回溯会更轻松'}</span>{!entries.length && <button onClick={openForm}>添加文献</button>}</div>
          )}
        </section>
      </section>

      {selectedEntry && !showForm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSelectedEntry(null); }}>
          <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title">
            <header>
              <div><span className="eyebrow">阅读记录详情</span><h2 id="detail-title">文献信息</h2></div>
              <button type="button" onClick={() => setSelectedEntry(null)} aria-label="关闭">×</button>
            </header>
            <div className="detail-content">
              <div className="detail-meta">
                <span><i style={{ background: typeColors[selectedEntry.type] }} />{selectedEntry.type}</span>
                <span>{selectedEntry.year} 年</span>
                {selectedEntry.source && <span>{sourceLabels[selectedEntry.type] ?? '来源'} · {selectedEntry.source}</span>}
                <span>阅读于 {selectedEntry.recordedDate}</span>
              </div>
              <h3 className={selectedEntry.boldFields.includes('title') ? 'is-bold' : ''}>{selectedEntry.title}</h3>

              <section className="detail-section">
                <div className="detail-section-label"><span>01</span><strong>摘要</strong></div>
                <p className={selectedEntry.boldFields.includes('abstract') ? 'is-bold' : ''}>{selectedEntry.abstract || '暂未填写摘要。'}</p>
              </section>
              <section className="detail-section innovation-detail">
                <div className="detail-section-label"><span>02</span><strong>主要创新点</strong></div>
                <p className={selectedEntry.boldFields.includes('innovation') ? 'is-bold' : ''}>{selectedEntry.innovation || '暂未填写主要创新点。'}</p>
              </section>
              <section className="detail-section tags-detail">
                <div className="detail-section-label"><span>03</span><strong>标签</strong></div>
                {selectedEntry.tags.length ? <div className="tags">{selectedEntry.tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : <p>暂未添加标签。</p>}
              </section>
              <section className="detail-section link-detail">
                <div className="detail-section-label"><span>04</span><strong>文献链接</strong></div>
                {selectedEntry.url ? <a href={selectedEntry.url} target="_blank" rel="noreferrer">打开原文链接 <span>↗</span></a> : <p>暂未记录文献链接。</p>}
              </section>
            </div>
            <footer><span>创建于 {formatCreatedAt(selectedEntry.createdAt)}</span><button className="primary-button" type="button" onClick={() => openEdit(selectedEntry)}><span>✎</span> 编辑文献</button></footer>
          </section>
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowForm(false); }}>
          <section className="entry-modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
            <header><div><span className="eyebrow">{editingId ? '更新阅读记录' : '新阅读记录'}</span><h2 id="form-title">{editingId ? '编辑文献' : '添加文献'}</h2></div><button type="button" onClick={() => setShowForm(false)} aria-label="关闭">×</button></header>
            <form onSubmit={submitEntry}>
              <div className="form-grid three-cols">
                <label><span>阅读日期</span><input required type="date" value={form.recordedDate} onChange={(event) => updateForm('recordedDate', event.target.value)} /></label>
                <label><span>文献年份</span><input required type="number" min="1000" max={new Date().getFullYear() + 1} value={form.year} onChange={(event) => updateForm('year', event.target.value)} /></label>
                <label><span>文献类型</span><select value={form.type} onChange={(event) => updateForm('type', event.target.value)}>{literatureTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
              </div>

              <div className="form-grid two-cols source-fields">
                <label><span>{sourceLabels[form.type] ?? '文献来源'}</span><input required value={form.source} onChange={(event) => updateForm('source', event.target.value)} placeholder={sourcePlaceholder(form.type)} /></label>
                <label><span>文献 URL <small>可选</small></span><input type="url" value={form.url} onChange={(event) => updateForm('url', event.target.value)} placeholder="https://doi.org/… 或原文链接" /></label>
              </div>

              <FieldWithBold label="文献标题" field="title" active={form.boldFields.includes('title')} onToggle={toggleBold} hint="标题必须唯一">
                <AutoTextarea required rows={1} className={form.boldFields.includes('title') ? 'is-bold' : ''} value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="输入完整标题" aria-invalid={duplicateTitle} autoFocus />
              </FieldWithBold>
              {duplicateTitle && <p className="field-error">该标题已存在，请勿重复添加。</p>}

              <FieldWithBold label="摘要" field="abstract" active={form.boldFields.includes('abstract')} onToggle={toggleBold} hint="可选">
                <AutoTextarea rows={3} className={form.boldFields.includes('abstract') ? 'is-bold' : ''} value={form.abstract} onChange={(event) => updateForm('abstract', event.target.value)} placeholder="粘贴或整理文献摘要，输入框会自动增高" />
              </FieldWithBold>

              <FieldWithBold label="主要创新点" field="innovation" active={form.boldFields.includes('innovation')} onToggle={toggleBold} hint="建议填写">
                <AutoTextarea rows={2} className={form.boldFields.includes('innovation') ? 'is-bold' : ''} value={form.innovation} onChange={(event) => updateForm('innovation', event.target.value)} placeholder="用一两句话概括这篇文献的新意" />
              </FieldWithBold>

              <label className="full-field"><span>标签 <small>用逗号分隔</small></span><input value={form.tags} onChange={(event) => updateForm('tags', event.target.value)} placeholder="例如：交通韧性，复杂网络，恢复策略" /></label>

              {formError && <p className="form-error" role="alert">{formError}</p>}
              <footer><span>所有修改将同步到云端</span><div><button className="secondary-button" type="button" onClick={() => setShowForm(false)}>取消</button><button className="primary-button" type="submit" disabled={saving || duplicateTitle}>{saving ? '正在保存…' : editingId ? '保存修改' : '保存文献'}</button></div></footer>
            </form>
          </section>
        </div>
      )}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}

function FieldWithBold({ label, field, active, onToggle, hint, children }: { label: string; field: string; active: boolean; onToggle: (field: string) => void; hint: string; children: React.ReactNode }) {
  return (
    <label className="full-field">
      <span className="field-label"><span>{label} <small>{hint}</small></span><button className={active ? 'bold-button active' : 'bold-button'} type="button" aria-pressed={active} onClick={() => onToggle(field)} title="切换加粗">B</button></span>
      {children}
    </label>
  );
}

function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} onInput={(event) => { event.currentTarget.style.height = 'auto'; event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`; props.onInput?.(event); }} />;
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-CN');
}

function localDateISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseISODate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(parseISODate(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(parseISODate(value));
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value));
}

function sourcePlaceholder(type: string) {
  const examples: Record<string, string> = {
    期刊论文: '例如：Transportation Research Part A',
    学位论文: '例如：同济大学',
    会议论文: '例如：TRB Annual Meeting',
    综述论文: '例如：Nature Reviews',
    预印本: '例如：arXiv',
    其他: '填写出版社、数据库或机构名称',
  };
  return examples[type] ?? '填写文献来源';
}

function sortEntries(a: LiteratureEntry, b: LiteratureEntry) {
  return b.recordedDate.localeCompare(a.recordedDate) || b.createdAt.localeCompare(a.createdAt);
}

function buildDonut(items: { type: string; count: number }[], total: number) {
  if (!total) return 'var(--line)';
  let start = 0;
  const stops = items.map((item) => {
    const end = start + (item.count / total) * 100;
    const result = `${typeColors[item.type]} ${start}% ${end}%`;
    start = end;
    return result;
  });
  return `conic-gradient(${stops.join(', ')})`;
}
