/**
 * 页面模板。所有函数都返回 HTML 字符串，由 build.mjs 写进 dist/。
 *
 * 两类内容：
 *   随笔（posts/）    → /blog/ 与 /posts/<slug>/
 *   存档（archive/）  → /archive/ 与 /archive/<slug>/
 */

const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const pad = (n) => String(n).padStart(2, '0');

export const fmtShort = (d) => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
export const fmtLong = (d) => `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
export const fmtISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fmtISOFull = (d) =>
  `${fmtISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+08:00`;
export const weekday = (d) => WEEK[d.getDay()];

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const postUrl = (p) => `/posts/${p.slug}/`;
export const archiveUrl = (a) => `/archive/${a.slug}/`;
export const tagUrl = (t) => `/tags/${encodeURIComponent(t)}/`;

/* ------------------------------------------------------------------ *
 * 骨架
 * ------------------------------------------------------------------ */

function header(config, active) {
  const nav = config.nav
    .map(
      (item) =>
        `<a class="nav-link${active === item.href ? ' is-active' : ''}" href="${item.href}"${
          active === item.href ? ' aria-current="page"' : ''
        }>${esc(item.label)}</a>`
    )
    .join('\n        ');

  return `<header class="site-header">
    <div class="wrap header-inner">
      <div class="brand">
        <p class="brand-name"><a href="/">${esc(config.title)}</a></p>
        <p class="brand-tagline">${esc(config.tagline)}</p>
      </div>
      <nav class="site-nav" aria-label="主导航">
        ${nav}
        <button class="theme-toggle" type="button" aria-label="切换深浅色" title="切换深浅色">
          <span aria-hidden="true">◐</span>
        </button>
      </nav>
    </div>
  </header>`;
}

function sidebar(ctx) {
  const { config, tags, posts, archive, archiveYears } = ctx;
  const limit = config.sidebar?.tagLimit ?? 8;
  const topTags = tags.slice(0, limit);

  const tagList = topTags
    .map(
      (t) =>
        `<li><a href="${tagUrl(t.name)}"><span>${esc(t.name)}</span><em>${t.count}</em></a></li>`
    )
    .join('\n          ');

  const avatar = config.sidebar?.avatar
    ? `<img class="avatar" src="${config.sidebar.avatar}" alt="${esc(config.title)}" width="84" height="84" loading="lazy">`
    : '';

  const shelfWidget = archive.length
    ? `<section class="widget">
        <h2 class="widget-title">存档</h2>
        <ul class="mini-list">
          ${archiveYears
            .map(
              (y) =>
                `<li><a href="/archive/"><span>${y.year}</span><em>${y.count}</em></a></li>`
            )
            .join('\n          ')}
        </ul>
        <p class="widget-link"><a href="/archive/">全部存档 →</a></p>
      </section>`
    : '';

  return `<aside class="sidebar" aria-label="侧栏">
      <section class="widget widget-about">
        ${avatar}
        <h2 class="widget-title">关于</h2>
        <p class="widget-text">${esc(config.sidebar?.about || config.description)}</p>
        <p class="widget-link"><a href="/about/">了解更多 →</a></p>
      </section>
      ${
        topTags.length
          ? `<section class="widget">
        <h2 class="widget-title">标签</h2>
        <ul class="mini-list">
          ${tagList}
        </ul>
        <p class="widget-link"><a href="/tags/">全部标签 →</a></p>
      </section>`
          : ''
      }
      ${shelfWidget}
      <section class="widget widget-sub">
        <p class="widget-text">订阅：<a href="/feed.xml">RSS</a>　·　<a href="/search/">搜索</a></p>
        <p class="widget-text widget-muted">随笔 ${posts.length} 篇　·　存档 ${archive.length} 篇</p>
      </section>
    </aside>`;
}

function footer(config) {
  const year = new Date().getFullYear();
  return `<footer class="site-footer">
    <div class="wrap footer-inner">
      <p class="copyright">© ${year} ${esc(config.author || config.title)}</p>
      <p class="footer-links"><a href="/feed.xml">RSS</a><span>/</span><a href="/archive/">存档</a><span>/</span><a href="/about/">关于我</a></p>
      <p class="colophon">${esc(config.footer || '')}</p>
    </div>
  </footer>`;
}

export function layout(ctx, { title, description, body, active, path, pageTitle }) {
  const { config } = ctx;
  const fullTitle = title ? `${title} · ${config.title}` : `${config.title} · ${config.tagline}`;
  const desc = description || config.description;
  const canonical =
    config.url && !/example\.com/.test(config.url) ? config.url.replace(/\/$/, '') + path : '';

  return `<!doctype html>
<html lang="${config.lang || 'zh-CN'}" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="author" content="${esc(config.author || config.title)}">
  <meta property="og:title" content="${esc(fullTitle)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:type" content="${pageTitle || 'website'}">
  ${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
  <link rel="stylesheet" href="${ctx.assets?.css || '/assets/styles.css'}">
  <link rel="alternate" type="application/atom+xml" title="${esc(config.title)}" href="/feed.xml">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <script>(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body>
  <a class="skip-link" href="#main">跳到正文</a>
  ${header(config, active)}
  <div class="wrap">
    <div class="layout${config.sidebar?.position === 'left' ? ' is-left' : ''}">
      <main id="main" class="content">
${body}
      </main>
      ${sidebar(ctx)}
    </div>
  </div>
  ${heatBand(ctx)}
  ${footer(config)}
  <script src="${ctx.assets?.js || '/assets/app.js'}" defer></script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ *
 * 零件
 * ------------------------------------------------------------------ */

/** 随笔条目：左边日期，右边标题与摘要 */
function entry(post) {
  const tagLine = post.tags.length
    ? `<span class="sep">·</span>${post.tags.slice(0, 2).map(esc).join(' / ')}`
    : '';
  return `        <article class="entry">
          <time class="entry-date" datetime="${fmtISO(post.date)}">${fmtShort(post.date)}</time>
          <div class="entry-main">
            <h2 class="entry-title"><a href="${postUrl(post)}">${esc(post.title)}</a></h2>
            <p class="entry-summary">${esc(post.summary)}</p>
            <p class="entry-meta">${weekday(post.date)}<span class="sep">·</span>约 ${post.minutes} 分钟${tagLine}</p>
          </div>
        </article>`;
}

/** 存档条目（日期 / 标题 / 作者） */
function shelfRow(item) {
  return `          <li class="shelf-item">
            <time datetime="${fmtISO(item.date)}">${fmtShort(item.date)}</time>
            <a href="${archiveUrl(item)}">${esc(item.title)}</a>
            <span class="shelf-author">${esc(item.author || '佚名')}</span>
          </li>`;
}

function emptyState(text) {
  return `        <p class="empty">${esc(text)}</p>`;
}

/** 写作热力图：一年一行，一格一周（放在页面最底部） */
function heatBand(ctx) {
  const { heat } = ctx;
  if (!heat || !heat.length) return '';

  const cell = (c) =>
    c.future
      ? '<span class="heat-cell is-future"></span>'
      : `<span class="heat-cell l${c.level}" title="${c.start.getMonth() + 1}月${c.start.getDate()}日–${c.end.getMonth() + 1}月${c.end.getDate()}日 · ${c.count} 篇"></span>`;

  const rows = heat
    .map(
      (row) => `        <div class="heat-row">
          <span class="heat-year">${row.year}</span>
          <div class="heat-cells">${row.cells.map(cell).join('')}</div>
        </div>`
    )
    .join('\n');

  const legend = [0, 1, 2, 3, 4]
    .map((level) => `<i class="heat-cell l${level}"></i><span>${level === 4 ? '4+' : level}</span>`)
    .join('');

  return `    <div class="wrap">
      <section class="heat-band" aria-label="写作记录">
        <div class="heat-head">
          <h2 class="heat-title">写作记录</h2>
          <span class="heat-legend">${legend}</span>
        </div>
        <div class="heat">
${rows}
        </div>
      </section>
    </div>`;
}

function pageHead(title, desc) {
  return `        <header class="page-head">
          <h1 class="page-title">${esc(title)}</h1>
          ${desc ? `<p class="page-desc">${esc(desc)}</p>` : ''}
        </header>`;
}

function pager(current, total) {
  if (total <= 1) return '';
  const url = (n) => (n === 1 ? '/blog/' : `/blog/page/${n}/`);
  const parts = [];
  if (current > 1) parts.push(`<a class="pager-link" href="${url(current - 1)}" rel="prev">← 上一页</a>`);
  else parts.push('<span class="pager-link is-disabled">← 上一页</span>');

  parts.push(`<span class="pager-num">${current} / ${total}</span>`);

  if (current < total) parts.push(`<a class="pager-link" href="${url(current + 1)}" rel="next">下一页 →</a>`);
  else parts.push('<span class="pager-link is-disabled">下一页 →</span>');

  return `        <nav class="pager" aria-label="翻页">
          ${parts.join('\n          ')}
        </nav>`;
}

/* ------------------------------------------------------------------ *
 * 页面
 * ------------------------------------------------------------------ */

export function homePage(ctx) {
  const { config, posts, archive } = ctx;
  const hero = config.hero || {};

  const nowRows = (config.now || [])
    .map(
      (row) => `            <div class="now-row">
              <dt>${esc(row.label)}</dt>
              <dd>${esc(row.text)}</dd>
            </div>`
    )
    .join('\n');

  const latest = posts.length
    ? posts.slice(0, 5).map((p) => entry(p)).join('\n')
    : emptyState('还没有开始写。第一篇总会有点难，但写下来就好了。');

  const shelf = archive.length
    ? `<ul class="shelf">
${archive.slice(0, 4).map((a) => shelfRow(a)).join('\n')}
        </ul>`
    : emptyState('还没有收藏任何东西。读到好的，就放进来。');

  const body = `        <section class="intro">
          <p class="intro-kicker">${esc(hero.kicker || '')}</p>
          <p class="intro-lead">${esc(hero.lead || '')}</p>
          <p class="intro-text">${esc(hero.note || config.description)}</p>
        </section>

        <section class="block">
          <div class="section-head">
            <h2 class="section-title">近来</h2>
          </div>
          <dl class="now">
${nowRows}
          </dl>
        </section>

        <section class="block">
          <div class="section-head">
            <h2 class="section-title">最近文章</h2>
            <a class="section-more" href="/blog/">全部文章 →</a>
          </div>
${latest}
        </section>

        <section class="block">
          <div class="section-head">
            <h2 class="section-title">最近存档</h2>
            <a class="section-more" href="/archive/">全部存档 →</a>
          </div>
${shelf}
        </section>`;

  return layout(ctx, { body, active: '/', path: '/', pageTitle: 'website' });
}

export function listPage(ctx, page, totalPages) {
  const { posts, config } = ctx;
  const perPage = config.perPage || 8;
  const slice = posts.slice((page - 1) * perPage, page * perPage);

  const desc = posts.length
    ? page === 1
      ? `随笔，共 ${posts.length} 篇。`
      : `随笔，第 ${page} 页。`
    : '随笔与日常，慢慢写。';

  const body = `${pageHead('最近文章', desc)}
${slice.length ? slice.map((p) => entry(p)).join('\n\n') : emptyState('这里还空着。')}
${pager(page, totalPages)}`;

  return layout(ctx, {
    body,
    active: '/blog/',
    title: page === 1 ? '最近文章' : `最近文章 · 第 ${page} 页`,
    path: page === 1 ? '/blog/' : `/blog/page/${page}/`,
    pageTitle: 'website',
  });
}

export function postPage(ctx, post, prev, next) {
  const tags = post.tags
    .map((t) => `<a href="${tagUrl(t)}" class="pill">${esc(t)}</a>`)
    .join('');

  const pagerHtml = [
    prev
      ? `<a class="post-nav-item is-prev" href="${postUrl(prev)}"><span class="post-nav-label">← 上一篇</span><span class="post-nav-title">${esc(prev.title)}</span></a>`
      : '<span class="post-nav-item is-empty"></span>',
    next
      ? `<a class="post-nav-item is-next" href="${postUrl(next)}"><span class="post-nav-label">下一篇 →</span><span class="post-nav-title">${esc(next.title)}</span></a>`
      : '<span class="post-nav-item is-empty"></span>',
  ].join('\n            ');

  const navBlock =
    prev || next
      ? `<nav class="post-nav" aria-label="相邻文章">
            ${pagerHtml}
            </nav>`
      : '';

  const body = `        <article class="post">
          <header class="post-head">
            <p class="post-kicker">随笔</p>
            <h1 class="post-title">${esc(post.title)}</h1>
            <p class="post-meta">
              <time datetime="${fmtISO(post.date)}">${fmtLong(post.date)}</time>
              <span class="sep">·</span>${weekday(post.date)}
              <span class="sep">·</span>约 ${post.minutes} 分钟
            </p>
            <span class="post-rule" aria-hidden="true"></span>
          </header>

          <div class="post-body">
${post.html}
          </div>

          <footer class="post-foot">
            ${tags ? `<div class="post-tags">${tags}</div>` : ''}
            <p class="post-sign">写于 ${fmtLong(post.date)}</p>
            ${navBlock}
            <p class="post-back"><a href="/blog/">← 回到最近文章</a></p>
          </footer>
        </article>`;

  return layout(ctx, {
    body,
    active: '/blog/',
    title: post.title,
    description: post.summary,
    path: postUrl(post),
    pageTitle: 'article',
  });
}

export function archivePage(ctx) {
  const { archive } = ctx;

  const desc = archive.length
    ? `读到并想留住的东西，共 ${archive.length} 篇。`
    : '读到好的，就放进来。';

  const body = `${pageHead('存档', desc)}
${
  archive.length
    ? `        <ul class="shelf">
${archive.map((a) => shelfRow(a)).join('\n')}
        </ul>`
    : emptyState('书架还空着。慢慢添。')
}`;

  return layout(ctx, {
    body,
    active: '/archive/',
    title: '存档',
    path: '/archive/',
    pageTitle: 'website',
  });
}

export function archiveItemPage(ctx, item, prev, next) {
  const tags = item.tags
    .map((t) => `<a href="${tagUrl(t)}" class="pill">${esc(t)}</a>`)
    .join('');

  const meta = `${fmtShort(item.date)} 收藏`;

  const bodyHtml = item.html
    ? `          <div class="post-body">
${item.html}
          </div>`
    : '';

  let source = '';
  if (item.source) {
    let label = item.source;
    try {
      label = new URL(item.source).hostname.replace(/^www\./, '');
    } catch {}
    source = `<p class="source">原文：<a href="${esc(item.source)}" target="_blank" rel="noopener">${esc(
      label
    )} ↗</a></p>`;
  }

  const pagerHtml = [
    prev
      ? `<a class="post-nav-item is-prev" href="${archiveUrl(prev)}"><span class="post-nav-label">← 前一篇</span><span class="post-nav-title">${esc(prev.title)}</span></a>`
      : '<span class="post-nav-item is-empty"></span>',
    next
      ? `<a class="post-nav-item is-next" href="${archiveUrl(next)}"><span class="post-nav-label">后一篇 →</span><span class="post-nav-title">${esc(next.title)}</span></a>`
      : '<span class="post-nav-item is-empty"></span>',
  ].join('\n            ');

  const navBlock =
    prev || next
      ? `<nav class="post-nav" aria-label="相邻存档">
            ${pagerHtml}
            </nav>`
      : '';

  const body = `        <article class="post post-archive">
          <header class="post-head">
            <p class="post-kicker">存档${item.author ? ` · ${esc(item.author)}` : ''}</p>
            <h1 class="post-title">${esc(item.title)}</h1>
            <p class="post-meta">${meta}</p>
            <span class="post-rule" aria-hidden="true"></span>
          </header>

${bodyHtml}
          <footer class="post-foot">
            ${source}
            ${tags ? `<div class="post-tags">${tags}</div>` : ''}
            ${navBlock}
            <p class="post-back"><a href="/archive/">← 回到存档</a></p>
          </footer>
        </article>`;

  return layout(ctx, {
    body,
    active: '/archive/',
    title: item.title,
    description: item.summary,
    path: archiveUrl(item),
    pageTitle: 'article',
  });
}

export function tagsPage(ctx) {
  const { tags } = ctx;

  const body = `${pageHead('标签', '写到过、也收藏过的一些词。')}
${
  tags.length
    ? `        <ul class="tag-cloud">
${tags
  .map(
    (t) =>
      `          <li class="tag-item"><a href="${tagUrl(t.name)}">${esc(t.name)}<span class="tag-count">${t.count}</span></a></li>`
  )
  .join('\n')}
        </ul>`
    : emptyState('还没有标签。')
}`;

  return layout(ctx, { body, active: '/tags/', title: '标签', path: '/tags/' });
}

export function tagPostPage(ctx, tag, essays, items) {
  const parts = [];

  if (essays.length) {
    parts.push(`        <section class="block">
          <div class="section-head">
            <h2 class="section-title">随笔</h2>
          </div>
${essays.map((p) => entry(p)).join('\n\n')}
        </section>`);
  }

  if (items.length) {
    parts.push(`        <section class="block">
          <div class="section-head">
            <h2 class="section-title">存档</h2>
          </div>
          <ul class="shelf">
${items.map((a) => shelfRow(a)).join('\n')}
          </ul>
        </section>`);
  }

  const total = essays.length + items.length;
  const body = `        <header class="page-head">
          <p class="post-kicker">标签</p>
          <h1 class="page-title">${esc(tag)}</h1>
          <p class="page-desc">关于「${esc(tag)}」的 ${total} 条。</p>
        </header>
${parts.join('\n\n')}
        <p class="post-back"><a href="/tags/">← 全部标签</a></p>`;

  return layout(ctx, {
    body,
    active: '/tags/',
    title: tag,
    description: `关于「${tag}」的内容`,
    path: tagUrl(tag),
  });
}

export function searchPage(ctx) {
  const body = `${pageHead('找一找', '输入关键词，翻一翻文章和存档。')}
        <div class="search-box">
          <input id="search-input" type="search" placeholder="比如：秋天、读书、罗素……" autocomplete="off" aria-label="搜索">
          <span class="search-hint">按 <kbd>/</kbd> 开始</span>
        </div>
        <ul id="search-results" class="search-results"></ul>
        <p id="search-empty" class="search-empty">没有找到。换一个词试试。</p>`;

  return layout(ctx, { body, active: '/search/', title: '搜索', path: '/search/' });
}

export function aboutPage(ctx, html) {
  const body = `        <article class="post post-about">
          <header class="post-head">
            <h1 class="post-title">关于我</h1>
          </header>
          <div class="post-body">
${html}
          </div>
        </article>`;

  return layout(ctx, { body, active: '/about/', title: '关于我', path: '/about/' });
}

export function notFoundPage(ctx) {
  const body = `${pageHead('四〇四', '这一页大概是被风吹走了。')}
        <p class="post-back"><a href="/">← 回到首页</a></p>`;
  return layout(ctx, { body, active: '', title: '找不到页面', path: '/404.html' });
}
