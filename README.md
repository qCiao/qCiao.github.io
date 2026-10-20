# qCiao · 个人博客

线上地址：**https://qciao.github.io/**

一个只写日记的静态博客。没有数据库、没有后台、没有第三方脚本：你在 Markdown 文件里写字，一条命令生成整站，推到 GitHub Pages 就是线上版。

---

## 一、最常用的两个按钮

| 想做什么 | 怎么做 |
| --- | --- |
| 在电脑上看看效果 | 双击 **`预览.cmd`**，浏览器会自动打开 `http://localhost:4000` |
| 发布到网上 | 双击 **`发布.cmd`**，等 1～2 分钟，刷新 https://qciao.github.io/ |

需要装的是 **Node.js**（已装）和 **GitHub CLI 已登录**（已配置好）。

---

## 二、写一篇新日记

1. 在 `posts/` 目录里新建一个 `.md` 文件，文件名格式：`年-月-日-英文短名.md`，例如
   `2026-10-21-chi-fan-de-shi.md`
2. 文件开头写这段（两行 `---` 之间是"配置"，下面是正文）：

```markdown
---
title: 今天吃了一顿很慢的饭
date: 2026-10-21 20:30
tags: [日常, 成都]
summary: 一句话摘要，会出现在列表和搜索结果里。
---

正文从这里开始。空一行就是新的一段。

## 小标题

> 引用会被排成左边有一条竖线的样子。
```

3. 双击 `预览.cmd` 看看，满意了就双击 `发布.cmd`。

### 开头可以写的字段

| 字段 | 是否必填 | 说明 |
| --- | --- | --- |
| `title` | 建议写 | 文章标题 |
| `date` | 建议写 | `2026-10-21` 或 `2026-10-21 20:30`，不写就用文件名里的日期 |
| `tags` | 可选 | `[日常, 读书]`，也可以写成 `日常, 读书` |
| `summary` | 可选 | 列表页和 RSS 里显示的摘要；不写就自动截取正文开头 |
| `draft: true` | 可选 | 加了这句，这篇文章暂时不会发布 |

文件名里的英文短名会变成网址，例如 `2026-10-21-chi-fan-de-shi.md` → `/posts/chi-fan-de-shi/`。

---

## 三、改站点信息

所有"关于这个站"的设置都在 **`site.config.json`**，改完重新发布即可：

| 字段 | 作用 |
| --- | --- |
| `title` | 站名（页面左上角的大字） |
| `tagline` | 站名下面那行小字 |
| `author` | 页脚署名 |
| `description` | 搜索引荐和分享卡片上的描述 |
| `url` | 站点地址，绑了自定义域名时记得改 |
| `hero` | 首页那三行大字：`kicker`（上面的小字）、`title`（`\n` 换行）、`note`（下面那段） |
| `now` | 首页"近来"三行：在做 / 在想 / 在读 |
| `nav` | 顶部导航 |
| `sidebar.about` | 右侧栏"关于"那段话 |
| `perPage` | 日志列表每页几篇 |
| `footer` | 页脚那句版权说明 |

`site.config.json` 里如果写了中文，保存时请选 **UTF-8** 编码。

"关于"页的内容单独放在 `pages/about.md`，直接改那个文件。

---

## 四、目录结构

```
blog/
├── site.config.json     站点的所有设置
├── posts/               你的日记，一篇一个 .md
├── pages/about.md       关于页
├── src/
│   ├── build.mjs        生成器：把 Markdown 变成整个网站
│   ├── markdown.mjs     自己写的 Markdown 渲染
│   ├── templates.mjs    页面模板
│   └── publish.mjs      一键发布
├── assets/              样式、脚本、图片（会原样复制到网站）
│   ├── styles.css
│   ├── app.js           深浅色切换 + 站内搜索
│   └── img/             放照片的地方
├── dist/                生成出来的网站（不用手改，可随时删）
├── serve.mjs            本地预览服务器
├── 预览.cmd
└── 发布.cmd
```

---

## 五、发布是怎么工作的

- `main` 分支存的是**源码**（你写的 Markdown、配置、脚本）
- `gh-pages` 分支存的是**生成好的网页**
- GitHub Pages 指向 `gh-pages`，所以 https://qciao.github.io/ 打开的是生成的网页

`发布.cmd` 会自动做完：生成 → 提交源码到 `main` → 把 `dist/` 推到 `gh-pages`。
推送用的是你本机 `gh` 的登录状态，不需要输密码。

如果发布后刷新看不到变化：等一分钟再强刷（Ctrl+F5），GitHub 有时会慢几十秒。

---

## 六、Markdown 小抄

```markdown
## 小标题
### 更小的标题

普通一段话。两个星号是**加粗**，一个星号是*斜体*，两个等号是==高亮==。

> 这是引用

- 列表项
- 第二项
  - 缩进两格就是子项

1. 有序列表
2. 第二项

[一个链接](https://example.com)

![照片说明](/assets/img/photo.jpg "图注会显示在照片下面")

| 表头 | 表头 |
| --- | --- |
| 内容 | 内容 |

---
```

代码块用三个反引号包起来：

````markdown
```js
console.log('hello')
```
````

---

## 七、放照片

1. 把图片放进 `assets/img/`，例如 `assets/img/20261021.jpg`
2. 正文里写：`![雨后的窗台](/assets/img/20261021.jpg "可选的图注")`
3. 发布后图片地址就是 `https://qciao.github.io/assets/img/20261021.jpg`

图片建议压到 300KB 以内（手机拍的可以先用微信/看图软件压缩），否则打开会慢。

---

## 八、换成自己的域名（可选）

1. 域名商后台加一条 CNAME：主机记录填 `www`（或 `blog`），指向 `qciao.github.io`
2. 仓库 Settings → Pages → Custom domain 填你的域名，保存
3. 等证书签发（几分钟到几小时），勾上 Enforce HTTPS
4. 把 `site.config.json` 里的 `url` 改成新域名，再发布一次

---

## 九、常见问题

**双击 `预览.cmd` 窗口一闪就没了？**
说明 Node 报错了。在这个文件夹里手动打开 PowerShell，运行 `node src/build.mjs`，看红字提示。

**发布失败，提示 authentication？**
在 PowerShell 里运行 `gh auth login` 重新登录，再发布。

**想改颜色 / 字号 / 版心宽度？**
都在 `assets/styles.css` 最上面那段 `:root` 变量里：`--paper` 纸张底色、`--ink` 字色、`--accent` 强调色、`--wrap` 版心宽度。

**想删掉示例文章？**
直接删 `posts/` 里对应的 `.md` 文件，再发布。`dist/` 是生成物，每次都会重建，不用管。
