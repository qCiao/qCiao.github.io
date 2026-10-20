/**
 * 生成器：把 posts/*.md（随笔）和 archive/*.md（存档）变成 dist/ 里的静态站点。
 * 用法：node src/build.mjs [--drafts]
 *
 * 文件名以 _ 开头的文件会被跳过，可以拿来做模板。
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { renderMarkdown, plainExcerpt, readingTime } from './markdown.mjs';
import * as T from './templates.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const withDrafts = process.argv.includes('--drafts');

/* ---------------------------- 配置与内容 ---------------------------- */

const config = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));

function stripQuotes(s) {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseFrontMatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw.replace(/^\uFEFF/, ''));
  if (!m) return { data: {}, body: raw };
  const data = {};
  let key = null;

  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const kv = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (kv) {
      key = kv[1];
      const value = kv[2].trim();
      if (value === '') {
        data[key] = [];
      } else if (/^\[.*\]$/.test(value)) {
        data[key] = value
          .slice(1, -1)
          .split(/[,，]/)
          .map((s) => stripQuotes(s))
          .filter(Boolean);
      } else {
        data[key] = stripQuotes(value);
      }
    } else if (key && /^\s*-\s+/.test(line)) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(stripQuotes(line.replace(/^\s*-\s+/, '')));
    }
  }
  return { data, body: m[2] };
}

function parseDate(input, fallback) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/.exec(String(input || ''));
  if (!m) return fallback || new Date();
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 9, m[5] ? +m[5] : 0, 0);
}

function toTags(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : String(value).split(/[,，、]/);
  return [...new Set(list.map((s) => String(s).trim()).filter(Boolean))];
}

function listMarkdown(dir) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .map((file) => ({ file, dir, full: path.join(full, file) }));
}

function parseFile({ file, full }) {
  const raw = fs.readFileSync(full, 'utf8');
  const { data, body } = parseFrontMatter(raw);
  const base = file.replace(/\.md$/, '');
  const dateFromName = /^(\d{4}-\d{2}-\d{2})/.exec(base)?.[1];
  const slug = base.replace(/^\d{4}-\d{2}-\d{2}-?/, '') || base;
  const stat = fs.statSync(full);
  const date = parseDate(data.date || dateFromName, stat.mtime);
  return { data, body, slug, date, raw };
}

function readPosts() {
  return listMarkdown('posts')
    .map((entry) => {
      const { data, body, slug, date } = parseFile(entry);
      return {
        type: 'essay',
        file: entry.file,
        slug,
        title: data.title || slug,
        date,
        tags: toTags(data.tags || data.tag),
        summary: data.summary || plainExcerpt(body),
        draft: String(data.draft) === 'true',
        minutes: readingTime(body),
        raw: body,
        html: renderMarkdown(body),
      };
    })
    .filter((p) => withDrafts || !p.draft)
    .sort((a, b) => b.date - a.date);
}

function readArchive() {
  return listMarkdown('archive')
    .map((entry) => {
      const { data, body, slug, date } = parseFile(entry);
      return {
        type: 'archive',
        file: entry.file,
        slug,
        title: data.title || slug,
        author: data.author || '',
        source: data.source || data.link || '',
        date,
        tags: toTags(data.tags || data.tag),
        draft: String(data.draft) === 'true',
        summary: data.summary || plainExcerpt(body) || (data.author ? `收藏：${data.author}` : ''),
        raw: body,
        html: body.trim() ? renderMarkdown(body) : '',
      };
    })
    .filter((p) => withDrafts || !p.draft)
    .sort((a, b) => b.date - a.date);
}

/* ------------------------------- 写作热力图 ------------------------------- */

/** 每年一行，每格一周（从 1 月 1 日起每 7 天一格），统计随笔篇数 */
function buildHeatmap(posts, now = new Date()) {
  const years = posts.map((p) => p.date.getFullYear());
  const firstYear = years.length ? Math.min(...years) : now.getFullYear();
  const rows = [];

  for (let y = now.getFullYear(); y >= firstYear; y--) {
    const cells = [];
    const dec31 = new Date(y, 11, 31, 23, 59, 59);

    for (let col = 0; col < 53; col++) {
      const start = new Date(y, 0, 1 + col * 7);
      if (start > dec31) break;

      const rawEnd = new Date(y, 0, 1 + col * 7 + 6, 23, 59, 59);
      const end = rawEnd > dec31 ? dec31 : rawEnd;
      const count = posts.filter((p) => p.date >= start && p.date <= end).length;

      cells.push({
        start,
        end,
        count,
        level: count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count === 3 ? 3 : 4,
        future: start > now,
      });
    }

    rows.push({ year: y, cells });
  }

  return rows;
}

/* ------------------------------- 写文件 ------------------------------- */

/** 给样式和脚本加内容指纹，改了内容网址就变，避免浏览器拿旧缓存 */
function assetHash(relPath) {
  const file = path.join(root, relPath);
  if (!fs.existsSync(file)) return '0';
  return crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
}

function write(relPath, content) {
  const target = path.join(dist, relPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(dst, { recursive: true });
      copyDir(src, dst);
    } else if (!entry.name.endsWith('.map')) {
      fs.copyFileSync(src, dst);
    }
  }
}

/* -------------------------------- 主流程 -------------------------------- */

const posts = readPosts();
const archive = readArchive();

const tagCount = new Map();
for (const item of [...posts, ...archive]) {
  for (const t of item.tags) tagCount.set(t, (tagCount.get(t) || 0) + 1);
}
const tags = [...tagCount.entries()]
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'));

const yearCount = new Map();
for (const item of archive) {
  yearCount.set(item.date.getFullYear(), (yearCount.get(item.date.getFullYear()) || 0) + 1);
}
const archiveYears = [...yearCount.entries()]
  .map(([year, count]) => ({ year, count }))
  .sort((a, b) => b.year - a.year);

const ctx = {
  config,
  posts,
  archive,
  tags,
  archiveYears,
  heat: buildHeatmap(posts),
  assets: {
    css: `/assets/styles.css?v=${assetHash('assets/styles.css')}`,
    js: `/assets/app.js?v=${assetHash('assets/app.js')}`,
  },
};

if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

// 首页
write('index.html', T.homePage(ctx));

// 最近文章 + 分页
const perPage = config.perPage || 8;
const totalPages = Math.max(1, Math.ceil(posts.length / perPage));
for (let page = 1; page <= totalPages; page++) {
  const rel = page === 1 ? 'blog/index.html' : `blog/page/${page}/index.html`;
  write(rel, T.listPage(ctx, page, totalPages));
}

// 随笔详情
posts.forEach((post, index) => {
  const newer = posts[index - 1] || null;
  const older = posts[index + 1] || null;
  write(`posts/${post.slug}/index.html`, T.postPage(ctx, post, older, newer));
});

// 存档
write('archive/index.html', T.archivePage(ctx));
archive.forEach((item, index) => {
  const newer = archive[index - 1] || null;
  const older = archive[index + 1] || null;
  write(`archive/${item.slug}/index.html`, T.archiveItemPage(ctx, item, older, newer));
});

// 标签
write('tags/index.html', T.tagsPage(ctx));
for (const tag of tags) {
  const essays = posts.filter((p) => p.tags.includes(tag.name));
  const items = archive.filter((a) => a.tags.includes(tag.name));
  write(`tags/${tag.name}/index.html`, T.tagPostPage(ctx, tag.name, essays, items));
}

// 搜索、关于、404
write('search/index.html', T.searchPage(ctx));

const aboutFile = path.join(root, 'pages', 'about.md');
if (fs.existsSync(aboutFile)) {
  const { body } = parseFrontMatter(fs.readFileSync(aboutFile, 'utf8'));
  write('about/index.html', T.aboutPage(ctx, renderMarkdown(body)));
}

write('404.html', T.notFoundPage(ctx));

// 搜索索引（随笔 + 存档）
const searchIndex = [...posts, ...archive]
  .sort((a, b) => b.date - a.date)
  .map((p) => ({
    title: p.title,
    url: p.type === 'essay' ? T.postUrl(p) : T.archiveUrl(p),
    date: T.fmtShort(p.date),
    type: p.type === 'essay' ? '随笔' : '存档',
    tags: p.tags,
    author: p.author || '',
    summary: p.summary,
    meta: [T.fmtShort(p.date), p.type === 'essay' ? '随笔' : '存档', p.author || '']
      .filter(Boolean)
      .join(' / '),
    text: plainExcerpt(p.raw, 1600),
  }));
write('index.json', JSON.stringify(searchIndex));

// RSS：只放自己写的东西
const siteUrl = config.url.replace(/\/$/, '');
const feedEntries = posts
  .slice(0, 30)
  .map(
    (p) => `  <entry>
    <title type="text">${T.esc(p.title)}</title>
    <link href="${siteUrl}${T.postUrl(p)}" rel="alternate" type="text/html"/>
    <id>${siteUrl}${T.postUrl(p)}</id>
    <published>${T.fmtISOFull(p.date)}</published>
    <updated>${T.fmtISOFull(p.date)}</updated>
    <author><name>${T.esc(config.author)}</name></author>
    <summary type="text">${T.esc(p.summary)}</summary>
    <content type="html">${T.esc(p.html)}</content>
  </entry>`
  )
  .join('\n');

const feed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${config.lang || 'zh-CN'}">
  <title type="text">${T.esc(config.title)}</title>
  <subtitle type="text">${T.esc(config.tagline)}</subtitle>
  <link href="${siteUrl}/feed.xml" rel="self" type="application/atom+xml"/>
  <link href="${siteUrl}/" rel="alternate" type="text/html"/>
  <id>${siteUrl}/</id>
  <updated>${posts[0] ? T.fmtISOFull(posts[0].date) : T.fmtISOFull(new Date())}</updated>
  <author><name>${T.esc(config.author)}</name></author>
  <generator>blog/src/build.mjs</generator>
${feedEntries}
</feed>
`;
write('feed.xml', feed);

// sitemap
const urls = [
  '/',
  '/blog/',
  ...Array.from({ length: totalPages - 1 }, (_, i) => `/blog/page/${i + 2}/`),
  '/archive/',
  '/tags/',
  '/search/',
  '/about/',
  ...posts.map((p) => T.postUrl(p)),
  ...archive.map((a) => T.archiveUrl(a)),
  ...tags.map((t) => T.tagUrl(t.name)),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${siteUrl}${u}</loc></url>`).join('\n')}
</urlset>
`;
write('sitemap.xml', sitemap);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);

// 静态资源
copyDir(path.join(root, 'assets'), path.join(dist, 'assets'));
write('.nojekyll', '');

console.log(
  `✓ 生成完成：随笔 ${posts.length} 篇，存档 ${archive.length} 篇，标签 ${tags.length} 个`
);
console.log(`  输出目录：${dist}`);
