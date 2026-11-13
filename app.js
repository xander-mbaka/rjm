(() => {
  const C = window.RJM;
  // prices saved from the Farm Manager (prices.js) replace the ones in config.js
  const P = window.RJM_PRICES || {};
  [...C.products, C.basket, C.gift].forEach((p) => {
    if (p && Number(P[p.id]) > 0) p.price = Number(P[p.id]);
  });
  const PUPS = (window.RJM_PUPPIES || []).filter((p) => p && p.id && p.status !== 'sold');
  const pupItem = (p) => ({ id: `pup-${p.id}`, name: `Puppy — ${p.name}${p.breed ? ` (${p.breed})` : ''}`, unit: 'puppy', price: Number(p.price) || 0, icon: '🐶', pup: p });
  const all = [...C.products, C.basket, C.gift, ...PUPS.filter((p) => p.status === 'available').map(pupItem)];
  const byId = Object.fromEntries(all.map((p) => [p.id, p]));
  const kes = (n) => `KES ${n.toLocaleString('en-KE')}`;
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  let cart = {};
  try {
    cart = JSON.parse(localStorage.getItem('rjm-cart') || '{}');
  } catch {
    cart = {};
  }
  const save = () => {
    try {
      localStorage.setItem('rjm-cart', JSON.stringify(cart));
    } catch {
      /* private mode: cart just won't persist */
    }
  };

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function setQty(id, qty) {
    if (!byId[id]) return;
    if (byId[id].pup) qty = Math.min(qty, 1); // each puppy is one of a kind
    if (qty <= 0) delete cart[id];
    else cart[id] = qty;
    save();
    render();
  }

  const card = (p) => `
      <article class="product">
        <div class="icon" aria-hidden="true">${p.icon}</div>
        <h3>${esc(p.name)}</h3>
        <p class="unit">${kes(p.price)} <span>/ ${esc(p.unit)}</span></p>
        ${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}
        <div class="stepper" data-id="${p.id}">
          <button type="button" data-step="-1" aria-label="Remove one ${esc(p.unit)} of ${esc(p.name)}">−</button>
          <output aria-label="Quantity">${cart[p.id] || 0}</output>
          <button type="button" data-step="1" aria-label="Add one ${esc(p.unit)} of ${esc(p.name)}">+</button>
        </div>
      </article>`;

  function renderProducts() {
    const cats = C.categories || [{ id: undefined, name: '' }];
    $('#cat-nav').innerHTML = cats.map((c) => `<a href="#cat-${c.id}">${esc(c.name)}</a>`).join('');
    $('#products').innerHTML = cats
      .map((c) => {
        const items = C.products.filter((p) => !c.id || p.cat === c.id);
        if (!items.length) return '';
        return `<div class="cat" id="cat-${c.id}">
          <h3 class="cat-title">${esc(c.name)}</h3>
          ${c.sub ? `<p class="sub">${esc(c.sub)}</p>` : ''}
          <div class="grid">${items.map(card).join('')}</div>
        </div>`;
      })
      .join('');
  }

  function cartLines() {
    return Object.entries(cart)
      .filter(([id]) => byId[id])
      .map(([id, qty]) => ({ p: byId[id], qty, total: byId[id].price * qty }));
  }

  function renderCart() {
    const lines = cartLines();
    const total = lines.reduce((n, l) => n + l.total, 0);
    $('#cart').innerHTML = lines.length
      ? `<ul>${lines
          .map(
            (l) => `<li><span>${l.p.icon} ${esc(l.p.name)} <small>× ${l.qty} ${esc(l.p.unit)}</small></span>
              <span class="stepper small" data-id="${l.p.id}"><button type="button" data-step="-1" aria-label="Remove one">−</button><button type="button" data-step="1" aria-label="Add one">+</button></span>
              <b>${kes(l.total)}</b></li>`,
          )
          .join('')}</ul><p class="total">Total <b>${kes(total)}</b></p>`
      : `<p class="empty">Your order is empty. Add milk, eggs or vegetables from <a href="#produce">our produce</a>.</p>`;
    const count = lines.reduce((n, l) => n + l.qty, 0);
    $('.nav a.btn').textContent = count ? `Order (${count})` : 'Order';
  }

  const ageText = (born) => {
    const d = Date.parse(`${born}T00:00:00Z`);
    if (!born || Number.isNaN(d)) return '';
    const weeks = Math.floor((Date.now() - d) / (7 * 86400000));
    return weeks < 16 ? `${weeks} weeks old` : `${Math.floor(weeks / 4.35)} months old`;
  };
  const photosOf = (p) => (Array.isArray(p.photos) && p.photos.length ? p.photos : ['puppies/no-photo.svg']);
  const img = (src, alt, cls) => `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" onerror="this.onerror=null;this.src='puppies/no-photo.svg'">`;

  function renderPuppies() {
    const box = $('#puppy-list');
    if (!box) return;
    $('#puppies').hidden = false;
    if (!PUPS.length) {
      box.innerHTML = `<p class="empty">No puppies available right now. <a href="${wa('Hello RJM Mixed Farm, please add me to the waiting list for the next litter of puppies.')}" target="_blank" rel="noopener">Join the waiting list on WhatsApp</a>.</p>`;
      return;
    }
    box.innerHTML = PUPS.map((p) => {
      const photos = photosOf(p);
      const id = `pup-${p.id}`;
      const inCart = cart[id] > 0;
      const reserved = p.status !== 'available';
      return `<article class="puppy">
        <button type="button" class="pup-photo" data-gallery="${esc(p.id)}" data-index="0" aria-label="View photos of ${esc(p.name)}">
          ${img(photos[0], `${p.name} — photo 1`, 'pup-main')}
          ${photos.length > 1 ? `<span class="pup-count">📷 ${photos.length}</span>` : ''}
          ${reserved ? '<span class="pup-badge">Reserved</span>' : ''}
        </button>
        ${photos.length > 1 ? `<div class="pup-thumbs">${photos.map((ph, i) => `<button type="button" data-gallery="${esc(p.id)}" data-index="${i}" aria-label="Photo ${i + 1}">${img(ph, '', 'pup-thumb')}</button>`).join('')}</div>` : ''}
        <h3>${esc(p.name)}</h3>
        <p class="unit">${kes(Number(p.price) || 0)}</p>
        <p class="note">${[p.breed, p.sex, ageText(p.born)].filter(Boolean).map(esc).join(' · ')}</p>
        ${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}
        <div class="pup-actions">
          ${reserved ? '<button type="button" class="btn small" disabled>Reserved</button>' : `<button type="button" class="btn small" data-pup="${esc(id)}">${inCart ? '✓ In your order' : 'Add to order'}</button>`}
          <a class="btn small ghost" target="_blank" rel="noopener" href="${wa(`Hello RJM Mixed Farm, I'm interested in the puppy ${p.name}${p.breed ? ` (${p.breed})` : ''}, ${kes(Number(p.price) || 0)}. Is it still available?`)}">Ask on WhatsApp</a>
        </div>
      </article>`;
    }).join('');
  }

  // simple photo viewer
  let gallery = null;
  function showPhoto() {
    const p = PUPS.find((x) => x.id === gallery.id);
    const photos = photosOf(p);
    gallery.i = (gallery.i + photos.length) % photos.length;
    $('#lightbox').innerHTML = `<div class="lb-inner" role="dialog" aria-modal="true" aria-label="Photos of ${esc(p.name)}">
      ${img(photos[gallery.i], `${p.name} — photo ${gallery.i + 1}`, 'lb-img')}
      <p>${esc(p.name)} · ${gallery.i + 1} / ${photos.length}</p>
      ${photos.length > 1 ? '<button type="button" class="lb-nav lb-prev" data-lb="-1" aria-label="Previous photo">‹</button><button type="button" class="lb-nav lb-next" data-lb="1" aria-label="Next photo">›</button>' : ''}
      <button type="button" class="lb-close" data-lb="close" aria-label="Close">×</button>
    </div>`;
    $('#lightbox').hidden = false;
  }
  document.addEventListener('keydown', (e) => {
    if (!gallery) return;
    if (e.key === 'Escape') ($('#lightbox').hidden = true), (gallery = null);
    if (e.key === 'ArrowRight') (gallery.i += 1), showPhoto();
    if (e.key === 'ArrowLeft') (gallery.i -= 1), showPhoto();
  });

  function render() {
    renderPuppies();
    renderProducts();
    renderCart();
  }

  document.addEventListener('click', (e) => {
    const step = e.target.closest('[data-step]');
    if (step) {
      const id = step.closest('[data-id]').dataset.id;
      setQty(id, (cart[id] || 0) + Number(step.dataset.step));
      return;
    }
    const g = e.target.closest('[data-gallery]');
    if (g) {
      gallery = { id: g.dataset.gallery, i: Number(g.dataset.index) || 0 };
      showPhoto();
      return;
    }
    const lb = e.target.closest('[data-lb]');
    if (lb || e.target.id === 'lightbox') {
      if (!lb || lb.dataset.lb === 'close') {
        $('#lightbox').hidden = true;
        gallery = null;
      } else {
        gallery.i += Number(lb.dataset.lb);
        showPhoto();
      }
      return;
    }
    const pup = e.target.closest('[data-pup]');
    if (pup) {
      const id = pup.dataset.pup;
      setQty(id, cart[id] ? 0 : 1);
      toast(cart[id] ? `${byId[id].name} added to your order` : 'Puppy removed from your order');
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add) {
      const id = add.dataset.add;
      setQty(id, (cart[id] || 0) + 1);
      toast(`${byId[id].name} added to your order`);
    }
  });

  const wa = (text) => `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(text)}`;

  $('#order-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const lines = cartLines();
    if (!lines.length) {
      toast('Add something to your order first');
      location.hash = '#produce';
      return;
    }
    const f = new FormData(e.target);
    const total = lines.reduce((n, l) => n + l.total, 0);
    const msg = [
      'Hello RJM Mixed Farm, I would like to order:',
      ...lines.map((l) => `• ${l.qty} × ${l.p.name} (${l.p.unit}) — ${kes(l.total)}`),
      `Total: ${kes(total)}`,
      `Payment: M-Pesa Paybill ${C.mpesaPaybill}, Account ${C.mpesaAccount}`,
      '',
      `Name: ${f.get('name')}`,
      `Phone: ${f.get('phone')}`,
      `Area: ${f.get('area')}`,
      f.get('landmark') ? `Landmark: ${f.get('landmark')}` : '',
      f.get('notes') ? `Notes: ${f.get('notes')}` : '',
    ]
      .filter((x) => x !== '')
      .join('\n');
    window.open(wa(msg), '_blank', 'noopener');
    cart = {};
    save();
    render();
    e.target.reset();
    toast('Opening WhatsApp… Asante!');
  });

  $('#inst-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const msg = [
      'Hello RJM Mixed Farm — supply enquiry',
      `Institution: ${f.get('org')}`,
      `Contact: ${f.get('contact')}`,
      `Phone: ${f.get('phone')}`,
      `Weekly needs: ${f.get('needs')}`,
    ].join('\n');
    window.open(wa(msg), '_blank', 'noopener');
    e.target.reset();
    toast('Opening WhatsApp… we will reply within one working day.');
  });

  // Guard against launching with the placeholder numbers in config.js
  const missing = [];
  if (/^2547?0+$/.test(C.whatsapp)) missing.push('WhatsApp number');
  if (!C.mpesaPaybill || !C.mpesaAccount) missing.push('M-Pesa Paybill and account number');
  if (missing.length) {
    const b = document.createElement('div');
    b.className = 'setup-banner';
    b.innerHTML = `Setup not finished: put the real ${missing.join(' and ')} in <code>config.js</code> before launch.`;
    document.body.prepend(b);
  }

  document.querySelectorAll('.paybill').forEach((el) => (el.textContent = C.mpesaPaybill || 'shared on WhatsApp'));
  document.querySelectorAll('.account').forEach((el) => (el.textContent = C.mpesaAccount || '—'));
  document.querySelectorAll('.postal').forEach((el) => (el.textContent = C.postalAddress || ''));
  document.querySelectorAll('.kra-pin').forEach((el) => (el.textContent = C.kraPin ? `KRA PIN ${C.kraPin}` : ''));
  const phone = $('.phone-link');
  phone.textContent = C.phoneDisplay;
  phone.href = `https://wa.me/${C.whatsapp}`;
  $('#basket-price').textContent = kes(C.basket.price);
  $('#year').textContent = new Date().getFullYear();
  render();
})();
