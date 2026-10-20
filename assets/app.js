/* 深浅色切换 + 站内搜索 */
(function () {
  var root = document.documentElement;
  var KEY = 'theme';

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var btn = document.querySelector('.theme-toggle');
    if (btn) btn.setAttribute('aria-pressed', String(theme === 'dark'));
  }

  try {
    var stored = localStorage.getItem(KEY);
    if (!stored) {
      apply(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }
  } catch (e) {}

  var toggle = document.querySelector('.theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      try {
        localStorage.setItem(KEY, next);
      } catch (e) {}
    });
  }

  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', function (event) {
      try {
        if (!localStorage.getItem(KEY)) apply(event.matches ? 'dark' : 'light');
      } catch (e) {}
    });
  } catch (e) {}

  /* ------------------------------------------------------------------ */
  /* 搜索：读取 /index.json，纯前端过滤，不依赖任何服务                    */
  /* ------------------------------------------------------------------ */

  var input = document.getElementById('search-input');
  if (!input) return;

  var list = document.getElementById('search-results');
  var empty = document.getElementById('search-empty');
  var data = null;
  var loading = false;

  var escapeHtml = function (text) {
    return String(text).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  var highlight = function (text, query) {
    var safe = escapeHtml(text);
    if (!query) return safe;
    try {
      var pattern = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      return safe.replace(pattern, '<mark>$1</mark>');
    } catch (e) {
      return safe;
    }
  };

  var snippet = function (post, query) {
    var source = post.text || post.summary || '';
    var index = source.toLowerCase().indexOf(query.toLowerCase());
    if (index < 0) return post.summary || '';
    var start = Math.max(0, index - 40);
    return (start > 0 ? '…' : '') + source.slice(start, start + 130) + '…';
  };

  var render = function (query) {
    if (!data) return;
    var q = query.trim();
    list.innerHTML = '';

    if (!q) {
      empty.classList.remove('is-visible');
      return;
    }

    var hits = data.filter(function (post) {
      var haystack = [post.title, post.summary, post.text, (post.tags || []).join(' ')]
        .join(' ')
        .toLowerCase();
      return haystack.indexOf(q.toLowerCase()) !== -1;
    });

    var frag = document.createDocumentFragment();
    hits.forEach(function (post) {
      var li = document.createElement('li');
      li.innerHTML =
        '<a href="' + post.url + '"><div class="result-title">' +
        highlight(post.title, q) +
        '</div><p class="result-meta">' +
        escapeHtml(post.date) +
        (post.tags && post.tags.length ? ' / ' + escapeHtml(post.tags.join(' · ')) : '') +
        '</p><p class="result-snippet">' +
        highlight(snippet(post, q), q) +
        '</p></a>';
      frag.appendChild(li);
    });

    list.appendChild(frag);
    empty.classList.toggle('is-visible', hits.length === 0);
  };

  var load = function () {
    if (data || loading) return;
    loading = true;
    fetch('/index.json')
      .then(function (res) {
        return res.json();
      })
      .then(function (json) {
        data = json;
        render(input.value);
      })
      .catch(function () {
        empty.textContent = '索引加载失败，请刷新试试。';
        empty.classList.add('is-visible');
      })
      .finally(function () {
        loading = false;
      });
  };

  var timer;
  input.addEventListener('input', function () {
    load();
    clearTimeout(timer);
    timer = setTimeout(function () {
      render(input.value);
    }, 90);
  });

  document.addEventListener('keydown', function (event) {
    var tag = (event.target.tagName || '').toLowerCase();
    if (event.key === '/' && tag !== 'input' && tag !== 'textarea') {
      event.preventDefault();
      input.focus();
      input.select();
    }
  });

  load();

  /* 带 ?q= 进来时自动搜索 */
  var params = new URLSearchParams(location.search);
  if (params.get('q')) {
    input.value = params.get('q');
    render(input.value);
  }
})();
