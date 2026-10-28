/* Jalali (Shamsi) <-> Gregorian conversion — offline, no dependencies.
   Algorithm: Borkowski / jalaali-js (MIT). Dates are handled as ISO strings "YYYY-MM-DD"
   (Gregorian, timezone-free) and day numbers, so no timezone drift. */
(function (root) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const div = (a, b) => ~~(a / b), mod = (a, b) => a - ~~(a / b) * b;
  function jalCal(jy) {
    let gy = jy + 621, leapJ = -14, jp = breaks[0], jm, jump, n, i;
    for (i = 1; i < breaks.length; i++) { jm = breaks[i]; jump = jm - jp; if (jy < jm) break; leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4); jp = jm; }
    n = jy - jp;
    leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    const march = 20 + leapJ - leapG;
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    let leap = mod(mod(n + 1, 33) - 1, 4); if (leap === -1) leap = 4;
    return { leap, gy, march };
  }
  function g2d(gy, gm, gd) {
    let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  }
  function d2g(jdn) {
    let j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    const i = div(mod(j, 1461), 4) * 5 + 308;
    const gd = div(mod(i, 153), 5) + 1, gm = mod(div(i, 153), 12) + 1;
    return { gy: div(j, 1461) - 100100 + div(8 - gm, 6), gm, gd };
  }
  function j2d(jy, jm, jd) { const r = jalCal(jy); return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1; }
  function d2j(jdn) {
    const gy = d2g(jdn).gy; let jy = gy - 621; const r = jalCal(jy); let k = jdn - g2d(gy, 3, r.march), jm, jd;
    if (k >= 0) { if (k <= 185) { jm = 1 + div(k, 31); jd = mod(k, 31) + 1; return { jy, jm, jd }; } k -= 186; }
    else { jy -= 1; k += 179; if (r.leap === 1) k += 1; }
    jm = 7 + div(k, 30); jd = mod(k, 30) + 1; return { jy, jm, jd };
  }
  const pad = n => String(n).padStart(2, '0');
  const isLeap = jy => jalCal(jy).leap === 0;
  const monthLength = (jy, jm) => jm <= 6 ? 31 : jm <= 11 ? 30 : (isLeap(jy) ? 30 : 29);
  const toJalali = (gy, gm, gd) => d2j(g2d(gy, gm, gd));
  const toGregorian = (jy, jm, jd) => d2g(j2d(jy, jm, jd));
  const isoParts = iso => iso.split('-').map(Number);
  const isoToJ = iso => { const [y, m, d] = isoParts(iso); return toJalali(y, m, d); };
  const jToIso = (jy, jm, jd) => { const g = toGregorian(jy, jm, jd); return `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`; };
  const isoToDn = iso => { const [y, m, d] = isoParts(iso); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
  const dnToIso = dn => new Date(dn * 864e5).toISOString().slice(0, 10);
  const addDays = (iso, n) => dnToIso(isoToDn(iso) + n);
  /* Persian weekday index: 0=Saturday ... 6=Friday */
  const pWeekday = iso => (new Date(isoToDn(iso) * 864e5).getUTCDay() + 1) % 7;
  const todayIso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  const fa = s => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const toEn = s => String(s).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const fmt = (iso, long) => { if (!iso) return ''; const j = isoToJ(iso); return long ? fa(`${WEEKDAYS[pWeekday(iso)]} ${j.jd} ${MONTHS[j.jm - 1]} ${j.jy}`) : fa(`${j.jy}/${pad(j.jm)}/${pad(j.jd)}`); };
  const J = { toJalali, toGregorian, isLeap, monthLength, isoToJ, jToIso, isoToDn, dnToIso, addDays, pWeekday, todayIso, MONTHS, WEEKDAYS, fa, toEn, fmt, pad };
  if (typeof module !== 'undefined') module.exports = J; else root.J = J;
})(this);
