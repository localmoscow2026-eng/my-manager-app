/* Photo tags («عکس کار»): built-in photos made for Amin's actual businesses + client-side image compression for own photos.
   A task/recurring task stores ONE tag id in `photo`: a built-in id (e.g. 'p-moto') or a 'media' record id (user photo, synced). */
(function (root) {
  const T = (id, label, ws) => ({ id, label, ws, src: 'img/tags/' + id + '.webp' });
  const LIST = [
    /* صرافی */
    T('ex-havale', 'حواله ارزی', 'w_sarafi'), T('ex-cash', 'خرید و فروش ارز', 'w_sarafi'), T('ex-usdt', 'تتر و کیف پول', 'w_sarafi'), T('ex-settle', 'تسویه با مشتری', 'w_sarafi'),
    T('ex-bank', 'رسید و واریز', 'w_sarafi'), T('ex-rates', 'نرخ ارز', 'w_sarafi'), T('ex-docs', 'حسابداری و اسناد', 'w_sarafi'),
    /* ایران دود */
    T('dood-products', 'محصولات', 'w_irandood'), T('dood-pack', 'بسته‌بندی سفارش', 'w_irandood'), T('dood-ship', 'ارسال سفارش', 'w_irandood'), T('dood-site', 'سایت فروشگاه', 'w_irandood'),
    T('dood-stock', 'موجودی انبار', 'w_irandood'), T('dood-insta', 'تبلیغات اینستاگرام', 'w_irandood'),
    /* جانبی بازار */
    T('acc-products', 'لوازم جانبی', 'w_janebi'), T('acc-order', 'سفارش‌ها', 'w_janebi'), T('acc-supplier', 'تأمین‌کننده', 'w_janebi'), T('acc-photo', 'عکاسی محصول', 'w_janebi'), T('acc-sell', 'فروش آنلاین', 'w_janebi'),
    /* چاپار کارگو */
    T('cg-boxes', 'بار و کارتن', 'w_chapar'), T('cg-truck', 'کامیون و ترانزیت', 'w_chapar'), T('cg-customs', 'گمرک', 'w_chapar'), T('cg-air', 'بار هوایی', 'w_chapar'), T('cg-deliver', 'تحویل به مشتری', 'w_chapar'),
    /* امور شخصی */
    T('p-moto', 'موتور', 'w_personal'), T('p-car', 'ماشین', 'w_personal'), T('p-home', 'خانه', 'w_personal'), T('p-bank', 'بانک و قبض', 'w_personal'), T('p-health', 'سلامت و دکتر', 'w_personal'), T('p-travel', 'سفر', 'w_personal'),
    /* خانواده */
    T('f-grocery', 'خرید خانه', 'w_family'), T('f-school', 'مدرسه بچه‌ها', 'w_family'), T('f-birthday', 'تولد و مهمانی', 'w_family'), T('f-doctor', 'دکتر خانواده', 'w_family')
  ];
  const BY = Object.fromEntries(LIST.map(t => [t.id, t]));

  const bytesOf = d => Math.round((d.length - d.indexOf(',') - 1) * 3 / 4);
  let webpOK = null;
  function canWebp() { if (webpOK === null) { try { const c = document.createElement('canvas'); c.width = c.height = 2; webpOK = c.toDataURL('image/webp', 0.8).startsWith('data:image/webp'); } catch (x) { webpOK = false; } } return webpOK; }
  function loadImg(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('این فایل عکس قابل خواندن نیست')); };
      img.src = url;
    });
  }
  /* Resize to ≤ max px on the long side and re-encode (WebP when the browser can encode it — iOS Safari cannot, so JPEG there)
     until it is ≤ target bytes. Returns { dataUrl, width, height, bytes, type }. */
  async function compress(file, { max = 600, target = 80 * 1024 } = {}) {
    if (!file || !/^image\//.test(file.type || 'image/')) throw new Error('لطفاً یک فایل عکس انتخاب کنید');
    const img = await loadImg(file), W = img.naturalWidth, H = img.naturalHeight;
    if (!W || !H) throw new Error('این فایل عکس قابل خواندن نیست');
    const type = canWebp() ? 'image/webp' : 'image/jpeg', c = document.createElement('canvas'), g = c.getContext('2d');
    let best = null;
    for (let dim = max; dim >= 200; dim = Math.round(dim * 0.8)) {
      const s = Math.min(1, dim / Math.max(W, H)); c.width = Math.max(1, Math.round(W * s)); c.height = Math.max(1, Math.round(H * s));
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);
      for (const q of [0.82, 0.72, 0.62, 0.52, 0.42]) {
        const d = c.toDataURL(type, q), b = bytesOf(d);
        best = { dataUrl: d, width: c.width, height: c.height, bytes: b, type: d.slice(5, d.indexOf(';')) };
        if (b <= target) return best;
      }
    }
    return best;
  }
  root.TAGS = { LIST, BY, compress, bytesOf };
})(this);
