/* Free SEO audit (/free-seo-audit/): posts the lead + URL to /api/seo-audit.php, renders the report,
   then adds mobile speed and Core Web Vitals from Google PageSpeed Insights. */
(function () {
  var form = document.getElementById('pws-audit-form');
  var out = document.getElementById('pws-audit-report');
  if (!form || !out) return;
  var status = form.querySelector('.pws-status');
  var btn = form.querySelector('button[type="submit"]');
  var PSI_KEY = ''; // optional Google API key for higher PageSpeed Insights quota
  var WA = 'https://wa.me/447506909018?text=';

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var say = function (html, cls) { status.innerHTML = html; status.className = 'pws-status ' + (cls || ''); };
  var sevName = { error: 'Error', warning: 'Warning', notice: 'Notice' };
  var grade = function (s) { return s >= 90 ? 'Excellent' : s >= 75 ? 'Good, with room to improve' : s >= 50 ? 'Needs work' : 'Poor: urgent fixes needed'; };

  function gauge(score) {
    var r = 70, c = 2 * Math.PI * r, col = score >= 75 ? 'var(--lime)' : score >= 50 ? '#ffffff' : '#ff8a8a';
    return '<div class="pws-gauge" role="img" aria-label="SEO health score ' + score + ' out of 100"><svg viewBox="0 0 168 168" aria-hidden="true"><circle cx="84" cy="84" r="' + r + '" fill="none" stroke="var(--bg-3)" stroke-width="14"/><circle cx="84" cy="84" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + (c * score / 100).toFixed(1) + ' ' + c.toFixed(1) + '"/></svg><b>' + score + '<small>out of 100</small></b></div>';
  }
  function issueHtml(c) {
    var sev = c.pass ? 'pass' : c.severity;
    return '<div class="pws-issue"><span class="pws-sev sev-' + sev + '" title="' + (c.pass ? 'Passed' : sevName[c.severity]) + '"></span><h3>' + esc(c.label) + (c.pass ? '' : ' <span class="pws-rep-note">(' + sevName[c.severity] + ', ' + esc(c.theme) + ')</span>') + '</h3><p><b>Found:</b> ' + esc(c.detail) + '</p>' +
      (c.items && c.items.length ? '<details class="pws-items"' + (c.items.length <= 6 ? ' open' : '') + '><summary>Exactly where (' + c.items.length + (c.items.length >= 30 ? '+' : '') + ')</summary><ul>' + c.items.map(function (i) { return '<li><code>' + esc(i) + '</code></li>'; }).join('') + '</ul></details>' : '') +
      (!c.pass && c.why ? '<p class="pws-why"><b>Why it matters:</b> ' + esc(c.why) + '</p>' : '') +
      (c.fix ? '<p class="pws-fix">' + esc(c.fix) + '</p>' : '') + '</div>';
  }

  function semi(score, label) {
    var r = 70, len = Math.PI * r, col = score >= 80 ? 'var(--lime)' : score >= 50 ? '#ffffff' : '#ff8a8a';
    return '<div class="sa-semi" role="img" aria-label="' + esc(label) + ' ' + score + '%"><svg viewBox="0 0 180 100" aria-hidden="true"><path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="var(--bg-3)" stroke-width="16" stroke-linecap="round"/><path d="M20 90 A70 70 0 0 1 160 90" fill="none" stroke="' + col + '" stroke-width="16" stroke-linecap="round" stroke-dasharray="' + (len * score / 100).toFixed(1) + ' ' + len.toFixed(1) + '"/></svg><b>' + score + '%</b></div>';
  }
  function head(c) { var d = String(c.detail || ''); var i = d.indexOf(': '); if (i > 0 && i < 90) d = d.slice(0, i); if (d.length > 110) d = d.slice(0, 107) + '...'; return /[a-z]{3,}/i.test(d.replace(/(ms|kb)/gi, '')) ? d : c.label + ' (found: ' + d + ')'; }
  function count(c) { return c.items && c.items.length ? c.items.length : 1; }
  function bars(title, rows) {
    var max = Math.max.apply(null, rows.map(function (x) { return x[1]; }).concat([1]));
    return '<div class="sa-card"><h4>' + esc(title) + '</h4>' + rows.map(function (x) { return '<div class="sa-barrow"><span>' + esc(x[0]) + '</span><div class="sa-track"><i class="' + (x[2] || '') + '" style="width:' + (x[1] / max * 100).toFixed(1) + '%"></i></div><b>' + x[1] + '</b></div>'; }).join('') + '</div>';
  }
  function issueRow(c, i) {
    var sev = c.pass ? 'pass' : c.severity;
    return '<div class="sa-issue" data-sev="' + sev + '" data-theme="' + esc(c.theme) + '"><div class="sa-issue-head"><span class="pws-sev sev-' + sev + '"></span><div><h3>' + (c.pass || /^[0-9]/.test(c.detail) ? '' : '<b class="sa-n">' + count(c) + '</b> ') + esc(c.pass ? c.label : head(c)) + '</h3><p class="sa-sub">' + esc(c.theme) + ' · ' + (c.pass ? 'Passed' : sevName[c.severity]) + ' · Check: ' + esc(c.label) + '</p></div>' +
      (c.pass ? '' : '<button type="button" class="sa-toggle" aria-expanded="false" data-t="d' + i + '">Why and how to fix</button>') + '</div>' +
      (c.pass ? '' : '<div class="sa-detail" id="d' + i + '" hidden>' + (c.why ? '<p><b>About this issue:</b> ' + esc(c.why) + '</p>' : '') + '<p class="pws-fix">' + esc(c.fix) + '</p>' +
        (c.items && c.items.length ? '<table class="sa-table"><thead><tr><th>Exactly where (' + c.items.length + (c.items.length >= 30 ? '+' : '') + ')</th></tr></thead><tbody>' + c.items.map(function (x) { return '<tr><td><code>' + esc(x) + '</code></td></tr>'; }).join('') + '</tbody></table>' : '') + '</div>') + '</div>';
  }

  function render(r) {
    var order = { error: 0, warning: 1, notice: 2 };
    var failed = r.checks.filter(function (c) { return !c.pass; });
    failed.sort(function (a, b) { return order[a.severity] - order[b.severity] || count(b) - count(a); });
    var passed = r.checks.filter(function (c) { return c.pass; });
    var inst = { error: 0, warning: 0, notice: 0 };
    failed.forEach(function (c) { inst[c.severity] += count(c); });
    var pages = r.pages || [];
    var broken = pages.filter(function (p) { return p.status >= 400 || p.status === 0; }).length;
    var redir = pages.filter(function (p) { return p.status >= 300 && p.status < 400; }).length;
    var withIss = pages.filter(function (p) { return p.status === 200 && p.issues.length; }).length;
    var healthy = pages.length - broken - redir - withIss;
    var host = r.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    var ai = (r.themes.filter(function (t) { return /AI search/.test(t.name); })[0] || { score: 0, issues: 0 });
    var waText = 'Hi Prism Works Studio, I ran your free SEO audit on ' + r.url + ' and scored ' + r.score + '/100. Can you help me fix the issues?';
    var seg = function (n, cls) { return n ? '<i class="' + cls + '" style="flex:' + n + '"></i>' : ''; };

    var html = '<div class="sa-head"><h2>Site Audit: <span>' + esc(host) + '</span></h2><p class="sa-meta">Updated: ' + esc(new Date(r.date).toLocaleString()) + ' · Mobile · Pages crawled: ' + pages.length + (r.sitemapUrls ? ' · Sitemap URLs: ' + r.sitemapUrls : '') + '</p>' +
      '<div class="sa-tabs" role="tablist">' + ['Overview', 'Issues', 'Crawled Pages', 'Statistics'].map(function (t, i) { return '<button type="button" role="tab" class="sa-tab' + (i ? '' : ' on') + '" data-tab="' + i + '">' + t + '</button>'; }).join('') + '</div></div>';

    // ---- Overview
    html += '<div class="sa-panel" data-panel="0"><div class="sa-grid4 sa-top4">' +
      '<div class="sa-card"><h4>Site Health</h4>' + semi(r.score, 'Site Health') + '<p class="sa-sub">' + esc(grade(r.score)) + '</p></div>' +
      '<div class="sa-card"><h4>AI Search Health</h4>' + semi(ai.score, 'AI Search Health') + '<p class="sa-sub">' + ai.issues + ' issue' + (ai.issues === 1 ? '' : 's') + '</p></div>' +
      '<div class="sa-card"><h4>Errors</h4><p class="sa-big sev-text-error">' + inst.error + '</p><h4>Warnings</h4><p class="sa-big sev-text-warning">' + inst.warning + '</p><h4>Notices</h4><p class="sa-big">' + inst.notice + '</p></div>' +
      '<div class="sa-card"><h4>Crawled Pages</h4><p class="sa-big">' + pages.length + '</p><div class="sa-stack">' + seg(healthy, 'ok') + seg(withIss, 'iss') + seg(redir, 'red') + seg(broken, 'bad') + '</div><ul class="sa-legend"><li><i class="ok"></i>Healthy ' + healthy + '</li><li><i class="iss"></i>Have issues ' + withIss + '</li><li><i class="red"></i>Redirects ' + redir + '</li><li><i class="bad"></i>Broken ' + broken + '</li></ul></div></div>';
    html += '<h3 class="sa-h">Thematic Reports</h3><div class="sa-grid4">' + r.themes.map(function (t) {
      return '<div class="sa-card sa-theme"><h4>' + esc(t.name) + '</h4><p class="sa-big' + (t.score < 60 ? ' sev-text-error' : '') + '">' + t.score + '%</p><p class="sa-sub">' + t.points + ' / ' + t.max + ' points · ' + t.issues + ' issue' + (t.issues === 1 ? '' : 's') + '</p><div class="pws-bar' + (t.score < 60 ? ' low' : '') + '"><i style="width:' + t.score + '%"></i></div><button type="button" class="sa-link" data-goto="' + esc(t.name) + '">View details</button></div>';
    }).join('') + '</div>';
    html += '<div class="sa-cols"><div class="sa-card"><div class="sa-cardhead"><h4>Top Issues</h4><button type="button" class="sa-link" data-goto="">View all</button></div>' + (failed.slice(0, 6).map(function (c) { return '<div class="sa-top"><span class="pws-sev sev-' + c.severity + '"></span><div><p>' + esc(head(c)) + '</p><p class="sa-sub">' + esc(c.theme) + '</p></div><b>' + count(c) + '</b></div>'; }).join('') || '<p class="sa-sub">No issues found.</p>') + '</div>' +
      '<div class="sa-card"><h4>Mobile speed and Core Web Vitals</h4><p class="sa-sub">Measured live by Google PageSpeed Insights</p><div id="pws-psi"><p class="pws-rep-note"><span class="pws-spin"></span>Asking Google for your mobile speed score. This can take up to a minute.</p></div></div></div></div>';

    // ---- Issues
    var themes = r.themes.map(function (t) { return t.name; });
    html += '<div class="sa-panel" data-panel="1" hidden><div class="sa-filters"><div class="sa-pills" data-f="theme"><button type="button" class="on" data-v="">All <b>' + failed.length + '</b></button>' + themes.map(function (t) { return '<button type="button" data-v="' + esc(t) + '">' + esc(t) + ' <b>' + failed.filter(function (c) { return c.theme === t; }).length + '</b></button>'; }).join('') + '</div>' +
      '<div class="sa-pills" data-f="sev"><button type="button" class="on" data-v="">All issues</button><button type="button" data-v="error">Errors <b>' + r.counts.error + '</b></button><button type="button" data-v="warning">Warnings <b>' + r.counts.warning + '</b></button><button type="button" data-v="notice">Notices <b>' + r.counts.notice + '</b></button><button type="button" data-v="pass">Passed <b>' + passed.length + '</b></button></div></div>' +
      '<div class="sa-list">' + failed.concat(passed).map(issueRow).join('') + '</div><p class="sa-sub sa-empty" hidden>No issues match this filter.</p></div>';

    // ---- Crawled pages
    html += '<div class="sa-panel" data-panel="2" hidden><div class="sa-pills" data-f="pages"><button type="button" class="on" data-v="all">All pages <b>' + pages.length + '</b></button><button type="button" data-v="iss">Have issues <b>' + withIss + '</b></button><button type="button" data-v="red">Redirects <b>' + redir + '</b></button><button type="button" data-v="bad">Broken <b>' + broken + '</b></button></div>' +
      '<div class="sa-scroll"><table class="sa-table sa-pages"><thead><tr><th>Page URL</th><th>Status</th><th>Issues</th><th>Words</th><th>Size</th><th>Depth</th><th>Incoming links</th></tr></thead><tbody>' + pages.map(function (p, i) {
        var k = p.status >= 400 || p.status === 0 ? 'bad' : p.status >= 300 ? 'red' : p.issues.length ? 'iss' : 'ok';
        return '<tr data-k="' + k + '"><td><button type="button" class="sa-link sa-url" data-t="p' + i + '">' + esc(p.url.replace(/^https?:\/\/[^/]+/, '') || '/') + '</button>' + (p.title ? '<span class="sa-sub">' + esc(p.title) + '</span>' : '') + '<div class="sa-detail" id="p' + i + '" hidden>' + (p.issues.length ? '<ul>' + p.issues.map(function (x) { return '<li><span class="pws-sev sev-' + x[0] + '"></span>' + esc(x[1]) + '</li>'; }).join('') + '</ul>' : '<p class="sa-sub">No issues on this page.</p>') + '</div></td><td>' + (p.status || '-') + '</td><td>' + p.issues.length + '</td><td>' + (p.words || '-') + '</td><td>' + (p.kb ? p.kb + ' KB' : '-') + '</td><td>' + p.depth + '</td><td>' + (p.incoming == null ? '-' : p.incoming) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="sa-sub">Click a page to see its issues. Depth 0 is the home page, 1 is linked from the home page, 2 was found deeper or in the sitemap. Incoming links are counted across the crawled pages.</p></div>';

    // ---- Statistics
    var codes = {};
    pages.forEach(function (p) { var g = p.status ? String(p.status)[0] + 'xx' : 'No response'; codes[g] = (codes[g] || 0) + 1; });
    var depth = [0, 0, 0]; pages.forEach(function (p) { depth[p.depth]++; });
    var ok = pages.filter(function (p) { return p.status === 200; });
    var wb = [['Under 300', 0, 'bad'], ['300 to 600', 0, 'iss'], ['600 to 1,500', 0], ['1,500+', 0]];
    ok.forEach(function (p) { wb[p.words < 300 ? 0 : p.words < 600 ? 1 : p.words < 1500 ? 2 : 3][1]++; });
    var ib = [['0 issues', 0], ['1 to 2', 0, 'iss'], ['3 to 5', 0, 'iss'], ['6+', 0, 'bad']];
    ok.forEach(function (p) { var n = p.issues.length; ib[n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : 3][1]++; });
    var inc = [['0 to 1 links', 0, 'bad'], ['2 to 5', 0, 'iss'], ['6+', 0]];
    ok.forEach(function (p) { if (p.incoming == null) return; inc[p.incoming <= 1 ? 0 : p.incoming <= 5 ? 1 : 2][1]++; });
    html += '<div class="sa-panel" data-panel="3" hidden><div class="sa-grid2">' +
      bars('HTTP status codes', Object.keys(codes).sort().map(function (k) { return [k, codes[k], /^[45]|No/.test(k) ? 'bad' : k === '3xx' ? 'iss' : '']; })) +
      bars('Crawl depth', [['Home page', depth[0]], ['1 click', depth[1]], ['2+ clicks / sitemap', depth[2]]]) +
      bars('Word count per page', wb) + bars('Issues per page', ib) + bars('Incoming internal links', inc) +
      bars('Checks by result', [['Errors', r.counts.error, 'bad'], ['Warnings', r.counts.warning, 'iss'], ['Notices', r.counts.notice], ['Passed', r.counts.passed]]) + '</div>' +
      (r.appendix ? '<h3 class="sa-h">Full technical detail</h3>' + r.appendix.map(function (a) { return '<details class="pws-passed"><summary>' + esc(a.title) + '</summary><ul class="pws-app">' + a.items.map(function (i) { return '<li><code>' + esc(i) + '</code></li>'; }).join('') + '</ul></details>'; }).join('') : '') + '</div>';

    html += '<div class="pws-rep-cta"><span class="pws-eyebrow">Next step</span><h2 class="pws-h2">Want these issues fixed?</h2><p>Book a free 30-minute call and we will go through this report with you, look at your keywords and competitors, and give you a clear plan to fix what is holding you back. A copy of your results has been sent to our team.</p><div class="pws-cta-row"><a class="pws-btn pws-btn-primary" href="/contact/">Book a free call</a><a class="pws-btn pws-btn-wa" href="' + WA + encodeURIComponent(waText) + '" target="_blank" rel="noopener">WhatsApp us</a><a class="pws-btn pws-btn-ghost" href="/pricing/">See pricing</a></div></div>';
    out.innerHTML = html;
    out.hidden = false;
    wire();
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    psi(r.url);
  }

  var wired = false;
  var f = { theme: '', sev: '' };
  function show(n) {
    out.querySelectorAll('.sa-tab').forEach(function (t, i) { t.classList.toggle('on', i === n); t.setAttribute('aria-selected', i === n); });
    out.querySelectorAll('.sa-panel').forEach(function (p, i) { p.hidden = i !== n; });
  }
  function apply() {
    var shown = 0;
    out.querySelectorAll('.sa-issue').forEach(function (el) {
      var s = el.getAttribute('data-sev');
      var vis = (!f.theme || el.getAttribute('data-theme') === f.theme) && (f.sev ? s === f.sev : s !== 'pass');
      el.hidden = !vis; if (vis) shown++;
    });
    var em = out.querySelector('.sa-empty'); if (em) em.hidden = shown > 0;
  }
  function setPill(group, v) { if (group) group.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v); }); }
  function wire() {
    f = { theme: '', sev: '' };
    apply();
    if (wired) return;
    wired = true;
    out.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t || !out.contains(t)) return;
      if (t.classList.contains('sa-tab')) { show(+t.getAttribute('data-tab')); return; }
      if (t.hasAttribute('data-goto')) { f.theme = t.getAttribute('data-goto'); f.sev = ''; setPill(out.querySelector('[data-f="theme"]'), f.theme); setPill(out.querySelector('[data-f="sev"]'), ''); apply(); show(1); out.scrollIntoView({ behavior: 'smooth' }); return; }
      if (t.hasAttribute('data-t')) { var d = document.getElementById(t.getAttribute('data-t')); d.hidden = !d.hidden; t.setAttribute('aria-expanded', !d.hidden); return; }
      var g = t.closest('.sa-pills'); if (!g) return;
      var k = g.getAttribute('data-f'), v = t.getAttribute('data-v');
      setPill(g, v);
      if (k === 'pages') { out.querySelectorAll('.sa-pages tbody tr').forEach(function (tr) { tr.hidden = v !== 'all' && tr.getAttribute('data-k') !== v; }); return; }
      f[k] = v; apply();
    });
  }

  function psi(url) {
    var box = document.getElementById('pws-psi');
    var api = '/api/psi.php?url=' + encodeURIComponent(url);
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 90000);
    fetch(api, ctrl ? { signal: ctrl.signal } : {}).then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); }).then(function (d) {
      clearTimeout(timer);
      var cats = d.lighthouseResult && d.lighthouseResult.categories || {};
      var au = d.lighthouseResult && d.lighthouseResult.audits || {};
      var tile = function (name, val, low) { return '<div class="pws-theme"><span>' + name + '</span><strong>' + val + '</strong>' + (typeof low === 'number' ? '<div class="pws-bar' + (low < 50 ? ' low' : '') + '"><i style="width:' + low + '%"></i></div>' : '') + '</div>'; };
      var pct = function (k) { return cats[k] ? Math.round(cats[k].score * 100) : null; };
      var html = '<div class="pws-speed">';
      [['performance', 'Performance'], ['seo', 'Google SEO score'], ['accessibility', 'Accessibility'], ['best-practices', 'Best practices']].forEach(function (c) { var v = pct(c[0]); if (v !== null) html += tile(c[1], v + '/100', v); });
      [['largest-contentful-paint', 'Largest Contentful Paint'], ['total-blocking-time', 'Total Blocking Time'], ['cumulative-layout-shift', 'Cumulative Layout Shift'], ['speed-index', 'Speed Index']].forEach(function (a) { if (au[a[0]]) html += tile(a[1], esc(au[a[0]].displayValue || '-'), Math.round((au[a[0]].score || 0) * 100)); });
      html += '</div><p class="pws-rep-note" style="margin-top:12px">Measured by Google Lighthouse on a simulated mobile phone. Google recommends Largest Contentful Paint under 2.5 s and Cumulative Layout Shift under 0.1.</p>';
      box.innerHTML = html;
      var cwv = document.getElementById('sa-cwv');
      if (cwv) { var perf = pct('performance'); cwv.innerHTML = '<h4>Core Web Vitals</h4><p class="sa-big' + (perf < 50 ? ' sev-text-error' : '') + '">' + perf + '%</p><p class="sa-sub">LCP ' + esc((au['largest-contentful-paint'] || {}).displayValue || '-') + ' · CLS ' + esc((au['cumulative-layout-shift'] || {}).displayValue || '-') + ' · TBT ' + esc((au['total-blocking-time'] || {}).displayValue || '-') + '</p><div class="pws-bar' + (perf < 50 ? ' low' : '') + '"><i style="width:' + perf + '%"></i></div>'; }
    }).catch(function () {
      clearTimeout(timer);
      var cw = document.getElementById('sa-cwv'); if (cw) cw.innerHTML = '<h4>Core Web Vitals</h4><p class="sa-sub">Google did not respond in time.</p>';
      box.innerHTML = '<p class="pws-rep-note">Google PageSpeed Insights is busy right now, so the live speed test could not run. You can <a href="https://pagespeed.web.dev/analysis?url=' + encodeURIComponent(url) + '" target="_blank" rel="noopener">test your speed on PageSpeed Insights</a> directly.</p>';
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.company_website.value) return;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var data = new FormData(form);
    data.append('page', location.pathname);
    btn.disabled = true;
    out.hidden = true;
    say('<span class="pws-spin"></span>Auditing your website. This usually takes 10 to 30 seconds.');
    fetch(form.getAttribute('data-endpoint'), { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (res) { return res.json().catch(function () { return { ok: false }; }); })
      .then(function (r) {
        btn.disabled = false;
        if (!r || !r.ok) { say(esc(r && r.error || 'Sorry, the audit could not run. Please try again or email contact@prismworks.studio.'), 'err'); return; }
        say('Your report is ready below.', 'ok');
        render(r);
        if (typeof gtag === 'function') gtag('event', 'generate_lead', { form_name: 'seo_audit', value: r.score });
      })
      .catch(function () { btn.disabled = false; say('Sorry, the audit could not run. Please check your connection and try again.', 'err'); });
  });
})();
