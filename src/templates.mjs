/**
 * 页面模板。所有函数都返回 HTML 字符串，由 build.mjs 写进 dist/。
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

const enc = (p) => p.split('/').map((seg) => encodeURIComponent(seg)).join('/');

export const postUrl = (p) => `/posts/${p.slug}/`;
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
  const { config, tags, years, posts } = ctx;
  const limit = config.sidebar?.tagLimit ?? 8;
  const topTags = tags.slice(0, limit);
  const tagList = topTags
    .map(
      (t) =>
        `<li><a href="${tagUrl(t.name)}"><span>${esc(t.name)}</span><em>${t.count}</em></a></li>`
    )
    .join('\n          ');
  const yearList = years
    .map((y) => `<li><a href="/archives/"><span>${y.year}</span><em>${y.count}</em></a></li>`)
    .join('\n          ');

  return `<aside class="sidebar" aria-label="侧栏">
      <section class="widget">
        <h2 class="widget-title">关于</h2>
        <p class="widget-text">${esc(config.sidebar?.about || config.description)}</p>
        <p class="widget-link"><a href="/about/">了解更多 →</a></p>
      </section>
      <section class="widget">
        <h2 class="widget-title">标签</h2>
        <ul class="mini-list">
          ${tagList}
        </ul>
        <p class="widget-link"><a href="/tags/">全部标签 →</a></p>
      </section>
      <section class="widget">
        <h2 class="widget-title">归档</h2>
        <ul class="mini-list">
          ${yearList}
        </ul>
      </section>
      <section class="widget widget-sub">
        <p class="widget-text">订阅：<a href="/feed.xml">RSS</a>　·　<a href="/search/">搜索</a></p>
        <p class="widget-text widget-muted">共 ${posts.length} 篇</p>
      </section>
    </aside>`;
}

function footer(config) {
  const year = new Date().getFullYear();
  return `<footer class="site-footer">
    <div class="wrap footer-inner">
      <p class="copyright">© ${year} ${esc(config.author || config.title)}</p>
      <p class="footer-links"><a href="/feed.xml">RSS</a><span>/</span><a href="/archives/">归档</a><span>/</span><a href="/about/">关于</a></p>
      <p class="colophon">${esc(config.footer || '')}</p>
    </div>
  </footer>`;
}

export function layout(ctx, { title, description, body, active, path, pageTitle }) {
  const { config } = ctx;
  const fullTitle = title ? `${title} · ${config.title}` : `${config.title} · ${config.tagline}`;
  const desc = description || config.description;
  const canonical = config.url && !/example\.com/.test(config.url) ? config.url.replace(/\/$/, '') + path : '';

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
  <link rel="stylesheet" href="/assets/styles.css">
  <link rel="alternate" type="application/atom+xml" title="${esc(config.title)}" href="/feed.xml">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <script>(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body>
  <a class="skip-link" href="#main">跳到正文</a>
  ${header(config, active)}
  <div class="wrap">
    <div class="layout">
      <main id="main" class="content">
${body}
      </main>
      ${ctx.withSidebar === false ? '' : sidebar(ctx)}
    </div>
  </div>
  ${footer(config)}
  <script src="/assets/app.js" defer></script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ *
 * 零件
 * ------------------------------------------------------------------ */

function entry(ctx, post) {
  return `        <article class="entry">
          <h2 class="entry-title"><a href="${postUrl(post)}">${esc(post.title)}</a></h2>
          <p class="entry-meta"><time datetime="${fmtISO(post.date)}">${fmtShort(post.date)}</time><span class="sep">/</span>${weekday(post.date)}<span class="sep">/</span>约 ${post.minutes} 分钟</p>
          <p class="entry-summary">${esc(post.summary)}</p>
        </article>`;
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
  const { config, posts } = ctx;
  const hero = config.hero || {};
  const titleLines = String(hero.title || '').split('\n').map(esc).join('<br>');
  const latest = posts.slice(0, 5).map((p) => entry(ctx, p)).join('\n\n');
  const nowRows = (config.now || [])
    .map(
      (row) => `            <div class="now-row">
              <dt>${esc(row.label)}</dt>
              <dd>${esc(row.text)}</dd>
            </div>`
    )
    .join('\n');

  const body = `        <section class="hero">
          <p class="hero-kicker">${esc(hero.kicker || '')}</p>
          <h1 class="hero-title">${titleLines}</h1>
          <p class="hero-note">${esc(hero.note || config.description)}</p>
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
            <h2 class="section-title">最近写下</h2>
            <a class="section-more" href="/blog/">全部日志 →</a>
          </div>
${latest}
        </section>`;

  return layout(ctx, { body, active: '/', path: '/', pageTitle: 'website' });
}

export function listPage(ctx, page, totalPages) {
  const { posts, config } = ctx;
  const perPage = config.perPage || 8;
  const slice = posts.slice((page - 1) * perPage, page * perPage);
  const entries = slice.map((p) => entry(ctx, p)).join('\n\n');
  const desc =
    page === 1
      ? `所有日志，共 ${posts.length} 篇。`
      : `所有日志，第 ${page} 页。`;

  const body = `${pageHead('日志', desc)}
${entries}
${pager(page, totalPages)}`;

  return layout(ctx, {
    body,
    active: '/blog/',
    title: page === 1 ? '日志' : `日志 · 第 ${page} 页`,
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

  const body = `        <article class="post">
          <header class="post-head">
            <h1 class="post-title">${esc(post.title)}</h1>
            <p class="post-meta">
              <time datetime="${fmtISO(post.date)}">${fmtShort(post.date)}</time>
              <span class="sep">/</span>${weekday(post.date)}
              <span class="sep">/</span>约 ${post.minutes} 分钟
            </p>
          </header>

          <div class="post-body">
${post.html}
          </div>

          <footer class="post-foot">
            ${tags ? `<div class="post-tags">${tags}</div>` : ''}
            <p class="post-sign">写于 ${fmtLong(post.date)}</p>
            <nav class="post-nav" aria-label="相邻文章">
            ${pagerHtml}
            </nav>
            <p class="post-back"><a href="/blog/">← 回到日志</a></p>
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
  const { posts } = ctx;
  const groups = new Map();
  for (const p of posts) {
    const y = p.date.getFullYear();
    if (!groups.has(y)) groups.set(y, []);
    groups.get(y).push(p);
  }

  const years = [...groups.keys()].sort((a, b) => b - a);
  const blocks = years
    .map((year) => {
      const items = groups.get(year);
      const rows = items
        .map(
          (p) => `            <li>
              <time datetime="${fmtISO(p.date)}">${pad(p.date.getMonth() + 1)}.${pad(p.date.getDate())}</time>
              <a href="${postUrl(p)}">${esc(p.title)}</a>
              <span class="archive-len">${p.minutes} 分钟</span>
            </li>`
        )
        .join('\n');

      return `          <section class="archive-year">
            <h2 class="archive-year-title">${year}<span class="archive-count">${items.length} 篇</span></h2>
            <ol class="archive-list">
${rows}
            </ol>
          </section>`;
    })
    .join('\n');

  const first = posts[posts.length - 1];
  const desc = `从 ${first.date.getFullYear()} 年 ${first.date.getMonth() + 1} 月到现在，共 ${posts.length} 篇。`;
  const body = `${pageHead('归档', desc)}
        <div class="archive">
${blocks}
        </div>`;

  return layout(ctx, { body, active: '/archives/', title: '归档', path: '/archives/' });
}

export function tagsPage(ctx) {
  const { tags } = ctx;
  const max = Math.max(...tags.map((t) => t.count), 1);
  const list = tags
    .map((t) => {
      const weight = 1 + Math.round((t.count / max) * 3); // 1..4，用于字号分级
      return `<li class="tag-item" data-weight="${weight}"><a href="${tagUrl(t.name)}">${esc(
        t.name
      )}<span class="tag-count">${t.count}</span></a></li>`;
    })
    .join('\n          ');

  const body = `${pageHead('标签', '写到过的一些词，越大的写得越多。')}
        <ul class="tag-cloud">
          ${list}
        </ul>`;

  return layout(ctx, { body, active: '/tags/', title: '标签', path: '/tags/' });
}

export function tagPostPage(ctx, tag, list) {
  const entries = list.map((p) => entry(ctx, p)).join('\n\n');
  const body = `${pageHead(`# ${tag}`, `关于「${tag}」的 ${list.length} 篇。`)}
${entries}
        <p class="post-back"><a href="/tags/">← 全部标签</a></p>`;

  return layout(ctx, {
    body,
    active: '/tags/',
    title: `# ${tag}`,
    description: `关于「${tag}」的文章`,
    path: tagUrl(tag),
  });
}

export function searchPage(ctx) {
  const body = `${pageHead('找一找', '输入关键词，翻一翻以前写下的东西。')}
        <div class="search-box">
          <input id="search-input" type="search" placeholder="比如：秋天、读书、妈妈……" autocomplete="off" aria-label="搜索">
          <span class="search-hint">按 <kbd>/</kbd> 开始</span>
        </div>
        <ul id="search-results" class="search-results"></ul>
        <p id="search-empty" class="search-empty">没有找到。换一个词试试。</p>`;

  return layout(ctx, { body, active: '/search/', title: '搜索', path: '/search/' });
}

export function aboutPage(ctx, html) {
  const body = `        <article class="post post-about">
          <header class="post-head">
            <h1 class="post-title">关于</h1>
          </header>
          <div class="post-body">
${html}
          </div>
        </article>`;

  return layout(ctx, { body, active: '/about/', title: '关于', path: '/about/' });
}

export function notFoundPage(ctx) {
  const body = `${pageHead('四〇四', '这一页大概是被风吹走了。')}
        <p class="post-back"><a href="/">← 回到首页</a></p>`;
  return layout(ctx, { body, active: '', title: '找不到页面', path: '/404.html' });
}

export { enc };
