// Token Radar dashboard: renders window.RADAR (written by main.ts) with no network.
// Sorting by column, filters by text / category / chain / minimum TVL / watchlist, and a
// detail view per protocol. Hash deep-links drive the screenshots:
//   #detail=<slug>  opens that protocol's detail panel
//   #cat=<category> #chain=<chain> #q=<text> #min=<tvl>  apply those filters on load.
(function () {
  'use strict';
  var R = window.RADAR;
  if (!R || !Array.isArray(R.rows)) {
    document.body.innerHTML = '<p style="padding:40px">Token Radar: no data. Run main.ts to write data.js.</p>';
    return;
  }
  var rows = R.rows;
  var bySlug = {};
  rows.forEach(function (r) { bySlug[r.slug] = r; });
  var watchlist = {};
  (R.watchlist || []).forEach(function (s) { watchlist[s] = true; });

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function money(n) {
    if (n == null || !isFinite(n)) return '—';
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function pct(n) {
    if (n == null || !isFinite(n)) return '—';
    var v = (Math.round(n * 10) / 10).toFixed(1);
    return (n > 0 ? '+' : '') + v + '%';
  }
  function ageText(days) {
    if (days == null) return 'unknown';
    if (days < 30) return days + 'd';
    if (days < 365) return Math.round(days / 30) + 'mo';
    return (days / 365).toFixed(1) + 'y';
  }

  // Header stats.
  var top = rows[0];
  document.getElementById('stats').innerHTML =
    '<div><dt>Board rows</dt><dd>' + rows.length + '</dd></div>' +
    '<div><dt>Watchlist</dt><dd>' + R.watchlist_size + '</dd></div>' +
    '<div><dt>Top implied</dt><dd>' + (top ? money(top.implied_value_usd) : '—') + '</dd></div>' +
    '<div><dt>Snapshot</dt><dd>' + esc(R.as_of) + '</dd></div>';
  document.getElementById('asof').textContent = R.as_of;
  document.getElementById('asof2').textContent = R.as_of;
  document.getElementById('modelVer').textContent = R.model_version;

  // Filter options from the data.
  var cats = [], chains = [];
  rows.forEach(function (r) {
    if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category);
    (r.chains || []).forEach(function (c) { if (chains.indexOf(c) < 0) chains.push(c); });
  });
  cats.sort(); chains.sort();
  var catSel = document.getElementById('cat');
  cats.forEach(function (c) { catSel.add(new Option(c, c)); });
  var chainSel = document.getElementById('chain');
  chains.forEach(function (c) { chainSel.add(new Option(c, c)); });

  // Live tokens list (already trading, not ranked).
  var liveHtml = (R.live || []).map(function (l) {
    return '<li><b>' + esc(l.name) + '</b> <span class="lm">' + esc(l.category || '—') + ' · ' +
      esc((l.chains || []).join(', ') || '—') + ' · mcap ' + money(l.mcap_usd) + '</span></li>';
  }).join('');
  document.getElementById('liveList').innerHTML = liveHtml;

  // Sorting + filtering.
  var sortKey = 'rank', sortDir = 1;
  var qEl = document.getElementById('q');
  var minEl = document.getElementById('minTvl');
  var wlEl = document.getElementById('wlOnly');
  var tbody = document.getElementById('rows');
  var countEl = document.getElementById('count');
  var emptyEl = document.getElementById('empty');

  function filtered() {
    var q = qEl.value.trim().toLowerCase();
    var cat = catSel.value, chain = chainSel.value;
    var min = Number(minEl.value) || 0;
    var wl = wlEl.checked;
    return rows.filter(function (r) {
      if (q && (r.name + ' ' + r.slug).toLowerCase().indexOf(q) < 0) return false;
      if (cat && r.category !== cat) return false;
      if (chain && (r.chains || []).indexOf(chain) < 0) return false;
      if (min && r.tvl_usd < min) return false;
      if (wl && !watchlist[r.slug]) return false;
      return true;
    });
  }
  function sorted(list) {
    var k = sortKey, d = sortDir;
    return list.slice().sort(function (a, b) {
      var x = a[k], y = b[k];
      if (k === 'name' || k === 'category') {
        x = String(x || ''); y = String(y || '');
        return (x < y ? -1 : x > y ? 1 : 0) * d;
      }
      if (k === 'chains') {
        x = (a.chains || [])[0] || ''; y = (b.chains || [])[0] || '';
        return (x < y ? -1 : x > y ? 1 : 0) * d;
      }
      x = (x == null ? -Infinity : x); y = (y == null ? -Infinity : y);
      return (x - y) * d || (a.rank - b.rank);
    });
  }
  function render() {
    var list = sorted(filtered());
    countEl.textContent = list.length + ' of ' + rows.length + ' protocols';
    emptyEl.hidden = list.length > 0;
    tbody.innerHTML = list.map(function (r) {
      var chg = r.change_7d == null ? '—' : pct(r.change_7d);
      var chgCls = r.change_7d == null ? '' : (r.change_7d >= 0 ? 'up' : 'down');
      return '<tr data-slug="' + esc(r.slug) + '"' + (r.rank <= 3 ? ' class="top3"' : '') + '>' +
        '<td><span class="rank">' + r.rank + '</span></td>' +
        '<td><span class="pname">' + esc(r.name) + '</span><br><span class="pslug">' + esc(r.slug) + '</span></td>' +
        '<td>' + (r.category ? '<span class="tag">' + esc(r.category) + '</span> ' : '') +
          (watchlist[r.slug] ? '<span class="tag wl">watchlist</span>' : '') + '</td>' +
        '<td>' + esc((r.chains || []).slice(0, 3).join(', ')) + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num ' + chgCls + '">' + chg + '</td>' +
        '<td class="num val">' + money(r.implied_value_usd) + '</td></tr>';
    }).join('');
  }
  document.querySelectorAll('#board th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var k = th.getAttribute('data-sort');
      if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = (k === 'name' || k === 'category' || k === 'chains') ? 1 : -1; }
      render();
    });
  });
  [qEl, catSel, chainSel, minEl, wlEl].forEach(function (el) {
    el.addEventListener('input', render);
    el.addEventListener('change', render);
  });

  // Detail view.
  var modal = document.getElementById('modal');
  var detailEl = document.getElementById('detail');
  function openDetail(slug) {
    var r = bySlug[slug];
    if (!r) return;
    var base = r.tvl_usd * r.category_multiple;
    var steps = (r.farm_steps || []).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    detailEl.innerHTML =
      '<h2 id="dName">' + esc(r.name) + '</h2>' +
      '<p class="meta">Rank #' + r.rank + ' · ' + esc(r.slug) + ' · ' + esc(r.category || 'Uncategorised') +
      ' · ' + esc((r.chains || []).join(', ')) + ' · records no token</p>' +
      '<dl class="kv">' +
      '<div><dt>Implied value</dt><dd>' + money(r.implied_value_usd) + '</dd></div>' +
      '<div><dt>TVL</dt><dd>' + money(r.tvl_usd) + '</dd></div>' +
      '<div><dt>7-day change</dt><dd>' + pct(r.change_7d) + '</dd></div>' +
      '<div><dt>Listed</dt><dd>' + esc(r.listed_at || '—') + ' (' + ageText(r.age_days) + ')</dd></div>' +
      '</dl>' +
      '<p class="breakdown">Implied value = TVL ' + money(r.tvl_usd) + ' × category multiple ' +
      r.category_multiple.toFixed(3) + ' × growth ' + r.growth_multiplier.toFixed(3) +
      ' × maturity ' + r.maturity_multiplier.toFixed(3) + ' = <code>' + money(r.implied_value_usd) +
      '</code><br>Base (TVL × multiple): ' + money(base) + '. The multiple is the median ' +
      'market-cap-to-TVL of the ' + esc(r.category || 'same-category') + ' protocols that already trade.</p>' +
      '<h3>How to farm it</h3><ol>' + steps + '</ol>';
    modal.hidden = false;
  }
  function closeDetail() { modal.hidden = true; }
  tbody.addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (tr) openDetail(tr.getAttribute('data-slug'));
  });
  document.getElementById('closeBtn').addEventListener('click', closeDetail);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeDetail(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDetail(); });

  // Hash deep-links (used by the screenshots and shareable): #detail=<slug>,
  // #cat=<category>, #chain=<chain>, #q=<text>, #min=<tvl>.
  function applyHash() {
    var h = (location.hash || '').replace(/^#/, '');
    var params = new URLSearchParams(h);
    if (params.get('cat')) catSel.value = params.get('cat');
    if (params.get('chain')) chainSel.value = params.get('chain');
    if (params.get('q')) qEl.value = params.get('q');
    if (params.get('min')) minEl.value = params.get('min');
    if (params.get('wl') === '1') wlEl.checked = true;
    render();
    var d = params.get('detail');
    if (d && bySlug[d]) openDetail(d);
  }
  render();
  applyHash();
  // Re-apply when the hash changes (back/forward, or a shared link opened
  // over an already-loaded page).
  window.addEventListener('hashchange', applyHash);
})();
