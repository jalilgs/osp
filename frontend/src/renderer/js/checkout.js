let allProducts = [];
let cart = [];
let categories = [];
let currentCategory = 'all';
let searchTimeout = null;

// ----- Load products & categories -----
async function loadData() {
  try {
    allProducts = await window.api.getProducts();
    // Build category list
    const catSet = new Set(allProducts.map(p => p.category?.name).filter(Boolean));
    categories = ['all', ...catSet];
    renderCategoryButtons();
    renderProducts(allProducts);
  } catch (err) {
    document.getElementById('productGrid').innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
  }
}

// ----- Category filters -----
function renderCategoryButtons() {
  const container = document.getElementById('categoryFilters');
  container.innerHTML = categories.map(cat => `
    <button class="cat-btn ${cat === currentCategory ? 'active' : ''}" data-cat="${cat}">
      ${cat === 'all' ? 'All' : cat}
    </button>
  `).join('');
  container.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.cat;
      renderCategoryButtons();
      applyFilters();
    });
  });
}

function applyFilters() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  let filtered = allProducts;
  if (currentCategory !== 'all') {
    filtered = filtered.filter(p => p.category?.name === currentCategory);
  }
  if (query) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.sku.toLowerCase().includes(query)
    );
  }
  renderProducts(filtered);
}

// ----- Product grid -----
function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';
  products.forEach(p => {
    const tile = document.createElement('div');
    tile.className = 'product-tile';
    tile.innerHTML = `
      <div>
        <div class="name">${p.name}</div>
        <div class="sku">${p.sku}</div>
        <div class="price">$${p.price}</div>
        <div class="stock-badge">Stock: ${p.stock_qty}</div>
      </div>
      <button class="add-btn" data-id="${p.id}">+ Add</button>
    `;
    const btn = tile.querySelector('.add-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      addToCart(p.id, 1);
    });
    // Clicking the tile also adds 1 (fast)
    tile.addEventListener('click', () => addToCart(p.id, 1));
    grid.appendChild(tile);
  });
}

// ----- Search with debounce -----
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(applyFilters, 200);
});
// Barcode scanner: if input is hidden, we can use the same field.
// For simplicity, we'll just use the search field as barcode input.
// When a barcode is scanned (usually ends with Enter), it triggers search.
// We'll also attempt to auto-add if the scanned text matches a product exactly.
document.getElementById('searchInput').addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const query = e.target.value.trim();
    // Try to find exact match by SKU or name
    const product = allProducts.find(p => p.sku === query || p.name.toLowerCase() === query.toLowerCase());
    if (product) {
      addToCart(product.id, 1);
      e.target.value = ''; // clear for next scan
    } else {
      applyFilters(); // fallback to search
    }
  }
});

// ----- Cart -----
function addToCart(productId, qty = 1) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  // If you want to ignore stock completely, comment out the next line.
  // if (product.stock_qty <= 0) { alert('Out of stock'); return; }
  const existing = cart.find(item => item.product.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ product, qty });
  }
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.product.id !== productId);
  renderCart();
}

function updateQty(productId, delta) {
  const item = cart.find(i => i.product.id === productId);
  if (!item) return;
  const newQty = item.qty + delta;
  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }
  // Optional stock check: if (newQty > item.product.stock_qty) alert(...) but we skip
  item.qty = newQty;
  renderCart();
}

function renderCart() {
  const list = document.getElementById('cartList');
  const totalSpan = document.getElementById('totalAmount');
  const countSpan = document.getElementById('itemCount');
  if (cart.length === 0) {
    list.innerHTML = '<li style="color:#888; text-align:center;">No items</li>';
    totalSpan.textContent = '$0.00';
    countSpan.textContent = '0';
    document.getElementById('checkoutBtn').disabled = true;
    return;
  }
  let html = '';
  let total = 0;
  let totalItems = 0;
  cart.forEach(item => {
    const subtotal = item.product.price * item.qty;
    total += subtotal;
    totalItems += item.qty;
    html += `
      <li class="cart-item">
        <div class="item-info">
          <span><strong>${item.product.name}</strong></span>
          <span>$${item.product.price}</span>
        </div>
        <div class="qty-ctrl">
          <button onclick="updateQty(${item.product.id}, -1)">−</button>
          <span style="min-width:30px; text-align:center;">${item.qty}</span>
          <button onclick="updateQty(${item.product.id}, 1)">+</button>
          <span style="margin:0 8px;">$${subtotal.toFixed(2)}</span>
          <button class="remove-btn" onclick="removeFromCart(${item.product.id})">✕</button>
        </div>
      </li>
    `;
  });
  list.innerHTML = html;
  totalSpan.textContent = `$${total.toFixed(2)}`;
  countSpan.textContent = totalItems;
  document.getElementById('checkoutBtn').disabled = false;
}
// Make functions globally accessible for inline onclick
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQty = updateQty;

// ----- Checkout -----
document.getElementById('checkoutBtn').addEventListener('click', async () => {
  if (cart.length === 0) return;
  const btn = document.getElementById('checkoutBtn');
  btn.disabled = true;
  btn.textContent = 'Processing...';
  const msg = document.getElementById('checkoutMessage');
  msg.style.color = '#007bff';
  msg.textContent = 'Submitting...';

  try {
    const cartItems = cart.map(item => ({
      product_id: item.product.id,
      qty: item.qty
    }));
    const saleResult = await window.api.checkout(cartItems);
    msg.style.color = '#28a745';
    msg.textContent = `✅ Sale #${saleResult.id} – $${saleResult.total}`;
    cart = [];
    renderCart();
    await loadData(); // refresh stock numbers (if you care)
  } catch (err) {
    msg.style.color = '#dc3545';
    msg.textContent = `❌ ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = '💳 Pay Now';
  }
});

// ----- Clear cart -----
document.getElementById('clearCartBtn').addEventListener('click', () => {
  if (cart.length === 0) return;
  if (confirm('Clear cart?')) {
    cart = [];
    renderCart();
    document.getElementById('checkoutMessage').textContent = '';
  }
});

// ----- Back to dashboard -----
document.getElementById('backBtn').addEventListener('click', () => {
  window.location.href = 'dashboard.html';
});

// ----- Init -----
window.addEventListener('DOMContentLoaded', loadData);
