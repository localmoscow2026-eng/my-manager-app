/* Cloud sync («ذخیره دائمی») with Supabase. Offline-first: IndexedDB stays the source the UI reads;
   every local write is also queued in the 'outbox' store (same atomic transaction) and pushed when online + signed in.
   Table public.records(user_id, store, id, data jsonb, updated_at, deleted) — RLS: each user sees only own rows.
   Conflict rule: last-write-wins by client timestamp (record.updatedAt ↔ row.updated_at). Deletes are tombstones (deleted=true). */
(function (root) {
  const SB_URL = 'https://pxajazsrhliofbzkdquv.supabase.co', SB_KEY = 'sb_publishable_0jO5qskl6pRhghnu3qMQfg_rVtrnqyH';
  const STORES = DB.STORES.concat(['settings']);   // 'settings' = meta record key 'settings'
  const EPOCH = 0, OVERLAP = 10 * 60000, PAGE = 250, MAX_BODY = 900 * 1024, MAX_ROWS = 200;   // photos (media) are ~100KB rows → size-bounded upload chunks
  const st = { user: null, status: 'off', lastSync: null, error: null, pending: 0, ready: false, available: !!root.supabase };
  let sb = null, hooks = {}, running = null, again = false, kickT = null, firstDone = false;
  const tsOf = v => { const n = Date.parse(v || ''); return isNaN(n) ? EPOCH : n; };
  const key = (s, id) => s + '|' + id;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const isNet = e => !navigator.onLine || /fetch|network|load failed|timeout/i.test(String(e && (e.message || e)));
  function client() {
    if (!sb && root.supabase) sb = root.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'mm-auth' } });
    return sb;
  }
  /* unchanged sample data counts as "older than anything" so it never overrides real cloud data */
  function isSeed(store, r) { const s = hooks.seed ? hooks.seed() : null; return !!(s && s.at && s.ids.has(r.id) && store !== 'settings' && tsOf(r.updatedAt) <= tsOf(s.at)); }
  const localTs = (store, r) => isSeed(store, r) ? EPOCH : tsOf(r.updatedAt || r.createdAt || r.at);
  const getLocal = (s, id) => s === 'settings' ? DB.get('meta', 'settings') : DB.get(s, id);
  const putOp = (s, data) => s === 'settings' ? { store: 'meta', put: Object.assign({}, data, { key: 'settings' }) } : { store: s, put: data };
  const strip = (s, r) => { if (s !== 'settings') return r; const o = Object.assign({}, r); delete o.key; return o; };

  /* Called by commit(): returns extra ops (same transaction) that queue each change for upload. */
  function outboxOps(ops, now) {
    const out = [];
    for (const o of ops) {
      if (o.store === 'meta') { if (o.put && o.put.key === 'settings') out.push({ store: 'outbox', put: { key: key('settings', 'settings'), store: 'settings', id: 'settings', data: strip('settings', o.put), deleted: false, updatedAt: o.put.updatedAt || now } }); continue; }
      if (!DB.STORES.includes(o.store)) continue;
      if (o.del !== undefined) out.push({ store: 'outbox', put: { key: key(o.store, o.del), store: o.store, id: o.del, data: null, deleted: true, updatedAt: now } });
      else out.push({ store: 'outbox', put: { key: key(o.store, o.put.id), store: o.store, id: o.put.id, data: o.put, deleted: false, updatedAt: o.put.updatedAt || now } });
    }
    return out;
  }
  /* After a full local replace (restore from file): upload new state, tombstone removed records. Restore wins (stamped now). */
  function replaceOps(oldData, newData, now) {
    const out = [];
    for (const s of DB.STORES) {
      const keep = new Set((newData[s] || []).map(r => r.id));
      for (const r of newData[s] || []) out.push({ store: 'outbox', put: { key: key(s, r.id), store: s, id: r.id, data: r, deleted: false, updatedAt: now } });
      for (const r of oldData[s] || []) if (!keep.has(r.id)) out.push({ store: 'outbox', put: { key: key(s, r.id), store: s, id: r.id, data: null, deleted: true, updatedAt: now } });
    }
    return out;
  }

  async function fetchRows(since) {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      let q = sb.from('records').select('store,id,data,updated_at,deleted').order('updated_at', { ascending: true }).order('store').order('id').range(from, from + PAGE - 1);
      if (since) q = q.gt('updated_at', new Date(tsOf(since) - OVERLAP).toISOString());
      const { data, error } = await q; if (error) throw error;
      rows.push(...data); if (data.length < PAGE) break;
    }
    return rows;
  }
  /* Merge remote rows into IndexedDB (last-write-wins). first=true: also reconcile records that exist only locally. */
  async function merge(rows, first) {
    const ops = [], outbox = new Map((await DB.getAll('outbox')).map(e => [e.key, e]));
    let changed = false, maxTs = null;
    const local = {}; for (const s of DB.STORES) local[s] = new Map((await DB.getAll(s)).map(r => [r.id, r]));
    const ls = await DB.get('meta', 'settings'); local.settings = new Map(ls ? [['settings', ls]] : []);
    const pristine = first && rows.length > 0 && DB.STORES.every(s => [...local[s].values()].every(r => isSeed(s, r)));
    const seen = new Set();
    for (const row of rows) {
      if (!STORES.includes(row.store)) continue;
      if (!maxTs || tsOf(row.updated_at) > tsOf(maxTs)) maxTs = row.updated_at;
      const k = key(row.store, row.id); seen.add(k);
      const loc = local[row.store].get(row.id), ob = outbox.get(k), rts = tsOf(row.updated_at);
      const lts = ob ? tsOf(ob.updatedAt) : loc ? localTs(row.store, loc) : -1;
      if (rts > lts) {
        if (ob) ops.push({ store: 'outbox', del: k });
        if (row.deleted) { if (loc && row.store !== 'settings') { ops.push({ store: row.store, del: row.id }); changed = true; } }
        else if (!loc || !same(strip(row.store, loc), row.data)) { ops.push(putOp(row.store, row.data)); changed = true; }
      } else if (rts === lts) { if (ob) ops.push({ store: 'outbox', del: k }); }
      else if (!ob && loc && first) ops.push({ store: 'outbox', put: { key: k, store: row.store, id: row.id, data: strip(row.store, loc), deleted: false, updatedAt: new Date(Math.max(lts, 1)).toISOString() } });
    }
    if (first) for (const s of STORES) for (const [id, r] of local[s]) {
      const k = key(s, id); if (seen.has(k) || outbox.has(k)) continue;
      if (pristine && s !== 'settings') { ops.push({ store: s, del: id }); changed = true; }   // sample data on a new device: cloud replaces it
      else ops.push({ store: 'outbox', put: { key: k, store: s, id, data: strip(s, r), deleted: false, updatedAt: r.updatedAt || r.createdAt || r.at || new Date().toISOString() } });
    }
    if (ops.length) await DB.batch(ops);
    return { changed, maxTs, pristine };
  }
  /* split the outbox into upload chunks of ≤ MAX_ROWS rows and ≈ ≤ MAX_BODY bytes (a single big row still goes alone) */
  function chunks(all) {
    const out = []; let cur = [], size = 0;
    for (const e of all) { const n = JSON.stringify(e.data || {}).length + 200; if (cur.length && (cur.length >= MAX_ROWS || size + n > MAX_BODY)) { out.push(cur); cur = []; size = 0; } cur.push(e); size += n; }
    if (cur.length) out.push(cur); return out;
  }
  async function push() {
    const all = await DB.getAll('outbox'); if (!all.length) return 0;
    for (const chunk of chunks(all)) {
      const { error } = await sb.from('records').upsert(chunk.map(e => ({ user_id: st.user.id, store: e.store, id: e.id, data: e.data || {}, updated_at: e.updatedAt, deleted: !!e.deleted })), { onConflict: 'user_id,store,id' });
      if (error) throw error;
      const ops = []; for (const e of chunk) { const cur = await DB.get('outbox', e.key); if (cur && cur.updatedAt === e.updatedAt && same(cur.data, e.data)) ops.push({ store: 'outbox', del: e.key }); }
      if (ops.length) await DB.batch(ops);
    }
    return all.length;
  }
  async function countPending() { try { st.pending = (await DB.getAll('outbox')).length; } catch (x) { } }
  function setStatus(s, err) { st.status = s; st.error = err || null; hooks.onStatus && hooks.onStatus(st); }

  async function runSync(full) {
    if (!st.user) { await countPending(); setStatus('off'); return; }
    if (!navigator.onLine) { await countPending(); setStatus('offline'); return; }
    setStatus('syncing');
    try {
      const meta = (await DB.get('meta', 'sync')) || { key: 'sync' };
      const first = meta.userId !== st.user.id;
      const rows = await fetchRows(first || full ? null : meta.lastPull);
      const r = await merge(rows, first);
      await push();
      const now = new Date().toISOString();
      await DB.batch([{ store: 'meta', put: { key: 'sync', userId: st.user.id, lastPull: r.maxTs || meta.lastPull || null, lastSync: now } }]);
      st.lastSync = now; await countPending();
      if (r.changed && hooks.onData) await hooks.onData({ first, pristine: r.pristine });
      setStatus(st.pending ? 'syncing' : 'ok');
      if (st.pending) again = true;
    } catch (e) { console.warn('sync', e); await countPending(); setStatus(isNet(e) ? 'offline' : 'error', e && (e.message || String(e))); }
  }
  /* serialised: one sync at a time; requests during a run trigger one more run */
  function sync(full) {
    if (running) { again = true; return running; }
    running = (async () => { let f = full; do { again = false; await runSync(f); f = false; } while (again && st.user && navigator.onLine && st.status !== 'error'); })().finally(() => { running = null; });
    return running;
  }
  function kick() { clearTimeout(kickT); kickT = setTimeout(() => sync(false), 300); }

  async function init(h) {
    hooks = h || {};
    const m = await DB.get('meta', 'sync'); if (m) st.lastSync = m.lastSync || null;
    await countPending();
    if (!client()) { st.available = false; st.ready = true; setStatus('off'); return; }
    try { const { data } = await sb.auth.getSession(); st.user = data && data.session ? data.session.user : null; } catch (x) { st.user = null; }
    st.ready = true; hooks.onAuth && hooks.onAuth(st);
    sb.auth.onAuthStateChange((ev, session) => {
      const u = session ? session.user : null, changed = (u && u.id) !== (st.user && st.user.id);
      st.user = u;
      if (changed) setTimeout(() => { hooks.onAuth && hooks.onAuth(st); if (u) sync(true); else setStatus('off'); }, 0);
    });
    if (st.user) sync(true); else setStatus('off');
    root.addEventListener('online', () => sync(false));
    root.addEventListener('offline', () => setStatus(st.user ? 'offline' : 'off'));
    root.addEventListener('focus', () => kick());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
    setInterval(() => { if (!document.hidden) sync(false); }, 60000);
  }
  const FA_ERR = [[/already registered|already exists/i, 'این ایمیل قبلاً ثبت شده است؛ دکمه «ورود» را بزنید.'], [/invalid login|invalid credentials/i, 'ایمیل یا رمز عبور اشتباه است.'],
    [/password.*(at least|short|6)/i, 'رمز عبور باید حداقل ۶ کاراکتر باشد.'], [/email.*(invalid|valid)|unable to validate email/i, 'ایمیل معتبر نیست.'], [/not confirmed/i, 'ایمیل هنوز تأیید نشده است.'],
    [/rate limit|too many/i, 'تعداد تلاش‌ها زیاد بود؛ چند دقیقه دیگر دوباره امتحان کنید.'], [/fetch|network|load failed/i, 'اتصال اینترنت برقرار نیست.']];
  const faErr = e => { const m = String((e && e.message) || e || ''); const f = FA_ERR.find(([r]) => r.test(m)); return f ? f[1] : 'خطا: ' + m; };
  async function signUp(email, password) {
    if (!client()) return { error: 'کتابخانه همگام‌سازی بارگذاری نشد.' };
    try { const { data, error } = await sb.auth.signUp({ email, password }); if (error) return { error: faErr(error) }; if (!data.session) return { error: 'حساب ساخته شد ولی ورود خودکار انجام نشد؛ دکمه «ورود» را بزنید.' }; st.user = data.session.user; hooks.onAuth && hooks.onAuth(st); await sync(true); return { ok: true }; }
    catch (e) { return { error: faErr(e) }; }
  }
  async function signIn(email, password) {
    if (!client()) return { error: 'کتابخانه همگام‌سازی بارگذاری نشد.' };
    try { const { data, error } = await sb.auth.signInWithPassword({ email, password }); if (error) return { error: faErr(error) }; st.user = data.session.user; hooks.onAuth && hooks.onAuth(st); await sync(true); return { ok: true }; }
    catch (e) { return { error: faErr(e) }; }
  }
  async function signOut() {
    if (st.user && navigator.onLine) { try { await sync(false); } catch (x) { } }
    try { await sb.auth.signOut({ scope: 'local' }); } catch (x) { }
    st.user = null; await DB.batch([{ store: 'meta', del: 'sync' }]); st.lastSync = null;
    hooks.onAuth && hooks.onAuth(st); setStatus('off');
  }
  root.Sync = { _chunks: chunks, init, sync, kick, outboxOps, replaceOps, signUp, signIn, signOut, state: st, get client() { return client(); } };
})(this);
