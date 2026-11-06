// Prism Works Studio static site: year, mobile menu, back to top, scroll reveal, contact form.
(function () {
  'use strict';
  document.querySelectorAll('[data-pws-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  var toggle = document.querySelector('[data-pws-menu-toggle]');
  var menu = document.querySelector('[data-pws-mobile-menu]');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.hasAttribute('hidden');
      if (open) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  document.querySelectorAll('[data-pws-top]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
  });

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll('.pws-head, .pws-card, .pws-step, .pws-faq, .pws-promise, .pws-plan, .pws-box, .pws-cta');
  if (targets.length && 'IntersectionObserver' in window && !reduce) {
    document.body.classList.add('pws-js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    targets.forEach(function (el) { el.classList.add('pws-reveal'); io.observe(el); });
  }

  // GA4 contact events: phone, email and WhatsApp clicks.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || typeof gtag !== 'function') return;
    var h = a.getAttribute('href');
    var ev = /^tel:/.test(h) ? 'contact_call' : /^mailto:/.test(h) ? 'contact_email' : h.indexOf('wa.me/') > -1 ? 'contact_whatsapp' : '';
    if (ev) gtag('event', ev, { link_url: h.split('?')[0], page_path: location.pathname });
  });

  // Contact form. If data-endpoint is set, POST the fields there; otherwise open the visitor's email app.
  var form = document.getElementById('pws-contact-form');
  if (!form) return;
  var status = form.querySelector('.pws-status');
  var say = function (t, cls) { status.textContent = t; status.className = 'pws-status ' + (cls || ''); };
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.company_website.value) return; // bot trap
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var data = new FormData(form);
    data.append('page', location.pathname);
    var endpoint = form.getAttribute('data-endpoint');
    if (!endpoint) {
      var body = 'Name: ' + data.get('name') + '\nEmail: ' + data.get('email') + '\nPhone: ' + data.get('phone') + '\nService: ' + data.get('service') + '\n\n' + (data.get('message') || '');
      window.location.href = 'mailto:contact@prismworks.studio?subject=' + encodeURIComponent('Website enquiry: ' + data.get('service')) + '&body=' + encodeURIComponent(body);
      say('Your email app should open with your message ready to send.', 'ok');
      return;
    }
    say('Sending...');
    fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); say('Thank you. We will be in touch shortly.', 'ok'); if (typeof gtag === 'function') gtag('event', 'generate_lead', { form_name: 'contact' }); })
      .catch(function () { say('Sorry, that did not send. Please email contact@prismworks.studio or call +44 7506 909018.', 'err'); });
  });
})();
