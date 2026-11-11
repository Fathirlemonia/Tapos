const apiBase = 'http://localhost:3000/api';
const state = {
  token: localStorage.getItem('taposToken') || '',
  products: [],
  cart: [],
  role: localStorage.getItem('taposRole') || 'cashier'
};

const els = {
  productGrid: document.getElementById('productGrid'),
  cartList: document.getElementById('cartList'),
  subtotalValue: document.getElementById('subtotalValue'),
  totalValue: document.getElementById('totalValue'),
  discountInput: document.getElementById('discountInput'),
  paymentMethod: document.getElementById('paymentMethod'),
  authModal: document.getElementById('authModal'),
  loginForm: document.getElementById('loginForm'),
  usernameInput: document.getElementById('usernameInput'),
  passwordInput: document.getElementById('passwordInput'),
  roleInput: document.getElementById('roleInput'),
  toast: document.getElementById('toast'),
  connectionStatus: document.getElementById('connectionStatus'),
  syncState: document.getElementById('syncState')
};

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);
}

function getCartSubtotal() {
  return state.cart.reduce((sum, item) => sum + Number(item.price) * Number(item.qty), 0);
}

function renderCart() {
  if (!state.cart.length) {
    els.cartList.innerHTML = '<p class="muted">Keranjang masih kosong.</p>';
    els.subtotalValue.textContent = formatRupiah(0);
    els.totalValue.textContent = formatRupiah(0);
    return;
  }

  els.cartList.innerHTML = state.cart.map((item) => `
    <div class="cart-item">
      <div class="cart-item-details">
        <strong>${item.name}</strong>
        <small>${formatRupiah(item.price)} / pcs</small>
      </div>
      <div class="qty-control">
        <button data-action="decrease" data-id="${item.id}">-</button>
        <span>${item.qty}</span>
        <button data-action="increase" data-id="${item.id}">+</button>
      </div>
    </div>
  `).join('');

  const subtotal = getCartSubtotal();
  const discount = Number(els.discountInput.value || 0);
  const total = Math.max(subtotal - discount, 0);

  els.subtotalValue.textContent = formatRupiah(subtotal);
  els.totalValue.textContent = formatRupiah(total);

  els.cartList.querySelectorAll('button[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.id;
      const target = state.cart.find((item) => item.id === targetId);
      if (!target) return;

      if (button.dataset.action === 'increase') {
        target.qty += 1;
      } else if (target.qty > 1) {
        target.qty -= 1;
      } else {
        state.cart = state.cart.filter((item) => item.id !== targetId);
      }

      renderCart();
    });
  });
}

function renderProducts() {
  els.productGrid.innerHTML = state.products.map((product) => `
    <button class="product-item" data-product-id="${product.id}">
      <div class="product-meta">
        <span class="badge">${product.category}</span>
        <span>Stok ${product.stock}</span>
      </div>
      <strong>${product.name}</strong>
      <div class="product-meta">
        <span>${formatRupiah(product.price)}</span>
      </div>
    </button>
  `).join('');

  els.productGrid.querySelectorAll('.product-item').forEach((button) => {
    button.addEventListener('click', () => {
      const product = state.products.find((item) => item.id === button.dataset.productId);
      if (!product) return;

      const existing = state.cart.find((item) => item.id === product.id);
      if (existing) {
        existing.qty += 1;
      } else {
        state.cart.push({ ...product, qty: 1 });
      }

      renderCart();
    });
  });
}

async function fetchProducts() {
  try {
    const response = await fetch(`${apiBase}/products`);
    const data = await response.json();
    state.products = data.products.map((item) => ({ ...item, stock: item.stock ?? 10 }));
    renderProducts();
  } catch (error) {
    toast('Gagal mengambil data produk.');
  }
}

async function loginUser(event) {
  event.preventDefault();
  const username = els.usernameInput.value.trim();
  const password = els.passwordInput.value.trim();
  const role = els.roleInput.value;

  try {
    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login gagal');

    state.token = data.token;
    state.role = data.user.role;
    localStorage.setItem('taposToken', data.token);
    localStorage.setItem('taposRole', data.user.role);

    els.authModal.classList.remove('active');
    toast(`Selamat datang, ${data.user.name}.`);
    els.connectionStatus.textContent = navigator.onLine ? 'Online' : 'Offline';
    els.syncState.textContent = 'Sinkron';
    fetchProducts();
  } catch (error) {
    toast(error.message || 'Login gagal');
  }
}

async function checkout() {
  if (!state.token) {
    els.authModal.classList.add('active');
    return;
  }

  if (!state.cart.length) {
    toast('Keranjang masih kosong.');
    return;
  }

  const payload = {
    items: state.cart.map((item) => ({ id: item.id, name: item.name, price: item.price, qty: item.qty })),
    paymentMethod: els.paymentMethod.value,
    offline: !navigator.onLine,
    idempotencyKey: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`
  };

  try {
    const response = await fetch(`${apiBase}/cashier/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${state.token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Transaksi gagal');

    state.cart = [];
    renderCart();
    toast(data.message || 'Transaksi berhasil');
    els.syncState.textContent = payload.offline ? 'Pending sync' : 'Sinkron';
  } catch (error) {
    toast(error.message || 'Transaksi gagal');
  }
}

function logout() {
  state.token = '';
  localStorage.removeItem('taposToken');
  localStorage.removeItem('taposRole');
  els.authModal.classList.add('active');
  toast('Anda berhasil logout.');
}

window.addEventListener('online', () => {
  els.connectionStatus.textContent = 'Online';
  els.syncState.textContent = 'Sinkron';
});

window.addEventListener('offline', () => {
  els.connectionStatus.textContent = 'Offline';
  els.syncState.textContent = 'Pending sync';
});

els.loginForm.addEventListener('submit', loginUser);
els.discountInput.addEventListener('input', renderCart);
document.getElementById('checkoutBtn').addEventListener('click', checkout);
document.getElementById('clearCart').addEventListener('click', () => {
  state.cart = [];
  renderCart();
});
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('refreshProducts').addEventListener('click', fetchProducts);

if (!state.token) {
  els.authModal.classList.add('active');
} else {
  els.authModal.classList.remove('active');
  fetchProducts();
}

renderCart();
fetchProducts();
