// Site chat: takes the visitor's name and contact first (sent as a lead), then answers questions
// from the site's own FAQs (assets/chat-index.json). No external services.
(function () {
  var btn = document.querySelector('[data-chat]');
  if (!btn) return;
  var wa = btn.getAttribute('data-wa');
  var STOP = ' a an and are as at be but by can do does for from how i if in is it me my of on or our so that the this to us we what when where which who why will with you your work help offer provide need want get make any much many there have has '.split(' ');
  var index = null, lead = null, step = 'name', name = '', asked = [], panel, log, input;
  try { lead = JSON.parse(localStorage.getItem('pws-chat-lead') || 'null'); } catch (e) {}

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function say(text, who, link) {
    var m = el('div', 'pws-chat-msg ' + (who || 'bot'), text);
    if (link) { var a = el('a', null, link[1]); a.href = link[0]; m.appendChild(el('br')); m.appendChild(a); }
    log.appendChild(m); log.scrollTop = log.scrollHeight;
  }
  function track(ev, p) { if (typeof gtag === 'function') gtag('event', ev, p || {}); }
  function words(s) { return s.toLowerCase().replace(/[^a-z0-9£ ]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 1 && STOP.indexOf(' ' + w + ' ') < 0 && STOP.indexOf(w) < 0; }); }
  var SYN = { dentist: 'dental', dentists: 'dental', solicitor: 'law', solicitors: 'law', lawyer: 'law', lawyers: 'law', price: 'cost', prices: 'cost', pricing: 'cost', charge: 'cost', fee: 'cost', fees: 'cost', shop: 'ecommerce', store: 'ecommerce', online: 'ecommerce', facebook: 'meta', instagram: 'meta', ppc: 'ads', advert: 'ads', advertising: 'ads', restaurants: 'restaurant', hotels: 'hotel' };
  function stem(w) { w = SYN[w] || w; return w.replace(/(ing|es|s)$/, ''); }

  function load(cb) {
    if (index) return cb();
    fetch('/assets/chat-index.json').then(function (r) { return r.json(); }).then(function (d) { index = d.map(function (x) { x.qw = words(x.q).map(stem); x.aw = words(x.a).map(stem); return x; }); cb(); }).catch(function () { index = []; cb(); });
  }
  function answer(q) {
    var qw = words(q).map(stem), best = [], here = location.pathname;
    index.forEach(function (x) {
      var s = 0, hit = 0;
      qw.forEach(function (w) { if (x.qw.indexOf(w) > -1) { s += 3; hit++; } else if (x.aw.indexOf(w) > -1) { s += 1; hit++; } });
      if (hit < Math.ceil(qw.length * 0.6)) s = 0;
      if (s && x.u === here) s += 1;
      if (s) best.push([s, x]);
    });
    best.sort(function (a, b) { return b[0] - a[0]; });
    if (!best.length || best[0][0] < Math.max(3, qw.length)) {
      say("I couldn't find a clear answer to that on our site. We'll pick it up when we contact you, or you can message us now.", 'bot', wa ? [wa, 'Chat on WhatsApp'] : ['/contact/', 'Contact us']);
      return;
    }
    var top = best[0][1];
    say(top.a, 'bot', top.u !== here ? [top.u, 'Read more: ' + top.t] : null);
    var seen = [top.u];
    best.slice(1).forEach(function (b) { if (seen.length < 3 && seen.indexOf(b[1].u) < 0 && b[0] >= best[0][0] - 1) { seen.push(b[1].u); say('Related: ' + b[1].q, 'bot', [b[1].u, b[1].t]); } });
  }
  function send(fields) {
    var d = new FormData();
    d.append('form-name', 'chatbot'); d.append('service', 'Website chat'); d.append('page', location.pathname);
    Object.keys(fields).forEach(function (k) { d.append(k, fields[k]); });
    return d;
  }
  function handle(text) {
    say(text, 'me');
    if (step === 'name') {
      name = text.slice(0, 80); step = 'contact';
      say('Thanks ' + name + '. What is the best email or phone number to reach you on?');
    } else if (step === 'contact') {
      var isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text), digits = text.replace(/[^\d]/g, '');
      if (!isEmail && digits.length < 10) { say('That does not look like an email or phone number. Could you check it?'); return; }
      lead = { name: name, email: isEmail ? text : '', phone: isEmail ? '' : text };
      fetch('/api/send-quote.php', { method: 'POST', body: send({ name: lead.name, email: lead.email, phone: lead.phone, message: 'Started a website chat.' }), headers: { Accept: 'application/json' } }).catch(function () {});
      try { localStorage.setItem('pws-chat-lead', JSON.stringify(lead)); } catch (e) {}
      track('generate_lead', { form_name: 'chatbot' });
      step = 'ask';
      say('Thank you, we will be in touch. Now, what would you like to know? Ask about SEO, ads, websites, pricing or your sector.');
    } else {
      asked.push(text.slice(0, 300));
      track('chat_question');
      load(function () { answer(text); });
    }
  }
  function open() {
    if (!panel) {
      panel = el('div', 'pws-chat'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Ask Prism Works Studio');
      var head = el('div', 'pws-chat-head', 'Ask Prism Works Studio'), x = el('button', 'pws-chat-x', '×');
      x.setAttribute('aria-label', 'Close chat'); x.onclick = function () { panel.hidden = true; };
      head.appendChild(x);
      log = el('div', 'pws-chat-log');
      var form = el('form', 'pws-chat-form'); input = el('input'); input.type = 'text'; input.setAttribute('aria-label', 'Your message'); input.placeholder = 'Type here…'; input.maxLength = 300;
      var go = el('button', 'pws-btn pws-btn-primary pws-btn-sm', 'Send'); go.type = 'submit';
      form.appendChild(input); form.appendChild(go);
      form.onsubmit = function (e) { e.preventDefault(); var v = input.value.trim(); if (!v) return; input.value = ''; handle(v); };
      panel.appendChild(head); panel.appendChild(log); panel.appendChild(form);
      if (wa) { var w = el('a', 'pws-chat-wa', 'Prefer WhatsApp? Message us'); w.href = wa; w.target = '_blank'; w.rel = 'noopener'; panel.appendChild(w); }
      document.body.appendChild(panel);
      if (lead && lead.name) { step = 'ask'; say('Welcome back ' + lead.name + '. What would you like to know?'); }
      else say('Hi! We can answer questions about SEO, ads, websites and pricing. First, what is your name?');
      track('chat_open');
    }
    panel.hidden = false; input.focus(); load(function () {});
  }
  btn.addEventListener('click', function (e) { e.preventDefault(); open(); });
  window.addEventListener('pagehide', function () {
    if (!lead || !asked.length || !navigator.sendBeacon) return;
    navigator.sendBeacon('/api/send-quote.php', send({ name: lead.name, email: lead.email, phone: lead.phone, message: 'Chat questions:\n- ' + asked.join('\n- ') }));
    asked = [];
  });
})();
