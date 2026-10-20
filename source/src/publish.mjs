/**
 * 发布：生成站点 → 通过 GitHub API 提交源码到 main、网页到 gh-pages
 * 用法：node src/publish.mjs             （自动找 gh 的登录信息）
 *      GITHUB_TOKEN=xxx node src/publish.mjs
 *
 * 不依赖 git：这台机器上 git 连不上 GitHub，所以直接走 REST API。
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));

const OWNER = 'qCiao';
const REPO = 'qCiao.github.io';
const BRANCH = 'main';
const SOURCE_PREFIX = 'source/';
const API = 'https://api.github.com';
const SITE = config.url.replace(/\/$/, '');

const TEXT_EXT = new Set([
  '.html', '.css', '.js', '.mjs', '.json', '.xml', '.svg', '.txt', '.md',
  '.yml', '.yaml', '.toml', '.map', '.cmd', '.gitignore', '',
]);

const IGNORE_DIRS = new Set(['.git', 'dist', 'node_modules', '.preview', '.publish', '.github']);

/* ------------------------------- 工具 ------------------------------- */

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
  } catch {
    console.error(
      '✗ 找不到 GitHub 登录信息。\n' +
        '  请先运行：gh auth login\n' +
        '  或者先设置环境变量：set GITHUB_TOKEN=你的token'
    );
    process.exit(1);
  }
}

const TOKEN = getToken();

async function api(route, { method = 'GET', body } = {}) {
  const res = await fetch(API + route, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'qCiao-blog-publisher',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`${method} ${route} → ${res.status}\n${text.slice(0, 500)}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}

function collect(dir, base = '') {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.DS_Store' || entry.name === 'Thumbs.db') continue;
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      files.push(...collect(path.join(dir, entry.name), `${base}${entry.name}/`));
    } else {
      files.push({ path: `${base}${entry.name}`, abs: path.join(dir, entry.name) });
    }
  }
  return files;
}

/* ------------------------------ 发布逻辑 ------------------------------ */

async function publish(files, message) {
  const base = `/repos/${OWNER}/${REPO}`;

  let parent = null;
  try {
    const ref = await api(`${base}/git/ref/heads/${BRANCH}`);
    parent = ref.object.sha;
  } catch (e) {
    if (e.status !== 404) throw e;
  }

  const entries = [];
  for (const file of files) {
    const ext = path.extname(file.path).toLowerCase();
    const buf = fs.readFileSync(file.abs);
    if (TEXT_EXT.has(ext) || file.path.endsWith('.gitignore')) {
      entries.push({ path: file.path, mode: '100644', type: 'blob', content: buf.toString('utf8') });
    } else {
      const blob = await api(`${base}/git/blobs`, {
        method: 'POST',
        body: { content: buf.toString('base64'), encoding: 'base64' },
      });
      entries.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
  }

  const tree = await api(`${base}/git/trees`, { method: 'POST', body: { tree: entries } });
  const commit = await api(`${base}/git/commits`, {
    method: 'POST',
    body: { message, tree: tree.sha, parents: parent ? [parent] : [] },
  });

  if (parent) {
    await api(`${base}/git/refs/heads/${BRANCH}`, {
      method: 'PATCH',
      body: { sha: commit.sha, force: true },
    });
  } else {
    await api(`${base}/git/refs`, {
      method: 'POST',
      body: { ref: `refs/heads/${BRANCH}`, sha: commit.sha },
    });
  }

  console.log(`   ✓ ${BRANCH}  ${commit.sha.slice(0, 7)}  (${files.length} 个文件)`);
  return commit.sha;
}

async function pagesInfo() {
  try {
    return await api(`/repos/${OWNER}/${REPO}/pages`);
  } catch {
    return null;
  }
}

async function waitForBuild(maxSeconds = 240) {
  const started = Date.now();
  while ((Date.now() - started) / 1000 < maxSeconds) {
    try {
      const build = await api(`/repos/${OWNER}/${REPO}/pages/builds/latest`);
      if (build.status === 'built') return 'built';
      if (build.status === 'errored') return 'errored';
      process.stdout.write(`   … 构建中（${build.status || 'queued'}）\r`);
    } catch {}
    await new Promise((r) => setTimeout(r, 6000));
  }
  return 'timeout';
}

/* -------------------------------- 主流程 -------------------------------- */

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');

console.log('① 生成站点…');
execFileSync(process.execPath, [path.join(root, 'src/build.mjs')], {
  cwd: root,
  stdio: 'inherit',
});

console.log('② 提交到 main（网页在根目录，源码在 source/）…');
const siteFiles = collect(path.join(root, 'dist'), '');
const sourceFiles = collect(root, SOURCE_PREFIX);
await publish([...siteFiles, ...sourceFiles], `发布 ${stamp}`);

const pages = await pagesInfo();
if (pages) {
  console.log(`③ GitHub Pages：${pages.source?.branch || '?'} / ${pages.source?.path || '?'} → ${pages.html_url}`);
} else {
  console.log('③ 还没开启 Pages，请到仓库 Settings → Pages 里把源选成 main / (root)');
}

const status = await waitForBuild();

if (status === 'built') {
  console.log(`\n✓ 发布完成：${SITE}/\n`);
} else if (status === 'errored') {
  console.log('\n! 网页已推送，但 Pages 构建失败。请打开仓库 Settings → Pages 查看原因。\n');
} else {
  console.log(`\n✓ 已推送。GitHub 还在构建，稍等一分钟再打开：${SITE}/\n`);
}
