/* «مدیریت من» — main app. Single state layer: every write goes through commit() → IndexedDB (atomic) → memory → render(). */
(function () {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fa = J.fa, esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = p => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const nowTs = () => new Date().toISOString();
const OWNER = 'u_owner';
const ROLES = { owner: 'مالک', admin: 'مدیر کل', manager: 'مدیر', employee: 'کارمند', viewer: 'بیننده' };
const PRI = { low: 'کم', medium: 'متوسط', high: 'بالا', urgent: 'فوری' }, PRI_W = { urgent: 4, high: 3, medium: 2, low: 1 };
const STATUS = { todo: 'انجام‌نشده', doing: 'در حال انجام', done: 'تکمیل‌شده' };
const PERIODS = { weekly: 'هفتگی', monthly: 'ماهانه', seasonal: 'فصلی', yearly: 'سالانه', long: 'بلندمدت' };
const CATS = { personal: ['برنامه روزانه', 'هدف فردی', 'قرار شخصی', 'خرید شخصی', 'یادآوری'], family: ['مناسبت', 'برنامه خانوادگی', 'خرید خانه', 'قرار خانوادگی', 'کار تکراری خانواده'] };
const COLORS = ['#243F68', '#329C7A', '#F2A65A', '#E66A70', '#4A7BD0', '#8E6AC8', '#2BA3B5', '#6B7A93'];
const P = {
  shop: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  brief: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  family: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>',
  money: '<path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  truck: '<rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  grid: '<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  tasks: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', check: '<path d="M20 6 9 17l-5-5"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  repeat: '<path d="m17 1 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 23-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>', clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  next: '<path d="m15 18-6-6 6-6"/>', prev: '<path d="m9 18 6-6-6-6"/>', menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  move: '<path d="m15 10 5 5-5 5"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>', folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'
};
const WS_ICONS = ['shop', 'brief', 'home', 'user', 'family', 'heart', 'money', 'truck', 'cart', 'star', 'chart', 'book', 'globe', 'flame'];
const ic = (n, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || P.folder}</svg>`;

/* ---------------- state layer ---------------- */
const S = { workspaces: [], goals: [], projects: [], tasks: [], recurring_tasks: [], task_occurrences: [], task_completion_history: [] };
let settings = { key: 'settings', userName: 'امین', theme: 'auto', sidebarMini: false, privacy: false };
let meta = { lastBackup: null, lastChange: null, persisted: null, snapshotAt: null };
const ui = { q: '', fws: '', fstatus: 'open', fpri: '', scope: 'all', sort: 'due', calMode: 'month', calDate: null };
let TODAY = J.todayIso();
const by = (store, id) => S[store].find(x => x.id === id);
const occId = (rid, date) => rid + '@' + date;

/* ops: [{store, put}|{store, del}] → one IndexedDB transaction, then memory, then render */
async function commit(ops, opts = {}) {
  const now = nowTs();
  ops = ops.concat([{ store: 'meta', put: { key: 'lastChange', at: now } }]);
  try { await DB.batch(ops); } catch (e) { console.error(e); toast('⚠️ ذخیره انجام نشد: ' + esc(e && e.message || e) + ' — اطلاعات قبلی دست‌نخورده باقی ماند.'); await reloadState(); render(); return false; }
  for (const o of ops) {
    if (o.store === 'meta') { if (o.put.key === 'settings') settings = o.put; else if (o.put.key === 'lastBackup') meta.lastBackup = o.put.at; else if (o.put.key === 'lastChange') meta.lastChange = o.put.at; continue; }
    const arr = S[o.store]; if (!arr) continue;
    const id = o.del !== undefined ? o.del : o.put.id, i = arr.findIndex(x => x.id === id);
    if (o.del !== undefined) { if (i >= 0) arr.splice(i, 1); } else if (i >= 0) arr[i] = o.put; else arr.push(o.put);
  }
  if (!opts.silent) render();
  return true;
}
async function reloadState() {
  const d = await DB.loadAll(); Object.assign(S, d);
  const st = await DB.get('meta', 'settings'); if (st) settings = Object.assign(settings, st);
  const lb = await DB.get('meta', 'lastBackup'); meta.lastBackup = lb ? lb.at : null;
  const lc = await DB.get('meta', 'lastChange'); meta.lastChange = lc ? lc.at : null;
  const sn = await DB.get('snapshots', 'pre-restore'); meta.snapshotAt = sn ? sn.at : null;
}

/* ---------------- domain logic ---------------- */
const taskDate = t => t.dueDate || t.startDate || null;
const isPrivate = ws => !!ws && (ws.kind === 'personal' || ws.kind === 'family');
const wsVisible = (wsId, scopeWs) => { if (scopeWs) return wsId === scopeWs; if (!settings.privacy) return true; return !isPrivate(by('workspaces', wsId)); };
function occMaps() { const m = new Map(), moved = new Map(); for (const o of S.task_occurrences) { m.set(o.id, o); if (o.movedTo && !o.skipped) { if (!moved.has(o.movedTo)) moved.set(o.movedTo, []); moved.get(o.movedTo).push(o); } } return { m, moved }; }
function mkOccItem(r, date, occ, origDate) {
  return { key: occId(r.id, origDate || date), kind: 'occ', rec: r, occ, date, origDate: origDate || date, title: (occ && occ.title) || r.title, priority: r.priority, status: (occ && occ.status) || 'todo', wsId: r.workspaceId, projectId: r.projectId, reminder: r.reminderTime, category: r.category };
}
function mkTaskItem(t) { return { key: t.id, kind: 'task', task: t, date: taskDate(t), title: t.title, priority: t.priority, status: t.status, wsId: t.workspaceId, projectId: t.projectId, reminder: t.reminderTime, category: t.category }; }
/* Recurring occurrences are virtual: built from the rule at render time; task_occurrences only stores exceptions/completions keyed ruleId@date. */
function itemsInRange(from, to, scopeWs) {
  const out = [], { m, moved } = occMaps();
  for (const t of S.tasks) { const d = taskDate(t); if (d && d >= from && d <= to && wsVisible(t.workspaceId, scopeWs)) out.push(mkTaskItem(t)); }
  for (const r of S.recurring_tasks) {
    if (!wsVisible(r.workspaceId, scopeWs)) continue;
    const dates = new Set(R.datesInRange(r.rule, from, to));
    for (const o of S.task_occurrences) if (o.recurringId === r.id && o.date >= from && o.date <= to && o.status === 'done' && !o.skipped && !o.movedTo) dates.add(o.date); // keep past history after rule edits
    for (const d of dates) { const o = m.get(occId(r.id, d)); if (o && (o.skipped || o.movedTo)) continue; out.push(mkOccItem(r, d, o)); }
  }
  for (const [d, lst] of moved) if (d >= from && d <= to) for (const o of lst) { const r = by('recurring_tasks', o.recurringId); if (r && wsVisible(r.workspaceId, scopeWs)) out.push(mkOccItem(r, d, o, o.date)); }
  return out;
}
const itemsOn = (d, ws) => itemsInRange(d, d, ws);
function nowHM() { const n = new Date(); return J.pad(n.getHours()) + ':' + J.pad(n.getMinutes()); }
function itemState(it) {
  if (it.status === 'done') return 'done';
  if (!it.date) return 'plan';
  if (it.date < TODAY) return 'over';
  if (it.date === TODAY && it.reminder && it.reminder < nowHM()) return 'over';
  if (it.date <= J.addDays(TODAY, 1)) return 'near';
  return 'plan';
}
const STATE_L = { done: ['تکمیل‌شده', 'check'], over: ['عقب‌افتاده', 'alert'], near: ['نزدیک موعد', 'clock'], plan: ['برنامه‌ریزی‌شده', 'cal'] };
const weekStart = d => J.addDays(d, -J.pWeekday(d));
function overdueItems(ws) {
  const out = S.tasks.filter(t => t.status !== 'done' && taskDate(t) && taskDate(t) < TODAY && wsVisible(t.workspaceId, ws)).map(mkTaskItem);
  return out.concat(itemsInRange(J.addDays(TODAY, -7), J.addDays(TODAY, -1), ws).filter(i => i.kind === 'occ' && i.status !== 'done'));
}
const pct = (a, b) => b ? Math.round(a * 100 / b) : 0;
function projectProgress(p) { const ts = S.tasks.filter(t => t.projectId === p.id); const done = ts.filter(t => t.status === 'done').length; return { done, total: ts.length, p: pct(done, ts.length) }; }
function goalProgress(g) {
  if (g.progressMethod === 'manual') return Math.max(0, Math.min(100, +g.manualProgress || 0));
  const ps = S.projects.filter(p => p.goalId === g.id); if (!ps.length) return 0;
  if (g.progressMethod === 'tasks') { let d = 0, t = 0; ps.forEach(p => { const x = projectProgress(p); d += x.done; t += x.total; }); return pct(d, t); }
  return Math.round(ps.reduce((s, p) => s + projectProgress(p).p, 0) / ps.length);
}
function wsStats(ws) {
  const ts = S.tasks.filter(t => t.workspaceId === ws.id), wk = itemsInRange(weekStart(TODAY), J.addDays(weekStart(TODAY), 6), ws.id).filter(i => i.kind === 'occ');
  const done = ts.filter(t => t.status === 'done').length + wk.filter(i => i.status === 'done').length, total = ts.length + wk.length;
  return { open: ts.filter(t => t.status !== 'done').length, p: pct(done, total), today: itemsOn(TODAY, ws.id).filter(i => i.status !== 'done').length, over: overdueItems(ws.id).length };
}
function nextOccurrence(r) { const d = R.datesInRange(r.rule, TODAY, J.addDays(TODAY, 400)); const { m } = occMaps(); return d.find(x => { const o = m.get(occId(r.id, x)); return !(o && (o.skipped || o.movedTo)); }) || null; }

/* ---------------- actions ---------------- */
async function setItemStatus(it, status, btn) {
  const at = nowTs(), hist = { store: 'task_completion_history', put: { id: uid('h'), userId: OWNER, workspaceId: it.wsId, taskId: it.kind === 'task' ? it.task.id : null, recurringId: it.kind === 'occ' ? it.rec.id : null, date: it.kind === 'occ' ? it.origDate : (it.date || TODAY), action: status === 'done' ? 'complete' : status === 'doing' ? 'start' : 'restore', at } };
  if (btn && status === 'done') { btn.classList.add('pop'); await new Promise(r => setTimeout(r, 280)); }
  if (it.kind === 'task') return commit([{ store: 'tasks', put: { ...it.task, status, completedAt: status === 'done' ? at : null, updatedAt: at } }, hist]);
  const base = it.occ || { id: it.key, recurringId: it.rec.id, workspaceId: it.wsId, userId: OWNER, date: it.origDate, createdAt: at };
  return commit([{ store: 'task_occurrences', put: { ...base, status, completedAt: status === 'done' ? at : null, updatedAt: at } }, hist]);
}
function findItem(key) {
  if (key.includes('@')) { const [rid, d] = key.split('@'); const r = by('recurring_tasks', rid); if (!r) return null; const o = S.task_occurrences.find(x => x.id === key); return mkOccItem(r, (o && o.movedTo) || d, o, d); }
  const t = by('tasks', key); return t ? mkTaskItem(t) : null;
}
async function deleteWorkspace(ws) {
  const cnt = s => S[s].filter(x => x.workspaceId === ws.id).length;
  const ok = await confirmModal({ title: 'حذف فضای کاری', danger: true, okText: 'بله، کامل حذف شود',
    msg: `<p>«${esc(ws.name)}» حذف می‌شود.</p><div class="warn">⚠️ همراه آن این موارد هم برای همیشه حذف می‌شوند:<br>${fa(cnt('tasks'))} کار، ${fa(cnt('recurring_tasks'))} کار تکراری، ${fa(cnt('projects'))} پروژه و ${fa(cnt('goals'))} هدف.<br>پیشنهاد: قبل از حذف، از «تنظیمات» نسخه پشتیبان بگیرید.</div>` });
  if (!ok) return;
  const ops = [{ store: 'workspaces', del: ws.id }];
  for (const s of ['goals', 'projects', 'tasks', 'recurring_tasks', 'task_occurrences']) S[s].filter(x => x.workspaceId === ws.id).forEach(x => ops.push({ store: s, del: x.id }));
  if (await commit(ops, { silent: true })) { toast('فضای کاری حذف شد'); go('#/'); }
}
async function deleteItem(it) {
  if (it.kind === 'task') {
    if (!await confirmModal({ title: 'حذف کار', danger: true, okText: 'حذف', msg: `کار «${esc(it.title)}» حذف شود؟ این عمل قابل بازگشت نیست.` })) return false;
    await commit([{ store: 'tasks', del: it.task.id }]); toast('کار حذف شد'); return true;
  }
  return deleteRecurring(it.rec, it.origDate);
}
async function deleteRecurring(r, date) {
  date = date || TODAY;
  const c = await choiceModal('حذف کار تکراری', `«${esc(r.title)}» — نوبت ${J.fmt(date)}`, [['one', 'حذف فقط همین نوبت'], ['future', 'حذف این نوبت و نوبت‌های آینده'], ['all', 'حذف کامل برنامه تکرار', 'danger']]);
  if (!c) return false;
  const at = nowTs();
  if (c === 'one') { const o = S.task_occurrences.find(x => x.id === occId(r.id, date)) || { id: occId(r.id, date), recurringId: r.id, workspaceId: r.workspaceId, userId: OWNER, date, status: 'todo', createdAt: at }; await commit([{ store: 'task_occurrences', put: { ...o, skipped: true, updatedAt: at } }]); toast('فقط این نوبت حذف شد'); return true; }
  if (c === 'future' && date > r.rule.startDate) {
    const ops = [{ store: 'recurring_tasks', put: { ...r, rule: { ...r.rule, endDate: J.addDays(date, -1) }, updatedAt: at } }];
    S.task_occurrences.filter(o => o.recurringId === r.id && o.date >= date).forEach(o => ops.push({ store: 'task_occurrences', del: o.id }));
    await commit(ops); toast('این نوبت و نوبت‌های بعدی حذف شدند؛ سوابق گذشته حفظ شد'); return true;
  }
  if (!await confirmModal({ title: 'حذف کامل', danger: true, okText: 'حذف کامل', msg: 'کل برنامه تکرار و نوبت‌های آن حذف می‌شود (تاریخچه انجام‌ها در گزارش‌ها باقی می‌ماند). ادامه می‌دهید؟' })) return false;
  const ops = [{ store: 'recurring_tasks', del: r.id }]; S.task_occurrences.filter(o => o.recurringId === r.id).forEach(o => ops.push({ store: 'task_occurrences', del: o.id }));
  await commit(ops); toast('برنامه تکرار کامل حذف شد'); return true;
}

/* ---------------- modal system ---------------- */
const stack = [];
function openModal(html, { onClose } = {}) {
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  ov.addEventListener('mousedown', e => { if (e.target === ov) closeModal(); });
  document.body.appendChild(ov); stack.push({ ov, onClose });
  return ov.firstElementChild;
}
function closeModal(val) { const m = stack.pop(); if (!m) return; m.ov.remove(); m.onClose && m.onClose(val); }
const top = () => stack.length ? stack[stack.length - 1].ov.firstElementChild : null;
function confirmModal({ title, msg, okText = 'تأیید', danger }) {
  return new Promise(res => {
    let v = false; const m = openModal(`<div class="hd"><h3>${title}</h3></div><div>${msg}</div><div class="ft"><button class="btn ${danger ? 'danger' : 'pri'}" data-c="ok">${ic(danger ? 'trash' : 'check')} ${okText}</button><button class="btn" data-c="no">انصراف</button></div>`, { onClose: () => res(v) });
    m.querySelector('[data-c=ok]').onclick = () => { v = true; closeModal(); }; m.querySelector('[data-c=no]').onclick = () => closeModal();
  });
}
function choiceModal(title, msg, choices) {
  return new Promise(res => {
    let v = null; const m = openModal(`<div class="hd"><h3>${title}</h3></div><p class="sub">${msg}</p><div class="grid">${choices.map(c => `<button class="btn ${c[2] || ''}" data-v="${c[0]}">${c[1]}</button>`).join('')}<button class="btn ghost" data-v="">انصراف</button></div>`, { onClose: () => res(v) });
    m.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { v = b.dataset.v || null; closeModal(); });
  });
}
let toastT; function toast(msg) { let t = $('.toast:not(.upd)'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.innerHTML = msg; clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 3500); }

/* ---------------- Jalali date picker ---------------- */
function dayOpts(jy, jm, sel, allowEmpty) { const n = jm ? J.monthLength(jy, jm) : 31; let s = allowEmpty ? '<option value="">روز</option>' : ''; for (let d = 1; d <= n; d++) s += `<option value="${d}" ${sel === d ? 'selected' : ''}>${fa(d)}</option>`; return s; }
function jdate(name, iso, allowEmpty = true) {
  const j = iso ? J.isoToJ(iso) : null, ty = J.isoToJ(TODAY).jy, y0 = Math.min(ty - 2, j ? j.jy : ty), y1 = Math.max(ty + 6, j ? j.jy : ty);
  let ys = allowEmpty ? '<option value="">سال</option>' : ''; for (let y = y0; y <= y1; y++) ys += `<option value="${y}" ${j && j.jy === y ? 'selected' : ''}>${fa(y)}</option>`;
  const ms = (allowEmpty ? '<option value="">ماه</option>' : '') + J.MONTHS.map((n, i) => `<option value="${i + 1}" ${j && j.jm === i + 1 ? 'selected' : ''}>${n}</option>`).join('');
  return `<div class="jdate" data-jd="${name}" data-empty="${allowEmpty ? 1 : 0}"><select aria-label="روز" data-p="d">${dayOpts(j ? j.jy : ty, j ? j.jm : 1, j ? j.jd : 0, allowEmpty)}</select><select aria-label="ماه" data-p="m">${ms}</select><select aria-label="سال" data-p="y">${ys}</select></div>
  <div class="row wrap" style="margin-top:6px;gap:6px"><button type="button" class="btn sm" data-jq="0" data-for="${name}">امروز</button><button type="button" class="btn sm" data-jq="1" data-for="${name}">فردا</button><button type="button" class="btn sm" data-jq="7" data-for="${name}">هفته بعد</button>${allowEmpty ? `<button type="button" class="btn sm ghost" data-jq="clear" data-for="${name}">بدون تاریخ</button>` : ''}</div>`;
}
function readJ(root, name) {
  const w = root.querySelector(`[data-jd="${name}"]`); if (!w) return null;
  const y = +w.querySelector('[data-p=y]').value, m = +w.querySelector('[data-p=m]').value, d = +w.querySelector('[data-p=d]').value;
  if (!y && !m && !d) return null; if (!y || !m || !d) throw new Error('تاریخ ناقص است؛ روز، ماه و سال را کامل انتخاب کنید یا «بدون تاریخ» را بزنید.');
  if (d > J.monthLength(y, m)) throw new Error('این ماه این تعداد روز ندارد.');
  return J.jToIso(y, m, d);
}
function setJ(root, name, iso) {
  const w = root.querySelector(`[data-jd="${name}"]`), j = iso ? J.isoToJ(iso) : null, ys = w.querySelector('[data-p=y]'), em = w.dataset.empty === '1';
  if (!j && !em) return;
  if (j && ![...ys.options].some(o => +o.value === j.jy)) ys.insertAdjacentHTML('beforeend', `<option value="${j.jy}">${fa(j.jy)}</option>`);
  ys.value = j ? j.jy : ''; w.querySelector('[data-p=m]').value = j ? j.jm : '';
  w.querySelector('[data-p=d]').innerHTML = dayOpts(j ? j.jy : J.isoToJ(TODAY).jy, j ? j.jm : 1, j ? j.jd : 0, em);
}
document.addEventListener('change', e => { const s = e.target.closest('.jdate select'); if (!s || s.dataset.p === 'd') return; const w = s.parentNode, y = +w.querySelector('[data-p=y]').value || J.isoToJ(TODAY).jy, m = +w.querySelector('[data-p=m]').value, ds = w.querySelector('[data-p=d]'), cur = +ds.value; ds.innerHTML = dayOpts(y, m, Math.min(cur, m ? J.monthLength(y, m) : 31), w.dataset.empty === '1'); });
document.addEventListener('click', e => { const b = e.target.closest('[data-jq]'); if (!b) return; const root = b.closest('form') || document; setJ(root, b.dataset.for, b.dataset.jq === 'clear' ? null : J.addDays(TODAY, +b.dataset.jq)); });

/* ---------------- forms ---------------- */
function wsOptions(sel) { return S.workspaces.slice().sort((a, b) => (a.order || 0) - (b.order || 0)).map(w => `<option value="${w.id}" ${w.id === sel ? 'selected' : ''}>${esc(w.name)}</option>`).join(''); }
function projOptions(wsId, sel) { return '<option value="">— بدون پروژه —</option>' + S.projects.filter(p => p.workspaceId === wsId).map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.title)}</option>`).join(''); }
function catOptions(wsId, sel) { const w = by('workspaces', wsId); const c = (w && w.categories) || []; return c.length ? '<option value="">— دسته —</option>' + c.map(x => `<option ${x === sel ? 'selected' : ''}>${esc(x)}</option>`).join('') : ''; }
const subRow = s => `<label data-sub="${esc(s.id)}"><input type="checkbox" ${s.done ? 'checked' : ''} aria-label="انجام زیرکار"><input type="text" value="${esc(s.title)}" placeholder="عنوان زیرکار"><button type="button" class="icon-btn" data-delsub aria-label="حذف زیرکار">${ic('x')}</button></label>`;
const showErr = (f, x) => { const er = f.querySelector('[data-err]'); er.textContent = x.message; er.classList.remove('hidden'); };

function taskForm(opts = {}) {
  const t = opts.task || opts.rec || {}, isRec = !!opts.rec, editing = !!(opts.task || opts.rec);
  const wsId = t.workspaceId || opts.wsId || (S.workspaces[0] && S.workspaces[0].id);
  if (!wsId) { toast('ابتدا یک فضای کاری بسازید'); return; }
  const rule = t.rule || { type: opts.recType || 'none', days: [0, 1, 2, 3, 4], interval: 2, startDate: opts.date || TODAY };
  const m = openModal(`<form data-form="task"><div class="hd"><h3>${editing ? 'ویرایش کار' : 'افزودن کار'}${isRec ? ' تکراری' : ''}</h3><button type="button" class="icon-btn" data-close aria-label="بستن">${ic('x')}</button></div>
  <label class="f"><span>عنوان *</span><input type="text" name="title" maxlength="200" value="${esc(t.title)}"></label>
  <label class="f"><span>توضیحات</span><textarea name="description">${esc(t.description)}</textarea></label>
  <div class="grid g2"><label class="f"><span>فضای کاری</span><select name="workspaceId">${wsOptions(wsId)}</select></label>
  <label class="f"><span>پروژه</span><select name="projectId">${projOptions(wsId, t.projectId)}</select></label></div>
  <label class="f ${catOptions(wsId) ? '' : 'hidden'}" data-catwrap><span>دسته</span><select name="category">${catOptions(wsId, t.category)}</select></label>
  <div class="grid g2"><label class="f"><span>اولویت</span><select name="priority">${Object.entries(PRI).map(([k, v]) => `<option value="${k}" ${(t.priority || 'medium') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
  <label class="f"><span>ساعت یادآوری</span><input type="time" name="reminderTime" value="${esc(t.reminderTime || '')}"></label></div>
  <label class="f"><span>تکرار</span><select name="recType" ${editing && !isRec ? 'disabled' : ''}>${editing && isRec ? '' : '<option value="none">بدون تکرار</option>'}${Object.entries(R.TYPES).map(([k, v]) => `<option value="${k}" ${rule.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
  <div data-once>
   ${!isRec ? `<label class="f"><span>وضعیت</span><select name="status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${(t.status || 'todo') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>` : ''}
   <label class="f"><span>تاریخ شروع</span>${jdate('startDate', t.startDate || null)}</label>
   <label class="f"><span>تاریخ سررسید</span>${jdate('dueDate', editing ? t.dueDate : (opts.date || TODAY))}</label></div>
  <div data-rec>
   <div class="f" data-days><span class="sub">روزهای هفته</span><div class="days">${J.WEEKDAYS.map((d, i) => `<label><input type="checkbox" name="day" value="${i}" ${(rule.days || []).includes(i) ? 'checked' : ''}><span>${d}</span></label>`).join('')}</div></div>
   <label class="f" data-interval><span>هر چند روز؟</span><input type="text" inputmode="numeric" name="interval" value="${fa(rule.interval || 2)}"></label>
   <label class="f"><span>شروع تکرار</span>${jdate('recStart', rule.startDate || TODAY, false)}</label>
   <label class="f"><span>پایان تکرار (اختیاری)</span>${jdate('recEnd', rule.endDate || null)}</label>
   ${editing ? '<p class="note">تغییر برنامه تکرار، سوابق انجام روزهای گذشته را حذف نمی‌کند.</p>' : ''}</div>
  <div class="f"><span class="sub">زیرکارها</span><div class="subs" data-subs>${(t.subtasks || []).map(subRow).join('')}</div><button type="button" class="btn sm" data-addsub>${ic('plus')} افزودن زیرکار</button></div>
  <p class="c-red hidden" data-err role="alert"></p>
  <div class="ft"><button class="btn pri" type="submit">${ic('check')} ذخیره</button><button type="button" class="btn" data-close>انصراف</button></div></form>`);
  const f = m.querySelector('form'), sync = () => { const v = f.recType.value; f.querySelector('[data-once]').classList.toggle('hidden', v !== 'none'); f.querySelector('[data-rec]').classList.toggle('hidden', v === 'none'); f.querySelector('[data-days]').classList.toggle('hidden', !['custom', 'weekdays5'].includes(v)); f.querySelector('[data-interval]').classList.toggle('hidden', v !== 'everyN'); };
  f.recType.onchange = () => { if (f.recType.value === 'weekdays5') $$('[name=day]', f).forEach(c => c.checked = +c.value <= 4); sync(); }; sync();
  f.workspaceId.onchange = () => { f.projectId.innerHTML = projOptions(f.workspaceId.value); const c = catOptions(f.workspaceId.value); f.category.innerHTML = c; f.querySelector('[data-catwrap]').classList.toggle('hidden', !c); };
  f.querySelector('[data-addsub]').onclick = () => { f.querySelector('[data-subs]').insertAdjacentHTML('beforeend', subRow({ id: uid('s'), title: '', done: false })); f.querySelector('[data-subs] label:last-child input[type=text]').focus(); };
  f.onsubmit = async e => {
    e.preventDefault(); f.querySelector('[data-err]').classList.add('hidden');
    try {
      const title = f.title.value.trim(); if (!title) throw new Error('عنوان را وارد کنید');
      const subtasks = $$('[data-sub]', f).map(l => ({ id: l.dataset.sub, title: l.querySelector('input[type=text]').value.trim(), done: l.querySelector('input[type=checkbox]').checked })).filter(s => s.title);
      const at = nowTs(), type = f.recType.value;
      const common = { title, description: f.description.value.trim(), workspaceId: f.workspaceId.value, projectId: f.projectId.value || null, category: f.category.value || null, priority: f.priority.value, reminderTime: f.reminderTime.value || null, subtasks, userId: t.userId || OWNER, assigneeId: t.assigneeId || null, updatedAt: at };
      if (type === 'none') {
        const startDate = readJ(f, 'startDate'), dueDate = readJ(f, 'dueDate'); if (startDate && dueDate && dueDate < startDate) throw new Error('سررسید نباید قبل از تاریخ شروع باشد');
        const status = f.status.value;
        await commit([{ store: 'tasks', put: { ...t, ...common, id: t.id || uid('t'), startDate, dueDate, status, completedAt: status === 'done' ? (t.completedAt || at) : null, createdAt: t.createdAt || at } }]);
      } else {
        const r = { type, days: $$('[name=day]:checked', f).map(c => +c.value), interval: +J.toEn(f.interval.value.trim()), startDate: readJ(f, 'recStart'), endDate: readJ(f, 'recEnd') };
        if (type !== 'everyN') r.interval = 1; if (!['custom', 'weekdays5'].includes(type)) r.days = [];
        const v = R.validate(r); if (v) throw new Error(v);
        const ops = [{ store: 'recurring_tasks', put: { ...t, ...common, id: t.id || uid('r'), rule: r, createdAt: t.createdAt || at } }];
        if (t.id && t.workspaceId !== common.workspaceId) S.task_occurrences.filter(o => o.recurringId === t.id).forEach(o => ops.push({ store: 'task_occurrences', put: { ...o, workspaceId: common.workspaceId } }));
        await commit(ops);
      }
      closeModal(); toast(editing ? 'تغییرات ذخیره شد' : 'کار اضافه شد');
    } catch (x) { showErr(f, x); }
  };
  return f;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-delsub]'); if (b) { e.preventDefault(); b.closest('[data-sub]').remove(); return; } const c = e.target.closest('[data-close]'); if (c) { e.preventDefault(); closeModal(); } });

function detailsModal(it) {
  const t = it.task || it.rec, ws = by('workspaces', it.wsId), pr = it.projectId && by('projects', it.projectId), st = itemState(it);
  const hist = S.task_completion_history.filter(h => it.kind === 'task' ? h.taskId === t.id : h.recurringId === t.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  const m = openModal(`<div class="hd"><h3>${esc(it.title)}</h3><button class="icon-btn" data-close aria-label="بستن">${ic('x')}</button></div>
  <div class="meta" style="font-size:13px"><span class="badge b-${st}">${ic(STATE_L[st][1])} ${STATE_L[st][0]}</span><span class="badge">${STATUS[it.status]}</span><span class="badge ${it.priority === 'urgent' ? 'b-urgent' : it.priority === 'high' ? 'b-high' : ''}">اولویت: ${PRI[it.priority]}</span>${it.category ? `<span class="badge">${esc(it.category)}</span>` : ''}</div>
  ${t.description ? `<p>${esc(t.description)}</p>` : ''}
  <div class="note" style="margin:10px 0">فضای کاری: <b>${esc(ws ? ws.name : '—')}</b>${pr ? ` · پروژه: <b>${esc(pr.title)}</b>` : ''}<br>
  ${it.kind === 'occ' ? `${R.describe(t.rule)}<br>این نوبت: ${J.fmt(it.date, true)}${it.origDate !== it.date ? ` (منتقل‌شده از ${J.fmt(it.origDate)})` : ''}` : `شروع: ${t.startDate ? J.fmt(t.startDate) : '—'} · سررسید: ${t.dueDate ? J.fmt(t.dueDate) : '—'}`}
  ${it.reminder ? `<br>یادآوری: ${fa(it.reminder)}` : ''}<br><span class="sub">ایجاد: ${J.fmt(J.todayIso(new Date(t.createdAt)))} · آخرین ویرایش: ${J.fmt(J.todayIso(new Date(t.updatedAt)))}</span></div>
  ${(t.subtasks || []).length ? `<div class="subs"><b>زیرکارها</b>${t.subtasks.map(s => `<label><input type="checkbox" data-tsub="${esc(s.id)}" ${s.done ? 'checked' : ''}> ${esc(s.title)}</label>`).join('')}</div>` : ''}
  <div class="ft">${it.status === 'done' ? `<button class="btn" data-d="restore">${ic('repeat')} بازگرداندن</button>` : `<button class="btn pri" data-d="done">${ic('check')} تکمیل</button>${it.status !== 'doing' ? `<button class="btn" data-d="doing">در حال انجام</button>` : ''}`}</div>
  <div class="ft"><button class="btn" data-d="edit">${ic('edit')} ویرایش${it.kind === 'occ' ? ' برنامه تکرار' : ''}</button>${it.kind === 'occ' ? `<button class="btn" data-d="occedit">${ic('cal')} فقط این نوبت</button>` : ''}<button class="btn" data-d="move">${ic('move')} انتقال</button><button class="btn danger" data-d="del">${ic('trash')} حذف</button></div>
  ${hist.length ? `<details style="margin-top:12px"><summary class="sub">تاریخچه انجام</summary>${hist.map(h => `<div class="sub">${J.fmt(h.date)} — ${h.action === 'complete' ? 'تکمیل' : h.action === 'start' ? 'شروع' : 'بازگردانی'}</div>`).join('')}</details>` : ''}`);
  m.querySelectorAll('[data-tsub]').forEach(c => c.onchange = () => { const store = it.kind === 'task' ? 'tasks' : 'recurring_tasks', tt = by(store, t.id); commit([{ store, put: { ...tt, subtasks: tt.subtasks.map(s => s.id === c.dataset.tsub ? { ...s, done: c.checked } : s), updatedAt: nowTs() } }]); });
  m.querySelectorAll('[data-d]').forEach(b => b.onclick = async () => {
    const a = b.dataset.d; closeModal();
    if (a === 'done' || a === 'restore' || a === 'doing') { await setItemStatus(it, a === 'restore' ? 'todo' : a); if (a === 'done') toast('✓ ' + (it.kind === 'occ' ? 'فقط نوبت ' + J.fmt(it.origDate) + ' تکمیل شد' : 'تکمیل شد')); }
    else if (a === 'edit') taskForm(it.kind === 'task' ? { task: t } : { rec: t });
    else if (a === 'del') await deleteItem(it);
    else if (a === 'move') moveModal(it);
    else if (a === 'occedit') occEditModal(it);
  });
}
function moveModal(it) {
  const t = it.task || it.rec, m = openModal(`<form><div class="hd"><h3>انتقال به فضای کاری دیگر</h3></div><label class="f"><span>فضای کاری مقصد</span><select name="ws">${wsOptions(t.workspaceId)}</select></label><p class="sub">پروژه مرتبط پاک می‌شود چون پروژه‌ها مخصوص هر فضای کاری‌اند.</p><div class="ft"><button class="btn pri">انتقال</button><button type="button" class="btn" data-close>انصراف</button></div></form>`);
  m.querySelector('form').onsubmit = async e => {
    e.preventDefault(); const w = e.target.ws.value; if (w === t.workspaceId) return closeModal();
    const store = it.kind === 'task' ? 'tasks' : 'recurring_tasks', ops = [{ store, put: { ...t, workspaceId: w, projectId: null, category: null, updatedAt: nowTs() } }];
    if (it.kind === 'occ') S.task_occurrences.filter(o => o.recurringId === t.id).forEach(o => ops.push({ store: 'task_occurrences', put: { ...o, workspaceId: w } }));
    closeModal(); await commit(ops); toast('منتقل شد به «' + esc(by('workspaces', w).name) + '»');
  };
}
function occEditModal(it) {
  const m = openModal(`<form><div class="hd"><h3>تغییر فقط همین نوبت</h3></div><p class="sub">نوبت اصلی: ${J.fmt(it.origDate, true)} — سایر نوبت‌ها تغییری نمی‌کنند.</p>
  <label class="f"><span>عنوان این نوبت</span><input type="text" name="title" value="${esc(it.title)}"></label><label class="f"><span>انتقال به تاریخ</span>${jdate('to', it.date, false)}</label>
  <p class="c-red hidden" data-err></p><div class="ft"><button class="btn pri">ذخیره</button><button type="button" class="btn" data-close>انصراف</button></div></form>`);
  const f = m.querySelector('form'); f.onsubmit = async e => {
    e.preventDefault(); let to; try { to = readJ(f, 'to'); } catch (x) { return showErr(f, x); }
    const at = nowTs(), base = it.occ || { id: it.key, recurringId: it.rec.id, workspaceId: it.wsId, userId: OWNER, date: it.origDate, status: 'todo', createdAt: at };
    const title = f.title.value.trim(); closeModal();
    await commit([{ store: 'task_occurrences', put: { ...base, title: title && title !== it.rec.title ? title : null, movedTo: to !== it.origDate ? to : null, updatedAt: at } }]); toast('این نوبت به‌روزرسانی شد');
  };
}
function wsForm(ws) {
  const w = ws || { icon: 'brief', color: COLORS[0], kind: 'business', categories: [] };
  const m = openModal(`<form><div class="hd"><h3>${ws ? 'ویرایش' : 'افزودن'} فضای کاری</h3><button type="button" class="icon-btn" data-close aria-label="بستن">${ic('x')}</button></div>
  <label class="f"><span>نام *</span><input type="text" name="name" maxlength="80" value="${esc(w.name)}"></label>
  <label class="f"><span>توضیحات</span><textarea name="description">${esc(w.description)}</textarea></label>
  <label class="f"><span>نوع</span><select name="kind"><option value="business">کسب‌وکار</option><option value="personal" ${w.kind === 'personal' ? 'selected' : ''}>شخصی (خصوصی)</option><option value="family" ${w.kind === 'family' ? 'selected' : ''}>خانواده (خصوصی)</option></select></label>
  <div class="f"><span class="sub">آیکون</span><div class="iconpick">${WS_ICONS.map(n => `<button type="button" data-ic="${n}" class="${w.icon === n ? 'on' : ''}" aria-label="آیکون ${n}">${ic(n)}</button>`).join('')}</div></div>
  <div class="f"><span class="sub">رنگ</span><div class="colors">${COLORS.map(c => `<button type="button" data-col="${c}" style="background:${c}" class="${w.color === c ? 'on' : ''}" aria-label="رنگ ${c}"></button>`).join('')}</div></div>
  <div class="f"><span class="sub">لوگو (اختیاری)</span><div class="row"><div class="av" data-prev style="background:${w.color}">${w.logo ? `<img src="${w.logo}" alt="">` : ic(w.icon)}</div><label class="btn sm">انتخاب تصویر<input type="file" accept="image/*" hidden data-logo></label><button type="button" class="btn sm ghost" data-nologo>حذف لوگو</button></div></div>
  <label class="f"><span>دسته‌ها (با ویرگول جدا کنید)</span><input type="text" name="cats" value="${esc((w.categories || []).join('، '))}"></label>
  <p class="c-red hidden" data-err></p><div class="ft"><button class="btn pri">${ic('check')} ذخیره</button><button type="button" class="btn" data-close>انصراف</button></div></form>`);
  const f = m.querySelector('form'); let icon = w.icon, color = w.color, logo = w.logo || null;
  const prev = () => { const p = f.querySelector('[data-prev]'); p.style.background = color; p.innerHTML = logo ? `<img src="${logo}" alt="">` : ic(icon); };
  f.querySelectorAll('[data-ic]').forEach(b => b.onclick = () => { icon = b.dataset.ic; f.querySelectorAll('[data-ic]').forEach(x => x.classList.toggle('on', x === b)); prev(); });
  f.querySelectorAll('[data-col]').forEach(b => b.onclick = () => { color = b.dataset.col; f.querySelectorAll('[data-col]').forEach(x => x.classList.toggle('on', x === b)); prev(); });
  f.querySelector('[data-nologo]').onclick = () => { logo = null; prev(); };
  f.kind.onchange = () => { if (!f.cats.value.trim() && CATS[f.kind.value]) f.cats.value = CATS[f.kind.value].join('، '); };
  f.querySelector('[data-logo]').onchange = e => { const file = e.target.files[0]; if (!file) return; const rd = new FileReader(); rd.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = 128; const s = Math.min(img.width, img.height); c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 128, 128); logo = c.toDataURL('image/png'); prev(); }; img.onerror = () => toast('تصویر قابل خواندن نیست'); img.src = rd.result; }; rd.readAsDataURL(file); };
  f.onsubmit = async e => {
    e.preventDefault(); const name = f.name.value.trim(); if (!name) return showErr(f, new Error('نام را وارد کنید')); const at = nowTs();
    const rec = { ...w, id: w.id || uid('w'), userId: w.userId || OWNER, name, description: f.description.value.trim(), kind: f.kind.value, icon, color, logo, categories: f.cats.value.split(/[،,]/).map(s => s.trim()).filter(Boolean), order: w.order ?? S.workspaces.length, memberIds: w.memberIds || [OWNER], createdAt: w.createdAt || at, updatedAt: at };
    closeModal(); await commit([{ store: 'workspaces', put: rec }]); toast(ws ? 'فضای کاری ویرایش شد' : 'فضای کاری ساخته شد');
  };
}
function goalForm(g, wsId) {
  g = g || { period: 'monthly', progressMethod: 'avg', workspaceId: wsId || (S.workspaces[0] || {}).id };
  const m = openModal(`<form><div class="hd"><h3>${g.id ? 'ویرایش' : 'ثبت'} هدف</h3><button type="button" class="icon-btn" data-close aria-label="بستن">${ic('x')}</button></div>
  <label class="f"><span>عنوان هدف *</span><input type="text" name="title" value="${esc(g.title)}"></label><label class="f"><span>توضیحات</span><textarea name="description">${esc(g.description)}</textarea></label>
  <div class="grid g2"><label class="f"><span>فضای کاری</span><select name="workspaceId">${wsOptions(g.workspaceId)}</select></label><label class="f"><span>بازه</span><select name="period">${Object.entries(PERIODS).map(([k, v]) => `<option value="${k}" ${g.period === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
  <label class="f"><span>تاریخ هدف (اختیاری)</span>${jdate('targetDate', g.targetDate || null)}</label>
  <label class="f"><span>روش محاسبه پیشرفت</span><select name="progressMethod"><option value="avg">میانگین درصد پروژه‌ها</option><option value="tasks" ${g.progressMethod === 'tasks' ? 'selected' : ''}>مجموع کارهای همه پروژه‌ها</option><option value="manual" ${g.progressMethod === 'manual' ? 'selected' : ''}>دستی</option></select></label>
  <label class="f" data-man><span>درصد دستی (۰ تا ۱۰۰)</span><input type="text" inputmode="numeric" name="manualProgress" value="${fa(g.manualProgress || 0)}"></label>
  <p class="c-red hidden" data-err></p><div class="ft"><button class="btn pri">${ic('check')} ذخیره</button><button type="button" class="btn" data-close>انصراف</button></div></form>`);
  const f = m.querySelector('form'), s = () => f.querySelector('[data-man]').classList.toggle('hidden', f.progressMethod.value !== 'manual'); f.progressMethod.onchange = s; s();
  f.onsubmit = async e => {
    e.preventDefault(); let td; try { td = readJ(f, 'targetDate'); if (!f.title.value.trim()) throw new Error('عنوان هدف را وارد کنید'); } catch (x) { return showErr(f, x); }
    const at = nowTs(), rec = { ...g, id: g.id || uid('g'), userId: g.userId || OWNER, title: f.title.value.trim(), description: f.description.value.trim(), workspaceId: f.workspaceId.value, period: f.period.value, targetDate: td, progressMethod: f.progressMethod.value, manualProgress: Math.max(0, Math.min(100, +J.toEn(f.manualProgress.value) || 0)), createdAt: g.createdAt || at, updatedAt: at };
    const ops = [{ store: 'goals', put: rec }]; if (g.id && g.workspaceId !== rec.workspaceId) S.projects.filter(p => p.goalId === g.id).forEach(p => ops.push({ store: 'projects', put: { ...p, goalId: null } }));
    closeModal(); await commit(ops); toast('هدف ذخیره شد');
  };
}
function projectForm(p, defaults = {}) {
  p = p || { workspaceId: defaults.wsId || (S.workspaces[0] || {}).id, goalId: defaults.goalId || null };
  const goalOpts = w => '<option value="">— بدون هدف —</option>' + S.goals.filter(g => g.workspaceId === w).map(g => `<option value="${g.id}" ${g.id === p.goalId ? 'selected' : ''}>${esc(g.title)}</option>`).join('');
  const m = openModal(`<form><div class="hd"><h3>${p.id ? 'ویرایش' : 'افزودن'} پروژه</h3><button type="button" class="icon-btn" data-close aria-label="بستن">${ic('x')}</button></div>
  <label class="f"><span>عنوان پروژه *</span><input type="text" name="title" value="${esc(p.title)}"></label><label class="f"><span>توضیحات</span><textarea name="description">${esc(p.description)}</textarea></label>
  <div class="grid g2"><label class="f"><span>فضای کاری</span><select name="workspaceId">${wsOptions(p.workspaceId)}</select></label><label class="f"><span>هدف</span><select name="goalId">${goalOpts(p.workspaceId)}</select></label></div>
  <p class="c-red hidden" data-err></p><div class="ft"><button class="btn pri">${ic('check')} ذخیره</button><button type="button" class="btn" data-close>انصراف</button></div></form>`);
  const f = m.querySelector('form'); f.workspaceId.onchange = () => f.goalId.innerHTML = goalOpts(f.workspaceId.value);
  f.onsubmit = async e => {
    e.preventDefault(); if (!f.title.value.trim()) return showErr(f, new Error('عنوان پروژه را وارد کنید'));
    const at = nowTs(), rec = { ...p, id: p.id || uid('p'), userId: p.userId || OWNER, title: f.title.value.trim(), description: f.description.value.trim(), workspaceId: f.workspaceId.value, goalId: f.goalId.value || null, createdAt: p.createdAt || at, updatedAt: at };
    const ops = [{ store: 'projects', put: rec }]; if (p.id && p.workspaceId !== rec.workspaceId) S.tasks.filter(t => t.projectId === p.id).forEach(t => ops.push({ store: 'tasks', put: { ...t, workspaceId: rec.workspaceId } }));
    closeModal(); await commit(ops); toast('پروژه ذخیره شد');
  };
}

/* ---------------- views ---------------- */
const wsAv = (w, size) => `<div class="av" style="background:${esc(w.color)};${size ? `width:${size}px;height:${size}px` : ''}">${w.logo ? `<img src="${esc(w.logo)}" alt="">` : ic(w.icon)}</div>`;
const barColor = p => p >= 70 ? 'var(--green)' : p >= 40 ? 'var(--orange)' : 'var(--accent)';
const pctColor = p => p >= 70 ? 'var(--green-t)' : p >= 40 ? 'var(--orange-t)' : 'var(--accent)';
function itemRow(it, opts = {}) {
  const st = itemState(it), ws = by('workspaces', it.wsId);
  return `<div class="item ${st}" data-key="${esc(it.key)}"><button class="chk" data-act="toggle" data-key="${esc(it.key)}" aria-label="${it.status === 'done' ? 'بازگرداندن' : 'تکمیل'} «${esc(it.title)}»"><span>${it.status === 'done' ? ic('check') : ''}</span></button>
  <div class="main" data-act="details" data-key="${esc(it.key)}"><div class="t">${esc(it.title)}</div><div class="meta"><span class="badge b-${st}">${STATE_L[st][0]}</span>${it.priority === 'urgent' || it.priority === 'high' ? `<span class="badge b-${it.priority}">${PRI[it.priority]}</span>` : ''}${it.kind === 'occ' ? `<span title="تکراری">${ic('repeat')}</span>` : ''}${it.status === 'doing' ? '<span>در حال انجام</span>' : ''}${!opts.noWs && ws ? `<span>${esc(ws.name)}</span>` : ''}${it.date && !opts.noDate ? `<span>${J.fmt(it.date)}</span>` : ''}${it.reminder ? `<span>⏰ ${fa(it.reminder)}</span>` : ''}</div></div>
  <button class="icon-btn" data-act="del" data-key="${esc(it.key)}" aria-label="حذف «${esc(it.title)}»">${ic('trash')}</button></div>`;
}
function recRow(r) {
  const today = itemsOn(TODAY).find(i => i.kind === 'occ' && i.rec.id === r.id);
  if (today) return itemRow(today);
  const nx = nextOccurrence(r);
  return `<div class="item plan"><span class="chk" aria-hidden="true">${ic('repeat')}</span><div class="main" data-act="recdetails" data-id="${r.id}"><div class="t">${esc(r.title)}</div><div class="meta"><span>${R.describe(r.rule)}</span><span>${esc((by('workspaces', r.workspaceId) || {}).name || '')}</span><span>نوبت بعد: ${nx ? J.fmt(nx) : '—'}</span></div></div><button class="icon-btn" data-act="recdel" data-id="${r.id}" aria-label="حذف «${esc(r.title)}»">${ic('trash')}</button></div>`;
}
const list = (items, opts) => items.length ? items.map(i => itemRow(i, opts)).join('') : `<div class="empty">${(opts && opts.empty) || 'موردی نیست'}</div>`;
const sortItems = a => a.sort((x, y) => (x.status === 'done') - (y.status === 'done') || (x.date || '9').localeCompare(y.date || '9') || PRI_W[y.priority] - PRI_W[x.priority] || (x.reminder || '99').localeCompare(y.reminder || '99'));
function wsCard(w) { const s = wsStats(w); return `<div class="card ws" data-act="openws" data-id="${w.id}" role="link" tabindex="0" aria-label="${esc(w.name)}">${wsAv(w)}<div class="body"><div class="row"><h3 class="sp">${esc(w.name)}</h3><span class="pct" style="color:${pctColor(s.p)}">${fa(s.p)}٪</span></div><div class="sub">${fa(s.open)} کار باز${s.today ? ` · ${fa(s.today)} برای امروز` : ''}${s.over ? ` · <span class="c-red">${fa(s.over)} عقب‌افتاده</span>` : ''}</div><div class="bar"><i style="width:${s.p}%;background:${barColor(s.p)}"></i></div></div></div>`; }
function backupBanner() {
  const lb = meta.lastBackup, old = !lb || (Date.now() - new Date(lb)) > 7 * 864e5, changed = meta.lastChange && (!lb || meta.lastChange > lb);
  if (!(old && changed)) return '';
  return `<div class="banner" role="status">${ic('alert')}<span class="sp">${lb ? `آخرین پشتیبان ${fa(Math.floor((Date.now() - new Date(lb)) / 864e5))} روز پیش بوده.` : 'هنوز نسخه پشتیبان نگرفته‌اید.'} برای جلوگیری از ازدست‌رفتن اطلاعات، پشتیبان بگیرید.</span><button class="btn sm pri" data-act="export">پشتیبان‌گیری</button></div>`;
}
const goalCardMini = g => { const p = goalProgress(g); return `<a class="card row" href="#/goals" style="text-decoration:none;color:inherit"><div class="sp"><h3>${esc(g.title)}</h3><div class="sub">${PERIODS[g.period]} · ${esc((by('workspaces', g.workspaceId) || {}).name || '')}</div><div class="bar"><i style="width:${p}%;background:${barColor(p)}"></i></div></div><b class="pct" style="font-size:24px;color:${pctColor(p)}">${fa(p)}٪</b></a>`; };
function vDashboard() {
  const today = itemsOn(TODAY), ws0 = weekStart(TODAY), week = itemsInRange(ws0, J.addDays(ws0, 6)), over = overdueItems();
  const dDone = today.filter(i => i.status === 'done').length, wDone = week.filter(i => i.status === 'done').length, h = new Date().getHours();
  const greet = h < 5 ? 'شب بخیر' : h < 12 ? 'صبح بخیر' : h < 17 ? 'روز بخیر' : 'عصر بخیر';
  const seenRec = new Set(), hp = sortItems(itemsInRange(TODAY, J.addDays(TODAY, 7)).concat(over.filter(i => i.kind === 'task')).filter(i => i.status !== 'done' && (i.priority === 'high' || i.priority === 'urgent'))).filter(i => { if (i.kind !== 'occ') return true; if (seenRec.has(i.rec.id)) return false; seenRec.add(i.rec.id); return true; }).slice(0, 6);
  const near = today.filter(i => i.status !== 'done' && i.reminder && itemState(i) === 'near');
  const biz = S.workspaces.filter(w => !isPrivate(w)).sort((a, b) => (a.order || 0) - (b.order || 0)), priv = S.workspaces.filter(isPrivate);
  const goals = S.goals.filter(g => wsVisible(g.workspaceId) && (g.period === 'monthly' || g.period === 'weekly')).slice(0, 3);
  return `<div class="row"><div class="sp"><div class="sub">${J.fmt(TODAY, true)}</div><h1>${greet}، ${esc(settings.userName || '')} 👋</h1></div><a class="icon-btn" href="#/settings" aria-label="تنظیمات">${ic('gear')}</a></div>
  <div style="margin-top:14px">${backupBanner()}${over.length ? `<div class="banner" style="border:1px solid var(--red)">${ic('alert')}<span class="sp">${fa(over.length)} کار عقب‌افتاده دارید.</span><a class="btn sm" href="#/tasks?scope=overdue">مشاهده</a></div>` : ''}${near.length ? `<div class="banner">${ic('bell')}<span class="sp">نزدیک موعد امروز: ${near.map(i => esc(i.title) + ' (' + fa(i.reminder) + ')').join('، ')}</span></div>` : ''}</div>
  <div class="grid g3" style="margin-top:6px">
   <div class="card stat" data-stat="today"><b class="c-green">${fa(today.length)}</b><span>کارهای امروز</span></div><div class="card stat" data-stat="week"><b class="c-orange">${fa(week.length)}</b><span>این هفته</span></div><div class="card stat" data-stat="over"><b class="c-red">${fa(over.length)}</b><span>عقب‌افتاده</span></div></div>
  <div class="card prog" style="margin-top:10px"><div class="row"><div class="ring" style="--p:${pct(dDone, today.length)}" data-l="${fa(pct(dDone, today.length))}٪"></div><div><b>پیشرفت امروز</b><div class="sub">${fa(dDone)} از ${fa(today.length)} انجام شد</div></div></div>
   <div class="row"><div class="ring" style="--p:${pct(wDone, week.length)}" data-l="${fa(pct(wDone, week.length))}٪"></div><div><b>پیشرفت هفته</b><div class="sub" data-stat="done">${fa(wDone)} تکمیل‌شده از ${fa(week.length)}</div></div></div></div>
  <h2 class="row"><span class="sp">کارهای امروز</span><button class="btn sm" data-act="addtask">${ic('plus')} کار جدید</button></h2>${list(sortItems(today), { noDate: true, empty: 'برای امروز کاری ثبت نشده — با دکمه + اضافه کنید' })}
  ${hp.length ? `<h2>اولویت بالا</h2>${list(hp)}` : ''}
  <h2 class="row"><span class="sp">کسب‌وکارهای من</span><button class="btn sm" data-act="addws">${ic('plus')} فضای جدید</button></h2><div class="grid wsgrid">${biz.map(wsCard).join('') || '<div class="empty">هنوز کسب‌وکاری ندارید</div>'}</div>
  ${goals.length ? `<h2>اهداف جاری</h2><div class="grid wsgrid">${goals.map(goalCardMini).join('')}</div>` : ''}
  <h2>شخصی و خانواده</h2><div class="grid wsgrid">${priv.map(wsCard).join('') || '<div class="empty">فضای شخصی/خانوادگی ندارید</div>'}</div>`;
}
function vTasks(params) {
  if (params.scope) ui.scope = params.scope;
  const q = ui.q.trim().toLowerCase();
  const matchItem = i => (!q || (i.title + ' ' + ((i.task || i.rec).description || '')).toLowerCase().includes(q)) && (!ui.fws || i.wsId === ui.fws) && (!ui.fpri || i.priority === ui.fpri) && (ui.fstatus === 'all' || (ui.fstatus === 'open' ? i.status !== 'done' : i.status === ui.fstatus));
  const recMatch = r => wsVisible(r.workspaceId) && (!q || (r.title + ' ' + (r.description || '')).toLowerCase().includes(q)) && (!ui.fws || r.workspaceId === ui.fws) && (!ui.fpri || r.priority === ui.fpri);
  let items, recs = []; const ws0 = weekStart(TODAY);
  if (ui.scope === 'today') items = itemsOn(TODAY); else if (ui.scope === 'week') items = itemsInRange(ws0, J.addDays(ws0, 6)); else if (ui.scope === 'overdue') items = overdueItems();
  else if (ui.scope === 'recurring') { items = []; recs = S.recurring_tasks.filter(recMatch); }
  else if (ui.scope === 'nodate') items = S.tasks.filter(t => !taskDate(t) && wsVisible(t.workspaceId)).map(mkTaskItem);
  else { items = S.tasks.filter(t => wsVisible(t.workspaceId)).map(mkTaskItem); recs = S.recurring_tasks.filter(recMatch); }
  items = items.filter(matchItem);
  const cmp = { due: (a, b) => (a.date || '9999').localeCompare(b.date || '9999'), priority: (a, b) => PRI_W[b.priority] - PRI_W[a.priority], created: (a, b) => ((b.task || b.rec).createdAt || '').localeCompare((a.task || a.rec).createdAt || ''), title: (a, b) => a.title.localeCompare(b.title, 'fa') }[ui.sort];
  items.sort((a, b) => cmp(a, b) || PRI_W[b.priority] - PRI_W[a.priority]);
  const sel = (n, label, o, v) => `<select data-ui="${n}" aria-label="${label}">${o.map(([k, l]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  return `<div class="row"><h1 class="sp">کارها</h1><button class="btn pri" data-act="addtask">${ic('plus')} افزودن</button></div>
  <div class="seg" style="margin:14px 0 10px;overflow-x:auto">${[['all', 'همه'], ['today', 'امروز'], ['week', 'این هفته'], ['overdue', 'عقب‌افتاده'], ['recurring', 'تکراری'], ['nodate', 'بی‌تاریخ']].map(([k, l]) => `<button data-scope="${k}" class="${ui.scope === k ? 'on' : ''}">${l}</button>`).join('')}</div>
  <div class="toolbar"><input type="search" class="full" placeholder="جست‌وجو در کارها…" data-ui="q" value="${esc(ui.q)}" aria-label="جست‌وجو">
  ${sel('fws', 'فضای کاری', [['', 'همه فضاها'], ...S.workspaces.map(w => [w.id, w.name])], ui.fws)}${sel('fstatus', 'وضعیت', [['open', 'باز'], ['all', 'همه وضعیت‌ها'], ['todo', 'انجام‌نشده'], ['doing', 'در حال انجام'], ['done', 'تکمیل‌شده']], ui.fstatus)}
  ${sel('fpri', 'اولویت', [['', 'همه اولویت‌ها'], ...Object.entries(PRI)], ui.fpri)}${sel('sort', 'مرتب‌سازی', [['due', 'مرتب: تاریخ'], ['priority', 'مرتب: اولویت'], ['created', 'مرتب: جدیدترین'], ['title', 'مرتب: عنوان']], ui.sort)}</div>
  <div style="margin-top:14px" data-list>${ui.scope !== 'recurring' ? list(items, { empty: 'کاری با این فیلترها پیدا نشد' }) : ''}</div>
  ${recs.length ? `<h2>کارهای تکراری</h2>${recs.map(recRow).join('')}` : (ui.scope === 'recurring' ? '<div class="empty">کار تکراری ندارید</div>' : '')}`;
}
const GM = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن', 'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
function vCalendar() {
  const d = ui.calDate || TODAY, j = J.isoToJ(d), mode = ui.calMode; let body = '', title = '';
  const dotsFor = items => { const s = new Set(items.map(itemState)); return ['over', 'near', 'plan', 'done'].filter(x => s.has(x)).map(x => `<i class="d-${x}"></i>`).join(''); };
  if (mode === 'month') {
    const first = J.jToIso(j.jy, j.jm, 1), n = J.monthLength(j.jy, j.jm), last = J.jToIso(j.jy, j.jm, n), byDay = {};
    itemsInRange(first, last).forEach(i => (byDay[i.date] = byDay[i.date] || []).push(i));
    title = `${J.MONTHS[j.jm - 1]} ${fa(j.jy)}`;
    let cells = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map(x => `<div class="h">${x}</div>`).join('') + '<div></div>'.repeat(J.pWeekday(first));
    for (let k = 1; k <= n; k++) { const iso = J.jToIso(j.jy, j.jm, k), its = byDay[iso] || []; cells += `<button class="day ${iso === TODAY ? 'today' : ''} ${iso === d && iso !== TODAY ? 'sel' : ''} ${J.pWeekday(iso) === 6 ? 'fri' : ''}" data-act="calday" data-d="${iso}" aria-label="${J.fmt(iso, true)}، ${fa(its.length)} کار">${fa(k)}<span class="dots">${dotsFor(its)}</span></button>`; }
    const g1 = first.split('-'), g2 = last.split('-');
    body = `<div class="sub" style="margin-top:-6px;margin-bottom:10px">${GM[g1[1] - 1]}${g1[1] !== g2[1] ? '–' + GM[g2[1] - 1] : ''} ${fa(g2[0])}</div><div class="card"><div class="cal">${cells}</div></div>
    <h2>برنامه‌ی ${d === TODAY ? 'امروز · ' : ''}${J.fmt(d, true)}</h2>${list(sortItems(itemsOn(d)), { noDate: true, empty: 'برای این روز کاری ثبت نشده' })}<button class="btn" data-act="addtask" data-date="${d}">${ic('plus')} افزودن کار برای این روز</button>`;
  } else if (mode === 'week') {
    const s = weekStart(d); title = `هفته ${J.fmt(s)} تا ${J.fmt(J.addDays(s, 6))}`;
    for (let k = 0; k < 7; k++) { const iso = J.addDays(s, k); body += `<h2 class="row ${J.pWeekday(iso) === 6 ? 'c-red' : ''}"><span class="sp">${J.fmt(iso, true)}${iso === TODAY ? ' · امروز' : ''}</span><button class="icon-btn" data-act="addtask" data-date="${iso}" aria-label="افزودن کار برای ${J.fmt(iso)}">${ic('plus')}</button></h2>${list(sortItems(itemsOn(iso)), { noDate: true, empty: '—' })}`; }
  } else { title = J.fmt(d, true); body = list(sortItems(itemsOn(d)), { noDate: true, empty: 'برای این روز کاری ثبت نشده' }) + `<button class="btn" data-act="addtask" data-date="${d}">${ic('plus')} افزودن کار</button>`; }
  return `<div class="row"><h1 class="sp" style="font-size:24px">${title}</h1><button class="icon-btn" data-act="calnav" data-n="-1" aria-label="قبلی">${ic('prev')}</button><button class="btn sm" data-act="caltoday">امروز</button><button class="icon-btn" data-act="calnav" data-n="1" aria-label="بعدی">${ic('next')}</button></div>
  <div class="seg" style="margin:12px 0">${[['day', 'روزانه'], ['week', 'هفتگی'], ['month', 'ماهانه']].map(([k, l]) => `<button data-calmode="${k}" class="${mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>${body}
  <div class="legend"><span><i class="d-done"></i>انجام‌شده</span><span><i class="d-plan"></i>برنامه‌ریزی‌شده</span><span><i class="d-near"></i>نزدیک به موعد</span><span><i class="d-over"></i>عقب‌افتاده</span></div>`;
}
const projRow = pr => { const x = projectProgress(pr); return `<div class="note" style="margin-bottom:6px"><div class="row"><b class="sp">${esc(pr.title)}</b><span class="sub">${fa(x.done)}/${fa(x.total)} · ${fa(x.p)}٪</span><button class="icon-btn" data-act="addtask" data-ws="${pr.workspaceId}" data-proj="${pr.id}" aria-label="افزودن کار به پروژه">${ic('plus')}</button><button class="icon-btn" data-act="editproj" data-id="${pr.id}" aria-label="ویرایش پروژه">${ic('edit')}</button><button class="icon-btn" data-act="delproj" data-id="${pr.id}" aria-label="حذف پروژه">${ic('trash')}</button></div><div class="bar"><i style="width:${x.p}%;background:${barColor(x.p)}"></i></div>${S.tasks.filter(t => t.projectId === pr.id).map(t => `<div class="sub" data-act="details" data-key="${t.id}" style="cursor:pointer;padding:3px 0">${t.status === 'done' ? '✓' : '○'} ${esc(t.title)}</div>`).join('')}</div>`; };
function goalBlock(g) {
  const p = goalProgress(g), ps = S.projects.filter(x => x.goalId === g.id);
  return `<div class="card" style="margin-bottom:10px" data-goal="${g.id}"><div class="row"><div class="sp"><h3>${esc(g.title)}</h3><div class="sub">${PERIODS[g.period]}${g.targetDate ? ' · تا ' + J.fmt(g.targetDate) : ''} · ${esc((by('workspaces', g.workspaceId) || {}).name || '')} · ${g.progressMethod === 'manual' ? 'پیشرفت دستی' : g.progressMethod === 'tasks' ? 'بر اساس کارها' : 'میانگین پروژه‌ها'}</div></div><b class="pct" style="font-size:22px;color:${pctColor(p)}">${fa(p)}٪</b>
  <button class="icon-btn" data-act="editgoal" data-id="${g.id}" aria-label="ویرایش هدف">${ic('edit')}</button><button class="icon-btn" data-act="delgoal" data-id="${g.id}" aria-label="حذف هدف">${ic('trash')}</button></div><div class="bar"><i style="width:${p}%;background:${barColor(p)}"></i></div>
  <div style="margin-top:10px">${ps.map(projRow).join('')}</div><button class="btn sm" data-act="addproj" data-goal="${g.id}" data-ws="${g.workspaceId}">${ic('plus')} پروژه برای این هدف</button></div>`;
}
function vGoals() {
  const gs = S.goals.filter(g => wsVisible(g.workspaceId) && (!ui.fws || g.workspaceId === ui.fws)), loose = S.projects.filter(p => !p.goalId && wsVisible(p.workspaceId) && (!ui.fws || p.workspaceId === ui.fws));
  return `<div class="row wrap"><h1 class="sp">اهداف و پروژه‌ها</h1><button class="btn pri" data-act="addgoal">${ic('plus')} هدف</button><button class="btn" data-act="addproj">${ic('plus')} پروژه</button></div>
  <p class="sub">ساختار: فضای کاری ← هدف ← پروژه ← کارها</p><select data-ui="fws" style="margin-bottom:12px" aria-label="فضای کاری"><option value="">همه فضاها</option>${wsOptions(ui.fws)}</select>
  ${Object.keys(PERIODS).map(k => { const x = gs.filter(g => g.period === k); return x.length ? `<h2>اهداف ${PERIODS[k]}</h2>${x.map(goalBlock).join('')}` : ''; }).join('') || '<div class="empty">هنوز هدفی ثبت نکرده‌اید</div>'}
  ${loose.length ? `<h2>پروژه‌های بدون هدف</h2>${loose.map(projRow).join('')}` : ''}`;
}
function vWorkspace(id) {
  const w = by('workspaces', id); if (!w) return `<div class="empty">این فضای کاری پیدا نشد (شاید حذف شده). <a href="#/">بازگشت</a></div>`;
  const s = wsStats(w), today = sortItems(itemsOn(TODAY, id)), up = sortItems(itemsInRange(J.addDays(TODAY, 1), J.addDays(TODAY, 14), id)), over = overdueItems(id);
  const nod = S.tasks.filter(t => t.workspaceId === id && !taskDate(t)).map(mkTaskItem), done = S.tasks.filter(t => t.workspaceId === id && t.status === 'done').length;
  const recs = S.recurring_tasks.filter(r => r.workspaceId === id), gs = S.goals.filter(g => g.workspaceId === id), loose = S.projects.filter(p => p.workspaceId === id && !p.goalId);
  const since = new Date(Date.now() - 30 * 864e5).toISOString(), hist = S.task_completion_history.filter(h => h.workspaceId === id && h.action === 'complete' && h.at >= since).length;
  return `<div class="row">${wsAv(w, 60)}<div class="sp"><h1 style="font-size:24px">${esc(w.name)}</h1><div class="sub">${esc(w.description || '')}${isPrivate(w) ? ' · 🔒 خصوصی' : ''}</div></div><button class="icon-btn" data-act="editws" data-id="${id}" aria-label="ویرایش فضای کاری">${ic('edit')}</button><button class="icon-btn" data-act="delws" data-id="${id}" aria-label="حذف فضای کاری">${ic('trash')}</button></div>
  <div class="grid g3" style="margin-top:14px"><div class="card stat"><b class="c-green">${fa(s.today)}</b><span>باز امروز</span></div><div class="card stat"><b class="c-orange">${fa(s.open)}</b><span>کار باز</span></div><div class="card stat"><b class="c-red">${fa(over.length)}</b><span>عقب‌افتاده</span></div></div>
  <div class="card" style="margin-top:10px"><b>گزارش پیشرفت</b><div class="bar"><i style="width:${s.p}%;background:${barColor(s.p)}"></i></div><div class="sub" style="margin-top:6px">${fa(s.p)}٪ پیشرفت (کارهای یک‌باره + نوبت‌های این هفته) · ${fa(done)} کار تکمیل‌شده · ${fa(hist)} انجام در ۳۰ روز اخیر · ایجاد: ${J.fmt(J.todayIso(new Date(w.createdAt)))}</div></div>
  <div class="row wrap" style="margin-top:12px"><button class="btn pri" data-act="addtask" data-ws="${id}">${ic('plus')} کار</button><button class="btn" data-act="addtask" data-ws="${id}" data-rec="daily">${ic('repeat')} کار تکراری</button><button class="btn" data-act="addgoal" data-ws="${id}">${ic('target')} هدف</button><button class="btn" data-act="addproj" data-ws="${id}">${ic('folder')} پروژه</button></div>
  ${over.length ? `<h2 class="c-red">عقب‌افتاده</h2>${list(over, { noWs: true })}` : ''}<h2>امروز</h2>${list(today, { noWs: true, noDate: true })}<h2>۱۴ روز آینده</h2>${list(up.slice(0, 30), { noWs: true })}
  ${nod.length ? `<h2>بدون تاریخ</h2>${list(nod, { noWs: true })}` : ''}${recs.length ? `<h2>برنامه‌های تکرار</h2>${recs.map(recRow).join('')}` : ''}
  <h2>اهداف و پروژه‌ها</h2>${gs.map(goalBlock).join('') || '<div class="empty">هدفی ثبت نشده</div>'}${loose.map(projRow).join('')}`;
}
function vLife() {
  const priv = S.workspaces.filter(isPrivate);
  return `<h1>شخصی و خانواده</h1><p class="sub">این فضاها از کسب‌وکارها جدا هستند. با «حالت حریم خصوصی» در تنظیمات، از فهرست کل کارها و تقویم پنهان می‌شوند.</p>
  ${priv.map(w => `<div style="margin-top:16px">${wsCard(w)}</div><div class="row wrap" style="margin:8px 0">${(w.categories || []).map(c => `<button class="btn sm" data-act="addtask" data-ws="${w.id}" data-cat="${esc(c)}">${ic('plus')} ${esc(c)}</button>`).join('')}</div>${list(sortItems(itemsInRange(TODAY, J.addDays(TODAY, 7), w.id)), { noWs: true, empty: 'برای هفت روز آینده چیزی ثبت نشده' })}`).join('') || '<div class="empty">فضای شخصی یا خانوادگی ندارید.</div>'}
  <button class="btn" data-act="addws" style="margin-top:12px">${ic('plus')} فضای جدید</button>`;
}
function vSettings() {
  const lb = meta.lastBackup;
  return `<h1>تنظیمات</h1>
  <h2>ظاهر</h2><div class="card"><div class="seg">${[['auto', 'خودکار'], ['light', 'روشن'], ['dark', 'تاریک']].map(([k, l]) => `<button data-theme-set="${k}" class="${settings.theme === k ? 'on' : ''}">${l}</button>`).join('')}</div>
  <form data-form="name" class="row" style="margin-top:12px"><input type="text" name="n" value="${esc(settings.userName)}" aria-label="نام شما" placeholder="نام شما"><button class="btn">ذخیره نام</button></form>
  <label class="row" style="margin-top:12px;min-height:44px"><input type="checkbox" data-privacy ${settings.privacy ? 'checked' : ''} style="width:22px;height:22px"> حالت حریم خصوصی: امور شخصی و خانواده در فهرست کل کارها/تقویم نمایش داده نشوند</label></div>
  <h2>پشتیبان‌گیری و بازیابی</h2><div class="card">
  <p>آخرین پشتیبان: <b data-lastbackup>${lb ? J.fmt(J.todayIso(new Date(lb)), true) + ' ساعت ' + fa(new Date(lb).toTimeString().slice(0, 5)) : 'هنوز گرفته نشده'}</b></p>${backupBanner()}
  <div class="row wrap"><button class="btn pri" data-act="export">${ic('check')} دریافت فایل پشتیبان (JSON)</button><label class="btn">بازیابی از فایل<input type="file" accept=".json,application/json" hidden data-import></label></div>
  ${meta.snapshotAt ? `<p class="note" style="margin-top:10px">قبل از آخرین بازیابی، یک کپی خودکار از اطلاعات قبلی گرفته شد (${J.fmt(J.todayIso(new Date(meta.snapshotAt)))}).<br><button class="btn sm" data-act="revert" style="margin-top:6px">بازگشت به اطلاعات قبل از بازیابی</button></p>` : ''}
  <p class="sub">اطلاعات فقط روی همین دستگاه و همین مرورگر ذخیره می‌شود و دائمی‌بودن آن ۱۰۰٪ تضمین‌شده نیست (پاک‌کردن داده‌های مرورگر یا محدودیت‌های iOS ممکن است آن را حذف کند). به‌طور منظم پشتیبان بگیرید و فایل را در جای امن (مثلاً iCloud Drive یا ایمیل) نگه دارید.</p>
  <p class="sub">وضعیت ذخیره‌سازی پایدار: ${meta.persisted === true ? '✓ مرورگر اجازه ذخیره پایدار داد' : meta.persisted === false ? 'مرورگر ذخیره پایدار را تأیید نکرد (معمول در iOS/Safari)' : 'نامشخص / پشتیبانی نمی‌شود'}</p></div>
  <h2>یادآوری‌ها</h2><div class="card"><p class="sub">یادآوری‌ها فقط وقتی برنامه باز است نمایش داده می‌شوند (هشدار درون‌برنامه‌ای و در صورت اجازه، اعلان مرورگر). اعلان زمان‌بندی‌شده هنگام بسته‌بودن برنامه، به‌ویژه روی آیفون، تضمین نمی‌شود و نیازمند سرور در نسخه آنلاین آینده است.</p>
  <button class="btn" data-act="notif">${ic('bell')} ${'Notification' in window ? (Notification.permission === 'granted' ? 'اعلان مرورگر فعال است' : 'اجازه اعلان مرورگر') : 'اعلان در این مرورگر پشتیبانی نمی‌شود'}</button></div>
  <h2>کاربران و دسترسی‌ها (آینده)</h2><div class="card"><p class="sub">نسخه فعلی تک‌کاربره است (شما: ${ROLES.owner}). ساختار داده برای نقش‌های ${Object.values(ROLES).join('، ')} و دسترسی هر کارمند به فضاهای مجاز آماده است؛ اعمال واقعی مجوزها در نسخه آنلاین و سمت سرور انجام خواهد شد.</p></div>
  <h2>درباره</h2><div class="card sub">مدیریت من · نسخه ۱٫۰٫۰ · ساختار داده نسخه ${fa(DB.SCHEMA_VERSION)} · ${fa(S.workspaces.length)} فضای کاری، ${fa(S.tasks.length)} کار، ${fa(S.recurring_tasks.length)} کار تکراری</div>`;
}

/* ---------------- render & routing ---------------- */
const NAV = [['#/', 'grid', 'خانه'], ['#/tasks', 'tasks', 'کارها'], ['#/calendar', 'cal', 'تقویم'], ['#/goals', 'target', 'اهداف'], ['#/life', 'family', 'خانواده']];
function route() { const h = location.hash || '#/'; const [path, qs] = h.split('?'); return { path, params: Object.fromEntries(new URLSearchParams(qs || '')) }; }
function go(h) { if (location.hash === h) render(); else location.hash = h; }
function applyTheme() { const t = settings.theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : settings.theme; document.documentElement.dataset.theme = t; $('meta[name=theme-color]').content = t === 'dark' ? '#0E1A2E' : '#243F68'; }
let lastPath = '', booted = false;
function render() {
  if (!booted) return;
  applyTheme(); TODAY = J.todayIso();
  const { path, params } = route();
  const act = p => p === '#/' ? path === '#/' || path === '' : path.startsWith(p) || (p === '#/life' && path.startsWith('#/ws/') && isPrivate(by('workspaces', path.slice(5))));
  let v;
  try { v = path === '#/tasks' ? vTasks(params) : path === '#/calendar' ? vCalendar() : path === '#/goals' ? vGoals() : path === '#/life' ? vLife() : path === '#/settings' ? vSettings() : path.startsWith('#/ws/') ? vWorkspace(path.slice(5)) : vDashboard(); }
  catch (e) { console.error(e); v = `<div class="warn">خطا در نمایش صفحه: ${esc(e.message)}</div>`; }
  const ae = document.activeElement, focus = ae && ae.dataset && ae.dataset.ui, sel = focus && ae.selectionStart;
  $('#app').innerHTML = `<nav class="side ${settings.sidebarMini ? 'mini' : ''}" aria-label="منوی اصلی"><div class="brand"><img src="icons/logo.svg" alt=""><span class="lbl">مدیریت من</span></div>
  ${NAV.map(([h, i, l]) => `<a href="${h}" class="${act(h) ? 'on' : ''}">${ic(i)}<span class="lbl">${l}</span></a>`).join('')}<a href="#/settings" class="${act('#/settings') ? 'on' : ''}">${ic('gear')}<span class="lbl">تنظیمات</span></a>
  <a href="#" class="collapse" data-act="mini">${ic('menu')}<span class="lbl">جمع‌کردن منو</span></a></nav>
  <main id="main">${v}</main><nav class="tabbar" aria-label="منوی پایین">${NAV.map(([h, i, l]) => `<a href="${h}" class="${act(h) ? 'on' : ''}">${ic(i)}<span>${l}</span></a>`).join('')}</nav>
  <button class="fab" data-act="addtask" aria-label="افزودن کار سریع">${ic('plus')}</button>`;
  if (focus) { const el = $(`[data-ui="${focus}"]`); if (el) { el.focus(); if (sel != null && el.setSelectionRange) try { el.setSelectionRange(sel, sel); } catch (x) { } } }
  if (path !== lastPath) { scrollTo(0, 0); lastPath = path; }
}
window.addEventListener('hashchange', render);

/* ---------------- global event delegation: the innermost [data-act] wins, so a delete/tick button never opens the parent card ---------------- */
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act],[data-scope],[data-calmode],[data-theme-set]'); if (!el) return;
  if (el.dataset.scope) { ui.scope = el.dataset.scope; if (location.hash !== '#/tasks') history.replaceState(null, '', '#/tasks'); return render(); }
  if (el.dataset.calmode) { ui.calMode = el.dataset.calmode; return render(); }
  if (el.dataset.themeSet) return commit([{ store: 'meta', put: { ...settings, theme: el.dataset.themeSet } }]);
  const a = el.dataset.act, d = el.dataset; e.preventDefault(); e.stopPropagation();
  switch (a) {
    case 'toggle': { const it = findItem(d.key); if (!it) break; const was = it.status; await setItemStatus(it, was === 'done' ? 'todo' : 'done', el); toast(was === 'done' ? 'کار بازگردانده شد' : it.kind === 'occ' ? '✓ فقط نوبت ' + J.fmt(it.origDate) + ' تکمیل شد' : '✓ کار تکمیل شد'); break; }
    case 'details': { const it = findItem(d.key); if (it) detailsModal(it); break; }
    case 'del': { const it = findItem(d.key); if (it) await deleteItem(it); break; }
    case 'recdetails': { const r = by('recurring_tasks', d.id); if (r) { const nx = nextOccurrence(r) || TODAY; detailsModal(mkOccItem(r, nx, S.task_occurrences.find(o => o.id === occId(r.id, nx)))); } break; }
    case 'recdel': { const r = by('recurring_tasks', d.id); if (r) await deleteRecurring(r, nextOccurrence(r) || TODAY); break; }
    case 'addtask': { const rp = route().path, ws = d.ws || (rp.startsWith('#/ws/') ? rp.slice(5) : null); const f = taskForm({ wsId: ws, date: d.date, recType: d.rec }); if (f && d.proj) f.projectId.value = d.proj; if (f && d.cat) f.category.value = d.cat; break; }
    case 'openws': go('#/ws/' + d.id); break;
    case 'addws': wsForm(); break;
    case 'editws': wsForm(by('workspaces', d.id)); break;
    case 'delws': await deleteWorkspace(by('workspaces', d.id)); break;
    case 'addgoal': goalForm(null, d.ws); break;
    case 'editgoal': goalForm(by('goals', d.id)); break;
    case 'delgoal': { const g = by('goals', d.id), ps = S.projects.filter(p => p.goalId === g.id); if (await confirmModal({ title: 'حذف هدف', danger: true, okText: 'حذف', msg: `هدف «${esc(g.title)}» حذف شود؟${ps.length ? `<div class="note">${fa(ps.length)} پروژه این هدف حذف نمی‌شوند و به «بدون هدف» منتقل می‌شوند.</div>` : ''}` })) await commit([{ store: 'goals', del: g.id }, ...ps.map(p => ({ store: 'projects', put: { ...p, goalId: null } }))]); break; }
    case 'addproj': projectForm(null, { wsId: d.ws, goalId: d.goal }); break;
    case 'editproj': projectForm(by('projects', d.id)); break;
    case 'delproj': { const p = by('projects', d.id), ts = S.tasks.filter(t => t.projectId === p.id); if (await confirmModal({ title: 'حذف پروژه', danger: true, okText: 'حذف', msg: `پروژه «${esc(p.title)}» حذف شود؟${ts.length ? `<div class="note">${fa(ts.length)} کار این پروژه حذف نمی‌شوند؛ فقط از پروژه جدا می‌شوند.</div>` : ''}` })) await commit([{ store: 'projects', del: p.id }, ...ts.map(t => ({ store: 'tasks', put: { ...t, projectId: null } }))]); break; }
    case 'calday': ui.calDate = d.d; render(); break;
    case 'caltoday': ui.calDate = TODAY; render(); break;
    case 'calnav': { const n = +d.n, cur = ui.calDate || TODAY; if (ui.calMode === 'day') ui.calDate = J.addDays(cur, n); else if (ui.calMode === 'week') ui.calDate = J.addDays(cur, 7 * n); else { const j = J.isoToJ(cur); let m = j.jm + n, y = j.jy; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } ui.calDate = J.jToIso(y, m, Math.min(j.jd, J.monthLength(y, m))); } render(); break; }
    case 'export': await exportBackup(); break;
    case 'revert': await revertSnapshot(); break;
    case 'notif': if ('Notification' in window) { const p = await Notification.requestPermission(); toast(p === 'granted' ? 'اعلان فعال شد (فقط وقتی برنامه باز است)' : 'اجازه اعلان داده نشد'); render(); } break;
    case 'mini': commit([{ store: 'meta', put: { ...settings, sidebarMini: !settings.sidebarMini } }]); break;
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && stack.length) closeModal(); if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role=link][data-act]')) { e.preventDefault(); e.target.click(); } });
let qT; document.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.ui === 'q') { ui.q = e.target.value; clearTimeout(qT); qT = setTimeout(render, 150); } });
document.addEventListener('change', async e => {
  const u = e.target.dataset && e.target.dataset.ui; if (u && u !== 'q') { ui[u] = e.target.value; render(); }
  if (e.target.matches('[data-privacy]')) commit([{ store: 'meta', put: { ...settings, privacy: e.target.checked } }]);
  if (e.target.matches('[data-import]')) { const f = e.target.files[0]; e.target.value = ''; if (f) await importBackup(f); }
});
document.addEventListener('submit', e => { if (e.target.dataset.form === 'name') { e.preventDefault(); commit([{ store: 'meta', put: { ...settings, userName: e.target.n.value.trim() } }]).then(() => toast('ذخیره شد')); } });

/* ---------------- backup / restore ---------------- */
function snapshotData() { const o = {}; for (const s of DB.STORES) o[s] = S[s]; return JSON.parse(JSON.stringify(o)); }
async function exportBackup() {
  const at = nowTs(), payload = { app: 'my-manager', schemaVersion: DB.SCHEMA_VERSION, exportedAt: at, data: snapshotData() };
  const json = JSON.stringify(payload, null, 1), j = J.isoToJ(TODAY), name = `my-manager-backup-${j.jy}-${J.pad(j.jm)}-${J.pad(j.jd)}.json`;
  const blob = new Blob([json], { type: 'application/json' }), isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let shared = false;
  if (isIOS && navigator.canShare) { try { const file = new File([blob], name, { type: 'application/json' }); if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'پشتیبان مدیریت من' }); shared = true; } } catch (x) { if (x.name === 'AbortError') { toast('پشتیبان‌گیری لغو شد'); return; } } }
  if (!shared) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
  await DB.batch([{ store: 'meta', put: { key: 'lastBackup', at } }]); meta.lastBackup = at; render(); toast('✓ فایل پشتیبان آماده شد: ' + name);
}
/* Pure validation — never writes. Rejects corrupt data, newer schema, duplicate ids and broken references. */
function validateBackup(obj) {
  const E = m => ({ ok: false, error: m });
  if (!obj || typeof obj !== 'object' || obj.app !== 'my-manager') return E('این فایل، پشتیبان «مدیریت من» نیست.');
  if (!Number.isInteger(obj.schemaVersion) || obj.schemaVersion < 1) return E('نسخه ساختار داده در فایل نامعتبر است.');
  if (obj.schemaVersion > DB.SCHEMA_VERSION) return E('این فایل با نسخه جدیدتر برنامه ساخته شده؛ ابتدا برنامه را به‌روزرسانی کنید.');
  if (!obj.data || typeof obj.data !== 'object') return E('بخش داده در فایل وجود ندارد.');
  let data = {}; for (const s of DB.STORES) { if (!Array.isArray(obj.data[s])) return E(`بخش «${s}» در فایل وجود ندارد یا خراب است.`); data[s] = obj.data[s]; }
  data = DB.migrate(JSON.parse(JSON.stringify(data)), obj.schemaVersion);
  const ids = {}; for (const s of DB.STORES) { ids[s] = new Set(); for (const r of data[s]) { if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !r.id) return E(`رکورد بدون شناسه در «${s}»`); if (ids[s].has(r.id)) return E(`شناسه تکراری در «${s}»: ${r.id}`); ids[s].add(r.id); } }
  const str = v => typeof v === 'string' && v.trim();
  for (const w of data.workspaces) if (!str(w.name)) return E('فضای کاری بدون نام');
  for (const g of data.goals) if (!str(g.title) || !ids.workspaces.has(g.workspaceId)) return E('هدف نامعتبر یا بدون فضای کاری: ' + g.id);
  for (const p of data.projects) if (!str(p.title) || !ids.workspaces.has(p.workspaceId) || (p.goalId && !ids.goals.has(p.goalId))) return E('پروژه با ارجاع نامعتبر: ' + p.id);
  for (const t of data.tasks) if (!str(t.title) || !ids.workspaces.has(t.workspaceId) || (t.projectId && !ids.projects.has(t.projectId)) || !['todo', 'doing', 'done'].includes(t.status)) return E('کار با اطلاعات/ارجاع نامعتبر: ' + t.id);
  for (const r of data.recurring_tasks) if (!str(r.title) || !ids.workspaces.has(r.workspaceId) || !r.rule || R.validate(r.rule)) return E('کار تکراری نامعتبر: ' + r.id);
  for (const o of data.task_occurrences) if (!ids.recurring_tasks.has(o.recurringId) || !/^\d{4}-\d{2}-\d{2}$/.test(o.date || '')) return E('نوبت کار تکراری با ارجاع نامعتبر: ' + o.id);
  for (const h of data.task_completion_history) if (!str(h.at)) return E('سابقه انجام نامعتبر');
  return { ok: true, data };
}
async function importBackup(file) {
  let obj; try { obj = JSON.parse(await file.text()); } catch (x) { await confirmModal({ title: 'بازیابی انجام نشد', msg: '<div class="warn">فایل خراب است یا JSON معتبر نیست.</div><p>اطلاعات فعلی شما دست‌نخورده باقی ماند.</p>', okText: 'متوجه شدم' }); return; }
  const v = validateBackup(obj); if (!v.ok) { await confirmModal({ title: 'بازیابی انجام نشد', msg: `<div class="warn">${esc(v.error)}</div><p>اطلاعات فعلی شما دست‌نخورده باقی ماند.</p>`, okText: 'متوجه شدم' }); return; }
  const c = v.data; if (!await confirmModal({ title: 'بازیابی از فایل', okText: 'بازیابی', msg: `فایل معتبر است: ${fa(c.workspaces.length)} فضای کاری، ${fa(c.tasks.length)} کار، ${fa(c.recurring_tasks.length)} کار تکراری، ${fa(c.goals.length)} هدف.<div class="warn">اطلاعات فعلی با محتوای فایل جایگزین می‌شود. یک کپی خودکار از اطلاعات فعلی گرفته می‌شود تا در صورت نیاز برگردید.</div>` })) return;
  try {
    const at = nowTs(); await DB.batch([{ store: 'snapshots', put: { id: 'pre-restore', at, data: snapshotData() } }]);
    await DB.replaceAll(c); await DB.batch([{ store: 'meta', put: { key: 'lastChange', at } }]); await reloadState(); render(); toast('✓ اطلاعات بازیابی شد');
  } catch (x) { console.error(x); await reloadState(); render(); toast('⚠️ بازیابی ناموفق بود؛ اطلاعات قبلی حفظ شد.'); }
}
async function revertSnapshot() {
  const sn = await DB.get('snapshots', 'pre-restore'); if (!sn) return;
  if (!await confirmModal({ title: 'بازگشت به قبل از بازیابی', okText: 'بازگشت', msg: 'اطلاعات فعلی با کپی خودکارِ قبل از آخرین بازیابی جایگزین شود؟' })) return;
  await DB.replaceAll(sn.data); await DB.batch([{ store: 'snapshots', del: 'pre-restore' }]); await reloadState(); render(); toast('✓ به اطلاعات قبل از بازیابی برگشتید');
}

/* ---------------- reminders (only while app is open) ---------------- */
const fired = new Set();
function checkReminders() {
  if (!booted) return;
  const now = new Date(), hm = nowHM(), b = new Date(now - 30 * 60000), lim = J.pad(b.getHours()) + ':' + J.pad(b.getMinutes());
  for (const it of itemsOn(TODAY)) {
    if (it.status === 'done' || !it.reminder || it.reminder > hm || (lim < hm && it.reminder < lim)) continue;
    const k = it.key + TODAY; if (fired.has(k)) continue; fired.add(k);
    toast('⏰ یادآوری: ' + esc(it.title));
    if ('Notification' in window && Notification.permission === 'granted') { try { new Notification('مدیریت من', { body: it.title, icon: 'icons/icon-192.png', lang: 'fa', dir: 'rtl' }); } catch (x) { /* some mobile browsers only allow SW notifications */ } }
  }
}
function tick() { if (J.todayIso() !== TODAY && !stack.length) render(); checkReminders(); }

/* ---------------- service worker + "new version" bar (no automatic skipWaiting) ---------------- */
let waitingSW = null;
function showUpdateBar() { if ($('.upd')) return; const b = document.createElement('div'); b.className = 'toast upd'; b.style.cssText = 'top:auto;bottom:calc(var(--tabH) + 20px)'; b.innerHTML = 'نسخه جدید آماده است (اطلاعات شما حفظ می‌شود). <button class="btn sm" style="margin-inline-start:8px">به‌روزرسانی</button>'; b.querySelector('button').onclick = () => waitingSW && waitingSW.postMessage('skipWaiting'); document.body.appendChild(b); }
function registerSW() {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    const watch = w => w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) { waitingSW = w; showUpdateBar(); } });
    if (reg.waiting && navigator.serviceWorker.controller) { waitingSW = reg.waiting; showUpdateBar(); }
    reg.addEventListener('updatefound', () => watch(reg.installing));
  }).catch(x => console.warn('SW', x));
  let reloaded = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (waitingSW && !reloaded) { reloaded = true; location.reload(); } });
}

/* ---------------- seed & boot ---------------- */
function seedOps() {
  const at = nowTs(), W = (id, name, description, icon, color, kind, order) => ({ id, userId: OWNER, name, description, icon, color, logo: null, kind, categories: CATS[kind] || [], order, memberIds: [OWNER], createdAt: at, updatedAt: at });
  const ws = [W('w_irandood', 'ایران دود — فروشگاه اینترنتی', 'فروشگاه اینترنتی', 'shop', '#243F68', 'business', 0), W('w_personal', 'امور شخصی', 'برنامه‌ها و کارهای شخصی', 'user', '#4A7BD0', 'personal', 1), W('w_family', 'خانواده', 'برنامه‌ها و مناسبت‌های خانوادگی', 'family', '#E66A70', 'family', 2), W('w_sarafi', 'صرافی', '', 'money', '#329C7A', 'business', 3), W('w_janebi', 'جانبی بازار', '', 'cart', '#F2A65A', 'business', 4), W('w_chapar', 'چاپار کارگو', 'حمل و ارسال بار', 'truck', '#8E6AC8', 'business', 5)];
  const ops = ws.map(w => ({ store: 'workspaces', put: w }));
  ops.push({ store: 'recurring_tasks', put: { id: 'r_story', userId: OWNER, workspaceId: 'w_irandood', projectId: null, title: 'تولید استوری اینستاگرام ایران دود', description: 'نمونه کار تکراری — قابل ویرایش یا حذف', category: null, priority: 'high', reminderTime: null, subtasks: [], assigneeId: null, rule: { type: 'weekdays5', days: [0, 1, 2, 3, 4], interval: 1, startDate: TODAY, endDate: null }, createdAt: at, updatedAt: at } });
  ops.push({ store: 'goals', put: { id: 'g_sales', userId: OWNER, workspaceId: 'w_irandood', title: 'افزایش فروش آنلاین این ماه', description: 'نمونه هدف', period: 'monthly', targetDate: null, progressMethod: 'avg', manualProgress: 0, createdAt: at, updatedAt: at } });
  ops.push({ store: 'projects', put: { id: 'p_campaign', userId: OWNER, workspaceId: 'w_irandood', goalId: 'g_sales', title: 'کمپین تبلیغاتی پاییز', description: '', createdAt: at, updatedAt: at } });
  const T = (id, w, title, due, pri, proj, cat) => ({ id, userId: OWNER, workspaceId: w, projectId: proj || null, title, description: '', category: cat || null, startDate: null, dueDate: due, reminderTime: null, priority: pri, status: 'todo', subtasks: [], completedAt: null, assigneeId: null, createdAt: at, updatedAt: at });
  ops.push({ store: 'tasks', put: T('t_s1', 'w_irandood', 'طراحی بنر کمپین', J.addDays(TODAY, 1), 'urgent', 'p_campaign') }, { store: 'tasks', put: T('t_s2', 'w_irandood', 'هماهنگی با تأمین‌کننده', TODAY, 'medium', 'p_campaign') }, { store: 'tasks', put: T('t_s3', 'w_family', 'خرید هفتگی خانه', J.addDays(TODAY, 2), 'medium', null, 'خرید خانه') });
  ops.push({ store: 'meta', put: { key: 'seeded', at } }, { store: 'meta', put: { key: 'schema', version: DB.SCHEMA_VERSION } }, { store: 'meta', put: { key: 'users', list: [{ id: OWNER, name: settings.userName, role: 'owner', workspaceIds: '*' }] } });
  return ops;
}
async function boot() {
  window.onDbBlocked = () => { $('#app').innerHTML = '<div class="card" style="margin:30vh 20px">برنامه در زبانه یا پنجره دیگری باز است. لطفاً سایر زبانه‌های «مدیریت من» را ببندید؛ برنامه خودکار ادامه می‌دهد.</div>'; };
  if (!('indexedDB' in window)) { $('#app').innerHTML = '<div class="warn" style="margin:20px">این مرورگر از IndexedDB پشتیبانی نمی‌کند؛ اطلاعات ذخیره نمی‌شود.</div>'; return; }
  try { await DB.open(); } catch (e) { $('#app').innerHTML = `<div class="warn" style="margin:20px">باز کردن پایگاه داده محلی ممکن نشد: ${esc(e && e.message)}<br>اگر در حالت مرور خصوصی هستید، از حالت عادی استفاده کنید.</div>`; return; }
  if (navigator.storage && navigator.storage.persist) { try { meta.persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist()); } catch (x) { meta.persisted = null; } }
  const st = await DB.get('meta', 'settings'); if (st) settings = Object.assign(settings, st);
  const sch = await DB.get('meta', 'schema');
  if (!(await DB.get('meta', 'seeded'))) await DB.batch(seedOps());
  else if (sch && sch.version < DB.SCHEMA_VERSION) { const d = DB.migrate(await DB.loadAll(), sch.version); await DB.replaceAll(d); await DB.batch([{ store: 'meta', put: { key: 'schema', version: DB.SCHEMA_VERSION } }]); }
  await reloadState(); booted = true; render(); registerSW();
  setInterval(tick, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (!stack.length) render(); checkReminders(); } });
  const mq = matchMedia('(prefers-color-scheme: dark)'); mq.addEventListener && mq.addEventListener('change', applyTheme);
  setTimeout(checkReminders, 1500);
  window.__mm = { S, validateBackup, itemsInRange, get settings() { return settings; } }; // exposed for automated tests only
}
boot();
})();
