// إعدادات عامة
const STATE = {
  products: [],
  filtered: [],
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
  category: 'الكل',
  query: '',
  sort: 'default'
};

const els = {
  products: document.getElementById('products'),
  categories: document.getElementById('categories'),
  search: document.getElementById('searchInput'),
  sort: document.getElementById('sortSelect'),
  cartBtn: document.getElementById('cartBtn'),
  cartDrawer: document.getElementById('cartDrawer'),
  closeCart: document.getElementById('closeCart'),
  cartItems: document.getElementById('cartItems'),
  cartCount: document.getElementById('cartCount'),
  cartTotal: document.getElementById('cartTotal'),
  overlay: document.getElementById('overlay'),
  checkoutBtn: document.getElementById('checkoutBtn'),
  checkoutDialog: document.getElementById('checkoutDialog'),
  cancelCheckout: document.getElementById('cancelCheckout'),
  checkoutForm: document.getElementById('checkoutForm'),
  name: document.getElementById('custName'),
  phone: document.getElementById('custPhone'),
  address: document.getElementById('custAddress'),
  note: document.getElementById('custNote'),
  storeName: document.getElementById('storeName'),
  storeNameFoot: document.getElementById('storeNameFoot'),
  year: document.getElementById('year'),
  currencyLabel: document.getElementById('currencyLabel')
};

// تحميل الإعدادات من config.js
function applyConfig() {
  if (window.APP_CONFIG) {
    const { storeName, currency, whatsappNumber } = window.APP_CONFIG;
    els.storeName.textContent = storeName;
    els.storeNameFoot.textContent = storeName;
    els.currencyLabel.textContent = currency;
    document.title = storeName + ' — AIO';
    STATE.whatsappNumber = whatsappNumber;
  }
  els.year.textContent = new Date().getFullYear();
}

// جلب المنتجات
async function loadProducts() {
  try {
    const res = await fetch('products.json?cache=' + Date.now());
    STATE.products = await res.json();
    buildCategories();
    filterAndRender();
  } catch (e) {
    console.error('خطأ في تحميل المنتجات:', e);
    els.products.innerHTML = '<p class="muted">تعذر تحميل المنتجات. تأكد من وجود ملف products.json</p>';
  }
}

function buildCategories() {
  const cats = Array.from(new Set(STATE.products.map(p => p.category))).filter(Boolean);
  const frag = document.createDocumentFragment();
  const allBtn = document.querySelector('.chip[data-cat="الكل"]');
  if (!allBtn) {
    const btn = document.createElement('button');
    btn.className = 'chip active'; btn.dataset.cat = 'الكل'; btn.textContent = 'الكل';
    frag.appendChild(btn);
  }
  cats.forEach(cat => {
    const b = document.createElement('button');
    b.className = 'chip'; b.dataset.cat = cat; b.textContent = cat;
    frag.appendChild(b);
  });
  els.categories.appendChild(frag);
}

function filterAndRender() {
  let arr = [...STATE.products];

  // بحث
  if (STATE.query.trim() !== '') {
    const q = STATE.query.toLowerCase();
    arr = arr.filter(p => (p.name + ' ' + p.description).toLowerCase().includes(q));
  }
  // تصنيف
  if (STATE.category !== 'الكل') {
    arr = arr.filter(p => p.category === STATE.category);
  }
  // ترتيب
  switch (STATE.sort) {
    case 'price_asc': arr.sort((a,b) => a.price - b.price); break;
    case 'price_desc': arr.sort((a,b) => b.price - a.price); break;
    case 'name_asc': arr.sort((a,b) => a.name.localeCompare(b.name)); break;
    case 'name_desc': arr.sort((a,b) => b.name.localeCompare(a.name)); break;
  }

  STATE.filtered = arr;
  renderProducts(arr);
}

function renderProducts(arr) {
  if (!arr.length) {
    els.products.innerHTML = '<p class="muted">لا توجد منتجات مطابقة.</p>';
    return;
  }
  const html = arr.map(p => `
    <article class="card">
      <img class="thumb" src="${p.image}" alt="${escapeHtml(p.name)}">
      <div class="body">
        <h3 style="margin:0">${escapeHtml(p.name)}</h3>
        <div class="muted small">${escapeHtml(p.category || '')}</div>
        <div class="price">${formatPrice(p.price)}</div>
        <p class="muted small">${escapeHtml(p.description)}</p>
        <div class="actions">
          <button class="btn" onclick="showProduct('${p.id}')">تفاصيل</button>
          <button class="btn primary" onclick="addToCart('${p.id}')">إضافة للسلة</button>
        </div>
      </div>
    </article>
  `).join('');
  els.products.innerHTML = html;
}

function escapeHtml(str='') {
  return str.replace(/[&<>"']/g, s => ({
    '&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#39;'
  }[s]));
}
function formatPrice(num) {
  const c = (window.APP_CONFIG?.currency) || 'EGP';
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: c }).format(num);
}

// عرض تفاصيل مبسطة عبر alert — لتبسيط الكود
function showProduct(id) {
  const p = STATE.products.find(x => x.id === id);
  if (!p) return;
  alert(p.name + "\n\n" + p.description + "\n\nالسعر: " + formatPrice(p.price));
}

// السلة
function saveCart() { localStorage.setItem('cart', JSON.stringify(STATE.cart)); }
function cartCount() { return STATE.cart.reduce((s, it) => s + it.qty, 0); }
function cartTotal() { return STATE.cart.reduce((s, it) => {
  const p = STATE.products.find(x => x.id === it.id);
  return s + (p ? p.price * it.qty : 0);
}, 0); }

function addToCart(id) {
  const item = STATE.cart.find(x => x.id === id);
  if (item) item.qty += 1; else STATE.cart.push({ id, qty: 1 });
  updateCartUI(); openCart();
  saveCart();
}

function removeFromCart(id) {
  STATE.cart = STATE.cart.filter(x => x.id !== id);
  updateCartUI(); saveCart();
}
function changeQty(id, delta) {
  const it = STATE.cart.find(x => x.id === id); if (!it) return;
  it.qty += delta; if (it.qty <= 0) return removeFromCart(id);
  updateCartUI(); saveCart();
}
function updateCartUI() {
  els.cartCount.textContent = cartCount();
  els.cartTotal.textContent = cartTotal().toFixed(2);
  if (!STATE.cart.length) {
    els.cartItems.innerHTML = '<p class="muted small">السلة فارغة.</p>';
    return;
  }
  els.cartItems.innerHTML = STATE.cart.map(it => {
    const p = STATE.products.find(x => x.id === it.id);
    if (!p) return '';
    return `
      <div class="cart-item">
        <img src="${p.image}" alt="${escapeHtml(p.name)}" />
        <div>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:.5rem;">
            <strong>${escapeHtml(p.name)}</strong>
            <button class="remove" onclick="removeFromCart('${p.id}')">حذف</button>
          </div>
          <div class="muted small">${formatPrice(p.price)}</div>
          <div class="qty">
            <button onclick="changeQty('${p.id}', 1)">＋</button>
            <span>${it.qty}</span>
            <button onclick="changeQty('${p.id}', -1)">－</button>
          </div>
        </div>
        <div class="muted small">${formatPrice(p.price * it.qty)}</div>
      </div>
    `;
  }).join('');
}

// فتح/إغلاق السلة
function openCart() {
  els.cartDrawer.classList.add('open');
  els.cartDrawer.setAttribute('aria-hidden', 'false');
  els.overlay.classList.add('show');
}
function closeCart() {
  els.cartDrawer.classList.remove('open');
  els.cartDrawer.setAttribute('aria-hidden', 'true');
  els.overlay.classList.remove('show');
}

// إتمام الطلب عبر واتساب بدون عمولات
function handleCheckout() {
  if (!STATE.cart.length) {
    alert('سلتك فارغة.');
    return;
  }
  els.checkoutDialog.showModal();
}
function cancelCheckout() {
  els.checkoutDialog.close();
}

// إنشاء نص الطلب
function buildOrderText() {
  const lines = [];
  lines.push('*طلب جديد من المتجر*');
  lines.push('');
  STATE.cart.forEach(it => {
    const p = STATE.products.find(x => x.id === it.id);
    if (p) lines.push(`• ${p.name} × ${it.qty} = ${formatPlain(p.price * it.qty)}`);
  });
  lines.push('');
  lines.push(`الإجمالي: ${formatPlain(cartTotal())}`);
  lines.push('');
  lines.push('*بيانات العميل*');
  lines.push(`الاسم: ${els.name.value}`);
  lines.push(`الهاتف: ${els.phone.value}`);
  lines.push(`العنوان: ${els.address.value}`);
  if (els.note.value.trim() !== '') lines.push(`ملاحظات: ${els.note.value.trim()}`);
  return encodeURIComponent(lines.join('\n'));
}
function formatPlain(num) {
  // رقم بسيط مع العملة المكتوبة
  const cur = (window.APP_CONFIG?.currency) || 'EGP';
  return Number(num).toFixed(2) + ' ' + cur;
}

// إرسال الطلب
function submitCheckout(e) {
  e.preventDefault();
  if (!STATE.whatsappNumber) {
    alert('يرجى ضبط رقم واتساب في config.js');
    return;
  }
  const text = buildOrderText();
  const phone = STATE.whatsappNumber.replace(/[^\d+]/g, '');
  const url = `https://api.whatsapp.com/send?phone=${phone}&text=${text}`;
  window.open(url, '_blank');
  els.checkoutDialog.close();
}

function initEvents() {
  // بحث
  els.search.addEventListener('input', (e) => { STATE.query = e.target.value; filterAndRender(); });
  // ترتيب
  els.sort.addEventListener('change', (e) => { STATE.sort = e.target.value; filterAndRender(); });
  // فئات
  els.categories.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cat]'); if (!b) return;
    els.categories.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    b.classList.add('active');
    STATE.category = b.dataset.cat; filterAndRender();
  });
  // السلة
  els.cartBtn.addEventListener('click', openCart);
  els.closeCart.addEventListener('click', closeCart);
  els.overlay.addEventListener('click', closeCart);
  // الدفع
  els.checkoutBtn.addEventListener('click', handleCheckout);
  els.cancelCheckout.addEventListener('click', cancelCheckout);
  els.checkoutForm.addEventListener('submit', submitCheckout);
}

applyConfig();
loadProducts();
initEvents();
updateCartUI();
