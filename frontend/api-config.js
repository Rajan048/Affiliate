/**
 * Vercel (frontend) + Render (API): point the browser at your Render service.
 *
 * Option A — Recommended: set <meta name="velixa-api-base" content="https://YOUR.onrender.com"> in index.html + admin.html <head>
 * Option B: set FALLBACK below (no trailing slash). Meta wins if both are set.
 */
(function () {
  var m = document.querySelector('meta[name="velixa-api-base"]');
  var meta = m && m.getAttribute('content') ? m.getAttribute('content').trim() : '';
  var FALLBACK = 'https://affiliate-xct7.onrender.com';
  var raw = meta || FALLBACK;
  window.__API_BASE__ = raw.replace(/\/$/, '');
})();
