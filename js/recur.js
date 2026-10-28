/* Recurrence engine. rule = {type, days:[persian weekday 0..6], interval, startDate, endDate}
   types: daily | weekdays5 | custom | weekly | monthly | yearly | everyN */
(function (root) {
  const J = root.J || require('./jalali.js');
  const TYPES = { daily: 'هر روز', weekdays5: 'پنج روز در هفته', custom: 'روزهای دلخواه هفته', weekly: 'هر هفته', monthly: 'هر ماه (شمسی)', yearly: 'هر سال (شمسی)', everyN: 'هر چند روز یک‌بار' };
  function occursOn(rule, iso) {
    if (!rule || !rule.startDate || iso < rule.startDate) return false;
    if (rule.endDate && iso > rule.endDate) return false;
    switch (rule.type) {
      case 'daily': return true;
      case 'weekdays5': case 'custom': return (rule.days || []).includes(J.pWeekday(iso));
      case 'weekly': return J.pWeekday(iso) === J.pWeekday(rule.startDate);
      case 'everyN': { const n = Math.max(1, +rule.interval || 1); return (J.isoToDn(iso) - J.isoToDn(rule.startDate)) % n === 0; }
      case 'monthly': { const s = J.isoToJ(rule.startDate), d = J.isoToJ(iso); return d.jd === Math.min(s.jd, J.monthLength(d.jy, d.jm)); }
      case 'yearly': { const s = J.isoToJ(rule.startDate), d = J.isoToJ(iso); return d.jm === s.jm && d.jd === Math.min(s.jd, J.monthLength(d.jy, d.jm)); }
      default: return false;
    }
  }
  function datesInRange(rule, from, to, cap = 400) {
    const out = []; let dn = J.isoToDn(from); const end = Math.min(J.isoToDn(to), dn + cap); /* default cap 400 days */
    for (; dn <= end; dn++) { const iso = J.dnToIso(dn); if (occursOn(rule, iso)) out.push(iso); }
    return out;
  }
  function validate(rule) {
    if (!rule.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(rule.startDate)) return 'تاریخ شروع تکرار معتبر نیست';
    if (!TYPES[rule.type]) return 'نوع تکرار معتبر نیست';
    if (rule.type === 'everyN' && !(Number.isInteger(+rule.interval) && +rule.interval >= 1 && +rule.interval <= 365)) return 'فاصله تکرار باید عددی بین ۱ تا ۳۶۵ باشد';
    if ((rule.type === 'custom' || rule.type === 'weekdays5') && !(rule.days || []).length) return 'حداقل یک روز هفته را انتخاب کنید';
    if (rule.endDate && rule.endDate < rule.startDate) return 'تاریخ پایان نباید قبل از شروع باشد';
    return null;
  }
  function describe(rule) {
    if (!rule) return 'بدون تکرار';
    let s = TYPES[rule.type] || '';
    if (rule.type === 'custom' || rule.type === 'weekdays5') s += ': ' + (rule.days || []).slice().sort().map(d => J.WEEKDAYS[d]).join('، ');
    if (rule.type === 'everyN') s = `هر ${J.fa(rule.interval || 1)} روز یک‌بار`;
    return s;
  }
  const R = { TYPES, occursOn, datesInRange, describe, validate };
  if (typeof module !== 'undefined') module.exports = R; else root.R = R;
})(this);
