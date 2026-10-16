/* ==========================================================================
   STOREFRONT MVC ROUTER: Hash Routing Parser & Query Param Mutators
   ========================================================================== */

function route() {
  const h = location.hash.slice(1) || '/';
  const [p, qs] = h.split('?');
  const q = Object.fromEntries(new URLSearchParams(qs || ''));
  return { path: p, parts: p.split('/').filter(Boolean), q };
}

function setQ(k, v) {
  const r = route();
  if (v === '' || v == null) delete r.q[k];
  else r.q[k] = v;
  if (k !== 'page') delete r.q.page;
  const s = new URLSearchParams(r.q).toString();
  location.hash = r.path + (s ? '?' + s : '');
}

function setQMulti(obj) {
  const r = route();
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v == null) delete r.q[k];
    else r.q[k] = v;
  }
  delete r.q.page;
  const s = new URLSearchParams(r.q).toString();
  location.hash = r.path + (s ? '?' + s : '');
}

