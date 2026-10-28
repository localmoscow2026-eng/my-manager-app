/* IndexedDB layer. DB structure version (IDB_VERSION) and data schema version (SCHEMA_VERSION)
   are separate. Upgrades only ADD stores; existing data is never cleared. */
(function (root) {
  const DB_NAME = 'my-manager-db', IDB_VERSION = 1, SCHEMA_VERSION = 1;
  const STORES = ['workspaces', 'goals', 'projects', 'tasks', 'recurring_tasks', 'task_occurrences', 'task_completion_history'];
  const ALL = [...STORES, 'meta', 'snapshots'];
  let db;
  function open() {
    return new Promise((res, rej) => {
      const rq = indexedDB.open(DB_NAME, IDB_VERSION);
      rq.onupgradeneeded = () => { const d = rq.result; for (const s of ALL) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: s === 'meta' ? 'key' : 'id' }); };
      rq.onsuccess = () => { db = rq.result; db.onversionchange = () => { db.close(); location.reload(); }; res(db); };
      rq.onerror = () => rej(rq.error); rq.onblocked = () => { root.onDbBlocked && root.onDbBlocked(); /* keep waiting: resolves when other tabs close */ };
    });
  }
  const done = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('abort')); });
  function getAll(store) { return new Promise((res, rej) => { const rq = db.transaction(store).objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); }); }
  function get(store, key) { return new Promise((res, rej) => { const rq = db.transaction(store).objectStore(store).get(key); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); }); }
  /* ops: [{store, put:obj} | {store, del:id}] in ONE atomic transaction */
  function batch(ops) { const names = [...new Set(ops.map(o => o.store))]; if (!names.length) return Promise.resolve(); const tx = db.transaction(names, 'readwrite'); for (const o of ops) { const s = tx.objectStore(o.store); o.del !== undefined ? s.delete(o.del) : s.put(o.put); } return done(tx); }
  async function loadAll() { const out = {}; for (const s of STORES) out[s] = await getAll(s); return out; }
  /* Replace all data atomically (used by restore). If anything fails, nothing changes. */
  function replaceAll(data) { const tx = db.transaction(STORES, 'readwrite'); for (const s of STORES) { const os = tx.objectStore(s); os.clear(); for (const r of data[s] || []) os.put(r); } return done(tx); }
  const MIGRATIONS = { /* example for future: 2: data => { ...; return data; } */ };
  function migrate(data, from) { let v = from || 1; while (v < SCHEMA_VERSION) { v++; if (MIGRATIONS[v]) data = MIGRATIONS[v](data); } return data; }
  root.DB = { open, getAll, get, batch, loadAll, replaceAll, migrate, STORES, SCHEMA_VERSION, DB_NAME };
})(this);
