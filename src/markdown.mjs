/**
 * 一个够用的 Markdown 渲染器（零依赖）。
 * 支持：标题、段落、引用、有序/无序列表、任务列表、代码块、行内代码、
 *       链接、图片（带图注）、分隔线、表格、粗体、斜体、删除线、高亮、自动链接。
 * 所有 HTML 都会被转义，写日记时不必担心标签问题。
 */

const CJK = /[\u2E80-\u9FFF\u3000-\u303F\uFF00-\uFFEF\u3040-\u30FF]/;

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeUrl(url) {
  const u = String(url).trim();
  return /^\s*(javascript|vbscript|data:text\/html)/i.test(u) ? '#' : u;
}

function indentOf(line) {
  const m = /^[ \t]*/.exec(line);
  return m ? m[0].replace(/\t/g, '  ').length : 0;
}

/** 中文段落里硬换行不应该变成多余的空格 */
function joinLines(lines) {
  let out = '';
  for (const line of lines) {
    const text = line.replace(/\s+$/, '');
    if (!out) {
      out = text;
      continue;
    }
    const a = out.slice(-1);
    const b = text[0] || '';
    out += CJK.test(a) && CJK.test(b) ? '' : ' ';
    out += text;
  }
  return out;
}

function inline(text) {
  const stash = [];
  const keep = (html) => {
    stash.push(html);
    return `\u0000${stash.length - 1}\u0000`;
  };

  let s = esc(text);

  // 行内代码（先抽出来，避免内部被当成强调语法）
  s = s.replace(/(`+)([\s\S]*?)\1/g, (_m, _f, code) => keep(`<code>${code.trim()}</code>`));

  // 图片：[alt](src "图注")
  s = s.replace(
    /!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+&quot;([^&]*)&quot;|\s+"([^"]*)")?\s*\)/g,
    (_m, alt, url, t1, t2) => {
      const title = t1 || t2 || '';
      const src = esc(safeUrl(url));
      const img = `<img src="${src}" alt="${alt}" loading="lazy">`;
      if (!title) return keep(img);
      return keep(`<figure>${img}<figcaption>${title}</figcaption></figure>`);
    }
  );

  // 链接
  s = s.replace(
    /\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/g,
    (_m, label, url, title) => {
      const t = title ? ` title="${title}"` : '';
      return keep(`<a href="${esc(safeUrl(url))}"${t}>${inline(label)}</a>`);
    }
  );

  // 自动链接 <https://...>
  s = s.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, (_m, url) =>
    keep(`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>`)
  );

  // 强调
  s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_])_([^_\s][^_]*?)_(?!_)/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+?)~~/g, '<del>$1</del>');
  s = s.replace(/==([^=]+?)==/g, '<mark>$1</mark>');

  // 还原被抽出的 HTML（可能嵌套，循环到干净为止）
  let guard = 0;
  while (/\u0000\d+\u0000/.test(s) && guard++ < 50) {
    s = s.replace(/\u0000(\d+)\u0000/g, (_m, n) => stash[Number(n)] ?? '');
  }
  return s;
}

function isTableSeparator(line) {
  return /^\s*\|?[\s:-]*-[\s|:-]*\|?\s*$/.test(line) && line.includes('-');
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

function parseBlocks(lines) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // 注释
    if (/^\s*<!--/.test(line)) {
      while (i < lines.length && !/-->/.test(lines[i])) i++;
      i++;
      continue;
    }

    // 代码块
    const fence = /^\s*(```+|~~~+)\s*([\w+#.-]*)\s*$/.exec(line);
    if (fence) {
      const mark = fence[1];
      const lang = fence[2];
      i++;
      const buf = [];
      while (i < lines.length && !new RegExp(`^\\s*${mark[0]}{${mark.length},}\\s*$`).test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      const cls = lang ? ` class="language-${esc(lang)}"` : '';
      out.push(`<pre><code${cls}>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // 标题（正文里的 # 会被降一级，给文章标题让路）
    const heading = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    // 分隔线
    if (/^\s*((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // 引用
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && (/^\s*>/.test(lines[i]) || (lines[i].trim() && buf.length && !/^\s*(#|```)/.test(lines[i])))) {
        buf.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>\n${parseBlocks(buf).join('\n')}\n</blockquote>`);
      continue;
    }

    // 表格
    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const th = head.map((c) => `<th>${inline(c)}</th>`).join('');
      const trs = rows
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
        .join('\n');
      out.push(`<table><thead><tr>${th}</tr></thead><tbody>\n${trs}\n</tbody></table>`);
      continue;
    }

    // 列表
    if (/^\s{0,3}([-*+]|\d{1,9}[.)])\s+/.test(line)) {
      const [html, next] = parseList(lines, i);
      out.push(html);
      i = next;
      continue;
    }

    // 段落
    const buf = [];
    while (i < lines.length) {
      const cur = lines[i];
      if (!cur.trim()) break;
      if (/^\s*(#{1,6}\s|>|```|~~~)/.test(cur)) break;
      if (/^\s{0,3}([-*+]|\d{1,9}[.)])\s+/.test(cur)) break;
      if (/^\s*((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/.test(cur)) break;
      if (cur.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) break;
      buf.push(cur);
      i++;
    }
    if (buf.length) out.push(`<p>${inline(joinLines(buf))}</p>`);
    else i++;
  }

  return out;
}

function parseList(lines, start) {
  const baseIndent = indentOf(lines[start]);
  const ordered = /^\s*\d{1,9}[.)]\s+/.test(lines[start]);
  const items = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j < lines.length && (indentOf(lines[j]) > baseIndent || /^\s{0,3}([-*+]|\d{1,9}[.)])\s+/.test(lines[j]))) {
        i = j;
        continue;
      }
      break;
    }

    const m = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/.exec(line);
    if (m && m[1].replace(/\t/g, '  ').length <= baseIndent + 1) {
      items.push([m[3]]);
      i++;
      continue;
    }

    if (indentOf(line) > baseIndent) {
      const strip = Math.min(indentOf(line), baseIndent + 4);
      const text = line.replace(/^\s+/, (sp) => sp.slice(Math.min(sp.length, strip)));
      if (!items.length) items.push([]);
      items[items.length - 1].push(text);
      i++;
      continue;
    }

    break;
  }

  const tag = ordered ? 'ol' : 'ul';
  const base = ordered ? Number(/^\s*(\d+)/.exec(lines[start])[1]) : 0;
  const lis = items.map((itemLines) => {
    let task = '';
    let body = itemLines;

    const first = body[0] ?? '';
    const tm = /^\[( |x|X)\]\s+(.*)$/.exec(first);
    if (tm) {
      task = `<input type="checkbox" disabled${tm[1] === ' ' ? '' : ' checked'}> `;
      body = [tm[2], ...body.slice(1)];
    }

    const inner = parseBlocks(body);
    const tight =
      inner.length === 1 && /^<p>/.test(inner[0])
        ? [inner[0].replace(/^<p>/, '').replace(/<\/p>$/, '')]
        : inner;
    const cls = task ? ' class="task"' : '';
    return `<li${cls}>${task}${tight.join('\n')}</li>`;
  });

  const startAttr = ordered && base > 1 ? ` start="${base}"` : '';
  return [`<${tag}${startAttr}>\n${lis.join('\n')}\n</${tag}>`, i];
}

export function renderMarkdown(src) {
  const text = String(src || '').replace(/\r\n?/g, '\n');
  return parseBlocks(text.split('\n')).join('\n');
}

/** 从 Markdown 里估一个摘要 */
export function plainExcerpt(src, limit = 110) {
  const text = String(src || '')
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[>*_~`=|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= limit) return text;
  return text.slice(0, limit).trim() + '……';
}

/** 中文按每分钟 300 字、英文按每分钟 200 词估算 */
export function readingTime(src) {
  const text = String(src || '').replace(/```[\s\S]*?```/g, ' ');
  const cjk = (text.match(/[\u3400-\u9FFF\u3040-\u30FF]/g) || []).length;
  const words = (text.replace(/[\u3400-\u9FFF\u3040-\u30FF]/g, ' ').match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) || [])
    .length;
  const minutes = Math.max(1, Math.ceil(cjk / 300 + words / 200));
  return minutes;
}
